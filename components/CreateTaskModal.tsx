import { systemLabel, translate as tr, useTranslation as useSystemTranslation } from '../i18n';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, Layers, User as UserIcon } from 'lucide-react-native';
import { TaskPriority, TaskStatus, Sprint, User } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface CreateTaskModalProps {
  visible: boolean;
  sprints?: Sprint[];
  members?: User[];
  defaultSprintId?: number | null;
  canAssignMember?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    sprintId?: number | null;
    ownerId?: number | null;
    dueDate?: string;
  }) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  sprints = [],
  members = [],
  defaultSprintId = null,
  canAssignMember = true,
  onClose,
  onSubmit,
}) => {
  const { colors, isDark } = useThemeStore();
  useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [sprintId, setSprintId] = useState<number | null>(defaultSprintId);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setSprintId(defaultSprintId ?? (sprints.find((s) => s.status === 'ACTIVE')?.id ?? null));
    }
  }, [visible, defaultSprintId, sprints]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề task");
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        sprintId,
        ownerId: ownerId || undefined,
        dueDate: dueDate.trim() ? `${dueDate.trim()}T23:59:59` : undefined,
      });
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setStatus('TODO');
      setOwnerId(null);
      setDueDate('');
      onClose();
    } catch (err: any) {
      setError("Không thể tạo task mới.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{tr("Tạo Công Việc Mới")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{tr(error)}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>{tr("TIÊU ĐỀ TASK *")}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr("Nhập tên nhiệm vụ...")}
                placeholderTextColor={colors.mutedText}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{tr("MÔ TẢ CHI TIẾT")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={tr("Nội dung thực hiện...")}
                placeholderTextColor={colors.mutedText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Sprint selector if sprints exist */}
            {sprints.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>{tr("THUỘC GIAI ĐOẠN (SPRINT)")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.optionRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      sprintId === null && styles.optionChipActive,
                    ]}
                    onPress={() => setSprintId(null)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        sprintId === null && styles.optionChipTextActive,
                      ]}
                    >
                      {tr("Backlog")}
                    </Text>
                  </TouchableOpacity>
                  {sprints.map((sp) => (
                    <TouchableOpacity
                      key={sp.id}
                      style={[
                        styles.optionChip,
                        sprintId === sp.id && styles.optionChipActive,
                      ]}
                      onPress={() => setSprintId(sp.id)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          sprintId === sp.id && styles.optionChipTextActive,
                        ]}
                      >
                        {sp.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Assignee selector if members exist */}
            {canAssignMember && members.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>{tr("GIAO CHO THÀNH VIÊN")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.optionRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      ownerId === null && styles.optionChipActive,
                    ]}
                    onPress={() => setOwnerId(null)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        ownerId === null && styles.optionChipTextActive,
                      ]}
                    >
                      {tr("Chưa giao")}
                    </Text>
                  </TouchableOpacity>
                  {members.map((m) => {
                    const mName = m.fullName || m.displayName || m.username;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.optionChip,
                          ownerId === m.id && styles.optionChipActive,
                        ]}
                        onPress={() => setOwnerId(m.id)}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            ownerId === m.id && styles.optionChipTextActive,
                          ]}
                        >
                          {mName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Priority selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{tr("ĐỘ ƯU TIÊN")}</Text>
              <View style={styles.optionRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((p) => (
                  <TouchableOpacity
                    key={systemLabel(p)}
                    style={[
                      styles.optionChip,
                      priority === p && styles.optionChipActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        priority === p && styles.optionChipTextActive,
                      ]}
                    >
                      {systemLabel(p)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{tr("TRẠNG THÁI BAN ĐẦU")}</Text>
              <View style={styles.optionRow}>
                {(['TODO', 'IN_PROGRESS', 'IN_REVIEW'] as TaskStatus[]).map((s) => (
                  <TouchableOpacity
                    key={systemLabel(s)}
                    style={[
                      styles.optionChip,
                      status === s && styles.optionChipActive,
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        status === s && styles.optionChipTextActive,
                      ]}
                    >
                      {systemLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{tr("HẠN HOÀN THÀNH (YYYY-MM-DD)")}</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-08-30"
                placeholderTextColor={colors.mutedText}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>{tr("HỦY")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>{tr("TẠO TASK")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    closeBtn: {
      padding: 4,
    },
    errorBox: {
      backgroundColor: colors.dangerBg,
      borderColor: isDark ? '#5A1E24' : '#FCA5A5',
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
    errorText: {
      color: colors.dangerText,
      fontSize: 12,
      fontWeight: '600',
    },
    formGroup: {
      marginBottom: 12,
    },
    label: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.subText,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.text,
    },
    textArea: {
      minHeight: 70,
    },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    optionChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    optionChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.subText,
    },
    optionChipTextActive: {
      color: '#FFFFFF',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.subText,
    },
    submitBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
