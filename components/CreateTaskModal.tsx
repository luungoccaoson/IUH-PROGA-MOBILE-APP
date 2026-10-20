import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { TaskPriority, TaskStatus } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: string;
  }) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề task');
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
        dueDate: dueDate.trim() ? `${dueDate.trim()}T23:59:59` : undefined,
      });
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setStatus('TODO');
      setDueDate('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo task mới.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Tạo Công Việc Mới</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>TIÊU ĐỀ TASK *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên nhiệm vụ..."
              placeholderTextColor={colors.mutedText}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>MÔ TẢ CHI TIẾT</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nội dung thực hiện..."
              placeholderTextColor={colors.mutedText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Priority selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>ĐỘ ƯU TIÊN</Text>
            <View style={styles.optionRow}>
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
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
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>TRẠNG THÁI BAN ĐẦU</Text>
            <View style={styles.optionRow}>
              {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
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
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>HẠN HOÀN THÀNH (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-08-30"
              placeholderTextColor={colors.mutedText}
              value={dueDate}
              onChangeText={setDueDate}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>HỦY</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>TẠO TASK</Text>
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
