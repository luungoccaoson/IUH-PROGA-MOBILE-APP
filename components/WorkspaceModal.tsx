import { translate as tr, useTranslation as useSystemTranslation } from '../i18n';
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { Workspace } from '../types';
import { useThemeStore } from '../stores/useThemeStore';

interface WorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  workspaceToEdit?: Workspace | null;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  visible,
  onClose,
  onSubmit,
  workspaceToEdit,
}) => {
  const { colors, isDark } = useThemeStore();
  useSystemTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (workspaceToEdit) {
      setName(workspaceToEdit.name);
      setDescription(workspaceToEdit.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [workspaceToEdit, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên Workspace");
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit(name.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError("Không thể lưu Workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {workspaceToEdit ? tr("Chỉnh sửa Workspace") : tr("Tạo Workspace Mới")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerBg, borderColor: colors.dangerText }]}>
              <Text style={[styles.errorText, { color: colors.dangerText }]}>{tr(error)}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.subText }]}>{tr("TÊN WORKSPACE")}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder={tr("Ví dụ: Dự án tốt nghiệp")}
              placeholderTextColor={colors.mutedText}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.subText }]}>{tr("MÔ TẢ CHI TIẾT")}</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder={tr("Ví dụ: KLTN hệ thống tích hợp AI agents...")}
              placeholderTextColor={colors.mutedText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.cardInner,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: colors.subText }]}>{tr("HỦY")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {workspaceToEdit ? tr("CẬP NHẬT") : tr("TẠO MỚI")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#F6F5EF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    backgroundColor: '#FDEDEC',
    borderColor: '#FADBD8',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#D93025',
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#111827',
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
