import { translate as tr, useTranslation as useSystemTranslation } from '../i18n';
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { Space } from '../types';
import { useThemeStore } from '../stores/useThemeStore';

interface SpaceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, startDate?: string, endDate?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  spaceToEdit?: Space | null;
}

export const SpaceModal: React.FC<SpaceModalProps> = ({
  visible,
  onClose,
  onSubmit,
  onDelete,
  spaceToEdit,
}) => {
  const { colors, isDark } = useThemeStore();
  useSystemTranslation();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (spaceToEdit) {
      setName(spaceToEdit.name);
      setStartDate(spaceToEdit.startDate ? spaceToEdit.startDate.substring(0, 10) : '');
      setEndDate(spaceToEdit.endDate ? spaceToEdit.endDate.substring(0, 10) : '');
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
    }
    setError('');
  }, [spaceToEdit, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên Space");
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit(name.trim(), startDate ? `${startDate}T00:00:00` : undefined, endDate ? `${endDate}T23:59:59` : undefined);
      onClose();
    } catch (err: any) {
      setError("Không thể lưu Space.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setLoading(true);
      setError('');
      await onDelete();
      onClose();
    } catch (err: any) {
      setError("Không thể xóa Space.");
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
              {spaceToEdit ? tr("Cài đặt Space") : tr("Tạo Space Mới")}
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
            <Text style={[styles.label, { color: colors.subText }]}>{tr("TÊN SPACE")}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder={tr("Ví dụ: Phòng HR")}
              placeholderTextColor={colors.mutedText}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.subText }]}>{tr("NGÀY BẮT ĐẦU (YYYY-MM-DD)")}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="2026-08-01"
                placeholderTextColor={colors.mutedText}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.subText }]}>{tr("NGÀY KẾT THÚC (YYYY-MM-DD)")}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="2026-08-15"
                placeholderTextColor={colors.mutedText}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          {spaceToEdit && onDelete && (
            <View style={[styles.dangerZone, { borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  {
                    backgroundColor: colors.dangerBg,
                    borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                  },
                ]}
                onPress={handleDelete}
                disabled={loading}
              >
                <Trash2 size={16} color={colors.dangerText} />
                <Text style={[styles.deleteText, { color: colors.dangerText }]}>{tr("XÓA SPACE NÀY")}</Text>
              </TouchableOpacity>
            </View>
          )}

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
                  {spaceToEdit ? tr("LƯU THAY ĐỔI") : tr("TẠO MỚI")}
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 9,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  dangerZone: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FADBD8',
    backgroundColor: '#FDEDEC',
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D93025',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
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
