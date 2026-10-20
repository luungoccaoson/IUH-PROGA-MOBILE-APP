import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Sparkles, Send, Bot, User, PlusCircle } from 'lucide-react-native';
import { AgentType, ChatMessage, DeconstructedTaskItem } from '../types';
import { workspaceService } from '../services/workspace.service';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface AIChatViewProps {
  spaceId?: number;
  onTasksCreated?: () => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  spaceId,
  onTasksCreated,
}) => {
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [selectedAgent, setSelectedAgent] = useState<AgentType>('REQUIREMENT');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      threadId: 1,
      senderType: 'ASSISTANT',
      messageContent:
        'Xin chào! Tôi là Requirement Agent. Hãy mô tả tính năng bạn cần xây dựng, tôi sẽ tự động phân rã thành các công việc nhỏ cho Space của bạn.',
      jsonPayload: JSON.stringify([
        {
          title: 'Tích hợp Đăng nhập JWT & Storage',
          description: 'Bảo mật dữ liệu user',
          priority: 'URGENT',
        },
        {
          title: 'Dựng bảng Kanban 3 cột',
          description: 'Hỗ trợ chuyển trạng thái task',
          priority: 'HIGH',
        },
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
      Alert.alert('Thông báo', 'Vui lòng mở một Space cụ thể trước khi thêm các Task này.');
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
      Alert.alert('Thành công', `Đã thêm thành công ${items.length} công việc vào Space!`);
      if (onTasksCreated) onTasksCreated();
    } catch (err) {
      console.error('Error batch creating tasks:', err);
      Alert.alert('Lỗi', 'Không thể tự động tạo công việc. Vui lòng kiểm tra lại.');
    } finally {
      setCreatingTasks(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Agent Selector Header */}
      <View style={styles.agentBar}>
        <Text style={styles.agentLabel}>CHỌN AI AGENT:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.agentList}
        >
          <TouchableOpacity
            style={[
              styles.agentChip,
              selectedAgent === 'REQUIREMENT' && styles.agentChipActive,
            ]}
            onPress={() => setSelectedAgent('REQUIREMENT')}
          >
            <Sparkles
              size={12}
              color={selectedAgent === 'REQUIREMENT' ? '#FFFFFF' : '#36B37E'}
            />
            <Text
              style={[
                styles.agentChipText,
                selectedAgent === 'REQUIREMENT' && styles.agentChipTextActive,
              ]}
            >
              Requirement Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.agentChip,
              selectedAgent === 'PM' && styles.agentChipActive,
            ]}
            onPress={() => setSelectedAgent('PM')}
          >
            <Sparkles
              size={12}
              color={selectedAgent === 'PM' ? '#FFFFFF' : '#579DFF'}
            />
            <Text
              style={[
                styles.agentChipText,
                selectedAgent === 'PM' && styles.agentChipTextActive,
              ]}
            >
              PM Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.agentChip,
              selectedAgent === 'TECHNICAL_ADVISOR' && styles.agentChipActive,
            ]}
            onPress={() => setSelectedAgent('TECHNICAL_ADVISOR')}
          >
            <Sparkles
              size={12}
              color={selectedAgent === 'TECHNICAL_ADVISOR' ? '#FFFFFF' : '#FFAB00'}
            />
            <Text
              style={[
                styles.agentChipText,
                selectedAgent === 'TECHNICAL_ADVISOR' && styles.agentChipTextActive,
              ]}
            >
              Tech Advisor Agent
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        style={styles.messageContainer}
        contentContainerStyle={styles.messageContent}
      >
        {messages.map((msg) => {
          const isUser = msg.senderType === 'USER';
          let parsedTasks: DeconstructedTaskItem[] = [];
          if (msg.jsonPayload) {
            try {
              parsedTasks = JSON.parse(msg.jsonPayload);
            } catch (e) {}
          }

          return (
            <View
              key={msg.id}
              style={[
                styles.msgRow,
                isUser ? styles.msgUserRow : styles.msgAssistantRow,
              ]}
            >
              {!isUser && (
                <View style={styles.avatarBot}>
                  <Bot size={14} color="#36B37E" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                ]}
              >
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
                          <Text style={styles.addTasksText}>ĐỒNG Ý TẠO CÁC TASK NÀY</Text>
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
              <Bot size={14} color="#36B37E" />
            </View>
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                { flexDirection: 'row', gap: 6, alignItems: 'center' },
              ]}
            >
              <ActivityIndicator color={colors.primary} size="small" />
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
          placeholderTextColor={colors.mutedText}
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

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    agentBar: {
      padding: 12,
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    agentLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.subText,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    agentList: {
      flexDirection: 'row',
      gap: 8,
    },
    agentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    agentChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    agentChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.subText,
    },
    agentChipTextActive: {
      color: '#FFFFFF',
    },
    messageContainer: {
      flex: 1,
      padding: 12,
    },
    messageContent: {
      paddingBottom: 16,
    },
    msgRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 12,
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
      backgroundColor: isDark ? '#1C3829' : '#E3FCEF',
      borderWidth: 1,
      borderColor: isDark ? '#216E4E' : '#ABF5D1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarUser: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubble: {
      maxWidth: '82%',
      padding: 12,
      borderRadius: 16,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomLeftRadius: 4,
    },
    msgText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    userMsgText: {
      color: '#FFFFFF',
    },
    taskPreviewCard: {
      marginTop: 10,
      padding: 10,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    previewTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: '#36B37E',
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
      color: colors.mutedText,
    },
    previewItemTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    previewItemDesc: {
      fontSize: 10,
      color: colors.subText,
    },
    addTasksBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
      paddingVertical: 8,
      backgroundColor: '#36B37E',
      borderRadius: 8,
    },
    addTasksText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.headerBg,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
  });
