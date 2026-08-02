import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Sparkles, Send, Bot, User, PlusCircle } from 'lucide-react-native';
import { AgentType, ChatMessage, DeconstructedTaskItem } from '../types';
import { workspaceService } from '../services/workspace.service';

interface AIChatViewProps {
  spaceId?: number;
  onTasksCreated?: () => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  spaceId,
  onTasksCreated,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('REQUIREMENT');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      threadId: 1,
      senderType: 'ASSISTANT',
      messageContent: 'Xin chào! Tôi là Requirement Agent. Hãy mô tả tính năng bạn cần xây dựng, tôi sẽ tự động phân rã thành các công việc nhỏ cho Space của bạn.',
      jsonPayload: JSON.stringify([
        { title: 'Tích hợp Đăng nhập JWT & Storage', description: 'Bảo mật dữ liệu user', priority: 'URGENT' },
        { title: 'Dựng bảng Kanban 4 cột', description: 'Hỗ trợ chuyển trạng thái task', priority: 'HIGH' },
      ]),
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      threadId: 1,
      senderType: 'USER',
      messageContent: inputPrompt.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const promptToSend = inputPrompt.trim();
    setInputPrompt('');
    setLoading(true);

    try {
      const response = await workspaceService.sendAgentMessage({
        agentType: selectedAgent,
        prompt: promptToSend,
        spaceId,
      });

      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error('AI error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCreateTasks = async (jsonPayloadStr: string) => {
    if (!spaceId) {
      alert('Vui lòng mở một Space cụ thể trước khi thêm các Task này.');
      return;
    }

    try {
      setCreatingTasks(true);
      const items: DeconstructedTaskItem[] = JSON.parse(jsonPayloadStr);
      for (const item of items) {
        await workspaceService.createTask({
          spaceId,
          title: item.title,
          description: item.description,
          priority: item.priority || 'MEDIUM',
          status: 'TODO',
        });
      }
      alert(`Đã thêm thành công ${items.length} công việc vào Space!`);
      if (onTasksCreated) onTasksCreated();
    } catch (err) {
      console.error('Error batch creating tasks:', err);
      alert('Không thể tự động tạo công việc. Vui lòng kiểm tra lại.');
    } finally {
      setCreatingTasks(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Agent Selector Header */}
      <View style={styles.agentBar}>
        <Text style={styles.agentLabel}>CHỌN AI AGENT:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentList}>
          <TouchableOpacity
            style={[styles.agentChip, selectedAgent === 'REQUIREMENT' && styles.agentChipActive]}
            onPress={() => setSelectedAgent('REQUIREMENT')}
          >
            <Sparkles size={12} color={selectedAgent === 'REQUIREMENT' ? '#FFFFFF' : '#137333'} />
            <Text style={[styles.agentChipText, selectedAgent === 'REQUIREMENT' && styles.agentChipTextActive]}>
              Requirement Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.agentChip, selectedAgent === 'PM' && styles.agentChipActive]}
            onPress={() => setSelectedAgent('PM')}
          >
            <Sparkles size={12} color={selectedAgent === 'PM' ? '#FFFFFF' : '#1A73E8'} />
            <Text style={[styles.agentChipText, selectedAgent === 'PM' && styles.agentChipTextActive]}>
              PM Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.agentChip, selectedAgent === 'TECHNICAL_ADVISOR' && styles.agentChipActive]}
            onPress={() => setSelectedAgent('TECHNICAL_ADVISOR')}
          >
            <Sparkles size={12} color={selectedAgent === 'TECHNICAL_ADVISOR' ? '#FFFFFF' : '#B06000'} />
            <Text style={[styles.agentChipText, selectedAgent === 'TECHNICAL_ADVISOR' && styles.agentChipTextActive]}>
              Tech Advisor Agent
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView style={styles.messageContainer} contentContainerStyle={styles.messageContent}>
        {messages.map((msg) => {
          const isUser = msg.senderType === 'USER';
          let parsedTasks: DeconstructedTaskItem[] = [];
          if (msg.jsonPayload) {
            try {
              parsedTasks = JSON.parse(msg.jsonPayload);
            } catch (e) {}
          }

          return (
            <View key={msg.id} style={[styles.msgRow, isUser ? styles.msgUserRow : styles.msgAssistantRow]}>
              {!isUser && (
                <View style={styles.avatarBot}>
                  <Bot size={14} color="#137333" />
                </View>
              )}

              <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.msgText, isUser && styles.userMsgText]}>
                  {msg.messageContent}
                </Text>

                {/* Render Task Deconstruction Preview Card if present */}
                {parsedTasks.length > 0 && (
                  <View style={styles.taskPreviewCard}>
                    <Text style={styles.previewTitle}>🎯 DANH SÁCH TASK GỢI Ý BỞI AI:</Text>
                    {parsedTasks.map((t, i) => (
                      <View key={i} style={styles.previewItem}>
                        <Text style={styles.previewItemNumber}>{i + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.previewItemTitle}>{t.title}</Text>
                          {!!t.description && (
                            <Text style={styles.previewItemDesc}>{t.description}</Text>
                          )}
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.addTasksBtn}
                      onPress={() => handleBatchCreateTasks(msg.jsonPayload!)}
                      disabled={creatingTasks}
                    >
                      {creatingTasks ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <PlusCircle size={14} color="#FFFFFF" />
                          <Text style={styles.addTasksText}>ĐỒNG Ý TẠO CÁC TASK NÀY VÀO SPACE</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isUser && (
                <View style={styles.avatarUser}>
                  <User size={14} color="#FFFFFF" />
                </View>
              )}
            </View>
          );
        })}

        {loading && (
          <View style={styles.msgAssistantRow}>
            <View style={styles.avatarBot}>
              <Bot size={14} color="#137333" />
            </View>
            <View style={[styles.bubble, styles.assistantBubble, { flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
              <ActivityIndicator color="#111827" size="small" />
              <Text style={styles.msgText}>AI đang phân tích yêu cầu...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={`Nhập yêu cầu cho ${selectedAgent}...`}
          placeholderTextColor="#9CA3AF"
          value={inputPrompt}
          onChangeText={setInputPrompt}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputPrompt.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!inputPrompt.trim() || loading}
        >
          <Send size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  agentBar: {
    padding: 12,
    backgroundColor: '#F6F5EF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  agentLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  agentList: {
    gap: 8,
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agentChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  agentChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  agentChipTextActive: {
    color: '#FFFFFF',
  },
  messageContainer: {
    flex: 1,
    padding: 14,
  },
  messageContent: {
    gap: 12,
    paddingBottom: 10,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  msgUserRow: {
    justifyContent: 'flex-end',
  },
  msgAssistantRow: {
    justifyContent: 'flex-start',
  },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#D1E7DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#111827',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F6F5EF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  userMsgText: {
    color: '#FFFFFF',
  },
  taskPreviewCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#137333',
    marginBottom: 8,
  },
  previewItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  previewItemNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  previewItemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  previewItemDesc: {
    fontSize: 10,
    color: '#6B7280',
  },
  addTasksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#137333',
    borderRadius: 8,
  },
  addTasksText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F6F5EF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
