import { systemLabel, translate as tr } from '../i18n';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react-native';
import { Task, TaskStatus } from '../types';
import { useThemeStore } from '../stores/useThemeStore';
import { normalizeTaskStatus } from '../utils/taskRules';

interface StatusConfirmModalProps {
  visible: boolean;
  task: Task | null;
  targetStatus: TaskStatus | null;
  isRevertWithReason?: boolean;
  customTitle?: string;
  customMessage?: string;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

export const StatusConfirmModal: React.FC<StatusConfirmModalProps> = ({
  visible,
  task,
  targetStatus,
  isRevertWithReason = false,
  customTitle,
  customMessage,
  onClose,
  onConfirm,
}) => {
  const { colors, isDark } = useThemeStore();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
      setSubmitting(false);
    }
  }, [visible, task?.id, targetStatus]);

  if (!task || !targetStatus) return null;

  const fromNorm = normalizeTaskStatus(task.status);
  const toNorm = normalizeTaskStatus(targetStatus);

  const getStatusBadgeColor = (st: string) => {
    switch (st) {
      case 'DONE':
        return { bg: isDark ? '#0D3823' : '#E3FCEF', text: isDark ? '#57D9A3' : '#006644' };
      case 'IN_REVIEW':
        return { bg: isDark ? '#3B2314' : '#FEF3C7', text: '#F59E0B' };
      case 'IN_PROGRESS':
        return { bg: isDark ? '#1D3B6A' : '#DEEBFF', text: isDark ? '#579DFF' : '#0052CC' };
      default:
        return { bg: isDark ? '#22272B' : '#F4F5F7', text: colors.subText };
    }
  };

  const fromColor = getStatusBadgeColor(fromNorm);
  const toColor = getStatusBadgeColor(toNorm);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await onConfirm(reason.trim() || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.box,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isRevertWithReason
                      ? isDark
                        ? '#3B2314'
                        : '#FEF3C7'
                      : isDark
                      ? '#1D3B6A'
                      : '#DEEBFF',
                  },
                ]}
              >
                {isRevertWithReason ? (
                  <RotateCcw size={18} color="#F59E0B" />
                ) : (
                  <CheckCircle2
                    size={18}
                    color={isDark ? '#579DFF' : '#0052CC'}
                  />
                )}
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {customTitle ||
                  (isRevertWithReason
                    ? tr("Yêu cầu chỉnh sửa công việc")
                    : tr("Xác nhận chuyển trạng thái"))}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {/* Task Summary Box */}
          <View
            style={[
              styles.taskBox,
              {
                backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.taskMetaRow}>
              <Text style={[styles.taskCode, { color: colors.primary }]}>
                TASK-{task.id}
              </Text>
              {!!task.sprintName && (
                <Text style={[styles.sprintTag, { color: colors.subText }]}>
                  • {task.sprintName}
                </Text>
              )}
            </View>
            <Text
              style={[styles.taskTitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>

          {/* Visual Status Transition */}
          <View style={styles.transitionRow}>
            <View style={[styles.statusPill, { backgroundColor: fromColor.bg }]}>
              <Text style={[styles.statusPillText, { color: fromColor.text }]}>
                {systemLabel(fromNorm)}
              </Text>
            </View>

            <ArrowRight size={18} color={colors.subText} />

            <View style={[styles.statusPill, { backgroundColor: toColor.bg }]}>
              <Text style={[styles.statusPillText, { color: toColor.text }]}>
                {systemLabel(toNorm)}
              </Text>
            </View>
          </View>

          <Text style={[styles.descText, { color: colors.subText }]}>
            {customMessage ||
              (isRevertWithReason
                ? tr("Công việc sẽ được trả về trạng thái Đang làm để thành viên phụ trách cập nhật lại.")
                : tr("Bạn có chắc chắn muốn cập nhật trạng thái công việc này không?"))}
          </Text>

          {isRevertWithReason && (
            <View style={styles.reasonGroup}>
              <Text style={[styles.reasonLabel, { color: colors.text }]}>
                {tr("Ghi chú / Lý do cần chỉnh sửa:")}
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder={tr("Nhập nội dung cần thành viên bổ sung hoặc sửa lại...")}
                placeholderTextColor={colors.mutedText}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                {tr("Hủy")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: isRevertWithReason
                    ? '#F59E0B'
                    : toNorm === 'DONE'
                    ? '#10B981'
                    : colors.primary,
                },
              ]}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={15} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>
                    {isRevertWithReason
                      ? tr("Xác nhận trả việc")
                      : tr("Xác nhận chuyển")}
                  </Text>
                </>
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
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  taskBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  taskCode: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  sprintTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
    paddingVertical: 6,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  reasonGroup: {
    marginBottom: 16,
    gap: 6,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    minHeight: 74,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
