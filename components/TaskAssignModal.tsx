import { systemLabel, translate as tr } from '../i18n';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Sparkles,
  Users,
  X,
  Check,
  UserCheck,
  Layers,
  CheckCircle2,
} from 'lucide-react-native';
import { Task, Sprint, User } from '../types';
import { useThemeStore } from '../stores/useThemeStore';
import {
  autoAssignTasks,
  normalizeTaskStatus,
} from '../utils/taskRules';

interface TaskAssignModalProps {
  visible: boolean;
  tasks: Task[];
  sprints: Sprint[];
  members: User[];
  onClose: () => void;
  onAssignBatch: (
    assignments: { taskId: number; ownerId: number }[]
  ) => Promise<void>;
  onAssignSingle: (taskId: number, ownerId: number | null) => Promise<void>;
}

export const TaskAssignModal: React.FC<TaskAssignModalProps> = ({
  visible,
  tasks,
  sprints,
  members,
  onClose,
  onAssignBatch,
  onAssignSingle,
}) => {
  const { colors, isDark } = useThemeStore();

  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null | 'ALL'>('ALL');
  const [manualOverrides, setManualOverrides] = useState<Record<number, number>>({});
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setManualOverrides({});
      setEditingTaskId(null);
      setSubmitting(false);
    }
  }, [visible, unassignedOnly, selectedSprintId]);

  const autoSummary = useMemo(() => {
    return autoAssignTasks(tasks, members, {
      unassignedOnly,
      sprintId: selectedSprintId,
    });
  }, [tasks, members, unassignedOnly, selectedSprintId]);

  const effectivePreview = useMemo(() => {
    return autoSummary.preview.map((item) => {
      const overrideId = manualOverrides[item.taskId];
      if (overrideId) {
        const found = members.find((m) => m.id === overrideId);
        if (found) {
          return {
            ...item,
            assignedMember: found,
            isManualOverride: true,
          };
        }
      }
      return { ...item, isManualOverride: false };
    });
  }, [autoSummary.preview, manualOverrides, members]);

  const filteredManualTasks = useMemo(() => {
    let list = tasks.filter((t) => !t.isDeleted);
    if (selectedSprintId !== 'ALL') {
      if (selectedSprintId === null) {
        list = list.filter((t) => !t.sprintId);
      } else {
        list = list.filter((t) => t.sprintId === selectedSprintId);
      }
    }
    if (unassignedOnly) {
      list = list.filter((t) => !t.ownerId && !t.assignee?.id);
    }
    return list;
  }, [tasks, selectedSprintId, unassignedOnly]);

  const getInitials = (name?: string) => {
    const clean = (name || 'U').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const handleApplyAutoAssign = async () => {
    if (effectivePreview.length === 0) return;
    try {
      setSubmitting(true);
      const assignments = effectivePreview.map((item) => ({
        taskId: item.taskId,
        ownerId: item.assignedMember.id,
      }));
      await onAssignBatch(assignments);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualPick = async (taskId: number, ownerId: number | null) => {
    try {
      setLoadingTaskId(taskId);
      await onAssignSingle(taskId, ownerId);
    } finally {
      setLoadingTaskId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.bg, borderColor: colors.cardBorder },
          ]}
        >
          {/* Top Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.cardBg,
                borderBottomColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.headerTitleWrap}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
                ]}
              >
                <Sparkles size={18} color={isDark ? '#579DFF' : '#0052CC'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {tr("Phân chia công việc")}
                </Text>
                <Text style={[styles.headerSub, { color: colors.subText }]}>
                  {tr("Phân công tự động theo chuyên môn hoặc gán thủ công")}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {/* Mode Tabs: Tự động vs Thủ công */}
          <View
            style={[
              styles.modeTabs,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'AUTO' && {
                  backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
                },
              ]}
              onPress={() => setMode('AUTO')}
              activeOpacity={0.8}
            >
              <Sparkles
                size={15}
                color={
                  mode === 'AUTO'
                    ? isDark
                      ? '#579DFF'
                      : '#0052CC'
                    : colors.subText
                }
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color:
                      mode === 'AUTO'
                        ? isDark
                          ? '#579DFF'
                          : '#0052CC'
                        : colors.subText,
                  },
                ]}
              >
                {tr("Tự động (AI Cân bằng)")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'MANUAL' && {
                  backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
                },
              ]}
              onPress={() => setMode('MANUAL')}
              activeOpacity={0.8}
            >
              <UserCheck
                size={15}
                color={
                  mode === 'MANUAL'
                    ? isDark
                      ? '#579DFF'
                      : '#0052CC'
                    : colors.subText
                }
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color:
                      mode === 'MANUAL'
                        ? isDark
                          ? '#579DFF'
                          : '#0052CC'
                        : colors.subText,
                  },
                ]}
              >
                {tr("Thủ công (Gán trực tiếp)")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Bar: Scope & Sprint */}
          <View style={styles.filtersSection}>
            <View style={styles.scopeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.scopePill,
                  {
                    backgroundColor: unassignedOnly
                      ? colors.primary
                      : colors.cardBg,
                    borderColor: unassignedOnly
                      ? colors.primary
                      : colors.cardBorder,
                  },
                ]}
                onPress={() => setUnassignedOnly(true)}
              >
                <Text
                  style={[
                    styles.scopePillText,
                    { color: unassignedOnly ? '#FFFFFF' : colors.subText },
                  ]}
                >
                  {tr("Chỉ việc chưa giao")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopePill,
                  {
                    backgroundColor: !unassignedOnly
                      ? colors.primary
                      : colors.cardBg,
                    borderColor: !unassignedOnly
                      ? colors.primary
                      : colors.cardBorder,
                  },
                ]}
                onPress={() => setUnassignedOnly(false)}
              >
                <Text
                  style={[
                    styles.scopePillText,
                    { color: !unassignedOnly ? '#FFFFFF' : colors.subText },
                  ]}
                >
                  {tr("Tất cả việc chưa xong")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sprint Horizontal Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sprintPillsRow}
            >
              <TouchableOpacity
                style={[
                  styles.sprintChip,
                  {
                    backgroundColor:
                      selectedSprintId === 'ALL'
                        ? isDark
                          ? '#1D3B6A'
                          : '#DEEBFF'
                        : colors.cardBg,
                    borderColor:
                      selectedSprintId === 'ALL'
                        ? colors.primary
                        : colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedSprintId('ALL')}
              >
                <Layers size={12} color={colors.primary} />
                <Text style={[styles.sprintChipText, { color: colors.text }]}>
                  {tr("Tất cả Sprint")}
                </Text>
              </TouchableOpacity>

              {sprints.map((sp) => (
                <TouchableOpacity
                  key={sp.id}
                  style={[
                    styles.sprintChip,
                    {
                      backgroundColor:
                        selectedSprintId === sp.id
                          ? isDark
                            ? '#1D3B6A'
                            : '#DEEBFF'
                          : colors.cardBg,
                      borderColor:
                        selectedSprintId === sp.id
                          ? colors.primary
                          : colors.cardBorder,
                    },
                  ]}
                  onPress={() => setSelectedSprintId(sp.id)}
                >
                  <Text style={[styles.sprintChipText, { color: colors.text }]}>
                    {sp.name}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.sprintChip,
                  {
                    backgroundColor:
                      selectedSprintId === null
                        ? isDark
                          ? '#1D3B6A'
                          : '#DEEBFF'
                        : colors.cardBg,
                    borderColor:
                      selectedSprintId === null
                        ? colors.primary
                        : colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedSprintId(null)}
              >
                <Text style={[styles.sprintChipText, { color: colors.text }]}>
                  {tr("Backlog")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Content Body */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {mode === 'AUTO' ? (
              <>
                {/* Member Workload Overview */}
                <Text style={[styles.sectionTitle, { color: colors.subText }]}>
                  {tr("PHÂN BỔ TẢI THÀNH VIÊN (")}{members.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.memberLoadScroll}
                >
                  {autoSummary.memberStats.map((ms) => {
                    const mName =
                      ms.member.fullName ||
                      ms.member.displayName ||
                      ms.member.username;
                    const newCount = effectivePreview.filter(
                      (p) => p.assignedMember.id === ms.member.id
                    ).length;
                    return (
                      <View
                        key={ms.member.id}
                        style={[
                          styles.memberLoadCard,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.memberLoadTop}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {getInitials(mName)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.memberName, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {mName}
                            </Text>
                            <Text
                              style={[
                                styles.memberRole,
                                { color: colors.subText },
                              ]}
                              numberOfLines={1}
                            >
                              {ms.member.jobTitle || tr("Thành viên")}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.memberLoadCounters}>
                          <Text style={{ fontSize: 11, color: colors.subText }}>
                            {tr("Đang giữ:")} {ms.existingOpenCount}
                          </Text>
                          <View
                            style={[
                              styles.plusBadge,
                              {
                                backgroundColor:
                                  newCount > 0
                                    ? isDark
                                      ? '#0D3823'
                                      : '#E3FCEF'
                                    : isDark
                                    ? '#22272B'
                                    : '#F4F5F7',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color:
                                  newCount > 0
                                    ? isDark
                                      ? '#57D9A3'
                                      : '#006644'
                                    : colors.subText,
                              }}
                            >
                              +{newCount} {tr("mới")}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Proposed Assignments List */}
                <Text style={[styles.sectionTitle, { color: colors.subText }]}>
                  {tr("ĐỀ XUẤT PHÂN CÔNG (")}{effectivePreview.length})
                </Text>

                {effectivePreview.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <CheckCircle2 size={32} color="#10B981" />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {tr("Không có công việc cần phân công")}
                    </Text>
                    <Text style={[styles.emptySub, { color: colors.subText }]}>
                      {tr("Tất cả công việc trong phạm vi đã chọn đều đã có người phụ trách.")}
                    </Text>
                  </View>
                ) : (
                  effectivePreview.map((item) => {
                    const assigneeName =
                      item.assignedMember.fullName ||
                      item.assignedMember.displayName ||
                      item.assignedMember.username;
                    const isEditingThis = editingTaskId === item.taskId;

                    return (
                      <View
                        key={item.taskId}
                        style={[
                          styles.previewCard,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: item.isManualOverride
                              ? colors.primary
                              : colors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.previewTopRow}>
                          <Text
                            style={[styles.taskCode, { color: colors.primary }]}
                          >
                            TASK-{item.taskId}
                          </Text>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryText,
                                { color: colors.subText },
                              ]}
                            >
                              {item.category}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[styles.taskTitle, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {item.taskTitle}
                        </Text>

                        <Text
                          style={[styles.reasonText, { color: colors.subText }]}
                        >
                          💡 {item.roleReason}
                        </Text>

                        {/* Assignee Bar (Tap to change before applying) */}
                        <TouchableOpacity
                          style={[
                            styles.assignedMemberBar,
                            {
                              backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                              borderColor: colors.cardBorder,
                            },
                          ]}
                          onPress={() =>
                            setEditingTaskId(isEditingThis ? null : item.taskId)
                          }
                          activeOpacity={0.75}
                        >
                          <View style={styles.assignedMemberLeft}>
                            <View style={styles.smallAvatar}>
                              <Text style={styles.smallAvatarText}>
                                {getInitials(assigneeName)}
                              </Text>
                            </View>
                            <View>
                              <Text
                                style={[
                                  styles.assignedMemberName,
                                  { color: colors.text },
                                ]}
                              >
                                {assigneeName}
                              </Text>
                              <Text
                                style={{ fontSize: 10, color: colors.subText }}
                              >
                                {item.isManualOverride
                                  ? tr("Đã chỉnh thủ công")
                                  : tr("AI đề xuất • Chạm để đổi người")}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: colors.primary,
                            }}
                          >
                            {isEditingThis ? tr("Đóng") : tr("Đổi người")}
                          </Text>
                        </TouchableOpacity>

                        {/* Member Override Picker */}
                        {isEditingThis && (
                          <View style={styles.overridePickerWrap}>
                            {members.map((m) => {
                              const mName =
                                m.fullName || m.displayName || m.username;
                              const isSelected =
                                m.id === item.assignedMember.id;
                              return (
                                <TouchableOpacity
                                  key={m.id}
                                  style={[
                                    styles.memberChip,
                                    {
                                      backgroundColor: isSelected
                                        ? colors.primary
                                        : isDark
                                        ? '#161A1D'
                                        : '#F4F5F7',
                                      borderColor: isSelected
                                        ? colors.primary
                                        : colors.cardBorder,
                                    },
                                  ]}
                                  onPress={() => {
                                    setManualOverrides((prev) => ({
                                      ...prev,
                                      [item.taskId]: m.id,
                                    }));
                                    setEditingTaskId(null);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.memberChipText,
                                      {
                                        color: isSelected
                                          ? '#FFFFFF'
                                          : colors.text,
                                      },
                                    ]}
                                  >
                                    {mName}
                                  </Text>
                                  {isSelected && (
                                    <Check size={12} color="#FFFFFF" />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            ) : (
              /* MANUAL ASSIGNMENT MODE */
              <>
                <Text style={[styles.sectionTitle, { color: colors.subText }]}>
                  {tr("CHỌN THÀNH VIÊN CHO TỪNG CÔNG VIỆC (")}
                  {filteredManualTasks.length})
                </Text>

                {filteredManualTasks.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Users size={32} color={colors.subText} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {tr("Không có công việc trong mục này")}
                    </Text>
                  </View>
                ) : (
                  filteredManualTasks.map((t) => {
                    const currentOwnerId = t.ownerId || t.assignee?.id;
                    const isUpdatingThis = loadingTaskId === t.id;
                    const stNorm = normalizeTaskStatus(t.status);

                    return (
                      <View
                        key={t.id}
                        style={[
                          styles.previewCard,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.previewTopRow}>
                          <Text
                            style={[styles.taskCode, { color: colors.primary }]}
                          >
                            TASK-{t.id}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: colors.subText,
                            }}
                          >
                            {systemLabel(stNorm)}
                          </Text>
                        </View>

                        <Text
                          style={[styles.taskTitle, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {t.title}
                        </Text>

                        {/* Member Chips for instant manual assignment */}
                        <View style={styles.overridePickerWrap}>
                          {members.map((m) => {
                            const mName =
                              m.fullName || m.displayName || m.username;
                            const isSelected = currentOwnerId === m.id;
                            return (
                              <TouchableOpacity
                                key={m.id}
                                disabled={isUpdatingThis}
                                style={[
                                  styles.memberChip,
                                  {
                                    backgroundColor: isSelected
                                      ? colors.primary
                                      : isDark
                                      ? '#161A1D'
                                      : '#F4F5F7',
                                    borderColor: isSelected
                                      ? colors.primary
                                      : colors.cardBorder,
                                  },
                                ]}
                                onPress={() =>
                                  handleManualPick(
                                    t.id,
                                    isSelected ? null : m.id
                                  )
                                }
                              >
                                <Text
                                  style={[
                                    styles.memberChipText,
                                    {
                                      color: isSelected
                                        ? '#FFFFFF'
                                        : colors.text,
                                    },
                                  ]}
                                >
                                  {mName}
                                </Text>
                                {isSelected && (
                                  <Check size={12} color="#FFFFFF" />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Action Bar */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.cardBg,
                borderTopColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                {tr("Đóng")}
              </Text>
            </TouchableOpacity>

            {mode === 'AUTO' && (
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  {
                    backgroundColor:
                      effectivePreview.length === 0
                        ? colors.mutedText
                        : colors.primary,
                  },
                ]}
                disabled={effectivePreview.length === 0 || submitting}
                onPress={handleApplyAutoAssign}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Sparkles size={15} color="#FFFFFF" />
                    <Text style={styles.applyBtnText}>
                      {tr("Xác nhận phân công (")}{effectivePreview.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  scopeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scopePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  scopePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sprintPillsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  sprintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  sprintChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  memberLoadScroll: {
    gap: 10,
    paddingBottom: 6,
  },
  memberLoadCard: {
    width: 170,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  memberLoadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5E4DB2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 10,
  },
  memberLoadCounters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyBox: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  previewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCode: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  reasonText: {
    fontSize: 11,
    lineHeight: 16,
  },
  assignedMemberBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  assignedMemberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  assignedMemberName: {
    fontSize: 13,
    fontWeight: '700',
  },
  overridePickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
