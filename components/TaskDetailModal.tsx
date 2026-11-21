import { systemLabel, translate as tr } from '../i18n';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  ListTodo,
  UserPlus,
  UserMinus,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Layers,
  Calendar,
  ArrowRight,
  SquareCheck,
  Square,
} from 'lucide-react-native';
import {
  Task,
  TaskStatus,
  TaskPriority,
  Sprint,
  User,
  SpaceRoleType,
} from '../types';
import { useThemeStore } from '../stores/useThemeStore';
import {
  normalizeTaskStatus,
  CanonicalTaskStatus,
  checkStatusTransitionPermission,
  parseTaskDescriptionWithChecklist,
  serializeTaskDescriptionWithChecklist,
  generateAiSubstepsForTask,
  TaskChecklistItem,
} from '../utils/taskRules';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  sprints?: Sprint[];
  members?: User[];
  currentUserId?: number;
  userRole?: SpaceRoleType;
  onClose: () => void;
  onUpdateTask: (
    taskId: number,
    data: {
      spaceId: number;
      sprintId?: number | null;
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      ownerId?: number | null;
      startDate?: string;
      dueDate?: string;
    }
  ) => Promise<void>;
  onDeleteTask?: (taskId: number) => Promise<void>;
}

const STATUS_STEPS: {
  key: CanonicalTaskStatus;
  label: string;
  color: string;
  bgDark: string;
  bgLight: string;
}[] = [
  {
    key: 'TODO',
    label: 'Cần làm',
    color: '#8C9BAB',
    bgDark: '#22272B',
    bgLight: '#F4F5F7',
  },
  {
    key: 'IN_PROGRESS',
    label: 'Đang làm',
    color: '#579DFF',
    bgDark: '#1D3B6A',
    bgLight: '#DEEBFF',
  },
  {
    key: 'IN_REVIEW',
    label: 'Chờ duyệt',
    color: '#F59E0B',
    bgDark: '#3B2314',
    bgLight: '#FEF3C7',
  },
  {
    key: 'DONE',
    label: 'Hoàn thành',
    color: '#10B981',
    bgDark: '#0D3823',
    bgLight: '#E3FCEF',
  },
];

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  sprints = [],
  members = [],
  currentUserId,
  userRole = 'MEMBER',
  onClose,
  onUpdateTask,
  onDeleteTask,
}) => {
  const { colors, isDark } = useThemeStore();

  const [title, setTitle] = useState('');
  const [baseDesc, setBaseDesc] = useState('');
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [aiRationale, setAiRationale] = useState<string | undefined>(undefined);
  const [assistantVerified, setAssistantVerified] = useState(false);
  const [createdByUserId, setCreatedByUserId] = useState<number | undefined>(
    undefined
  );
  const [newStepText, setNewStepText] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [sprintId, setSprintId] = useState<number | null | undefined>(undefined);
  const [ownerId, setOwnerId] = useState<number | null | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');

  // Status confirmation state inside modal
  const [pendingStatus, setPendingStatus] = useState<CanonicalTaskStatus | null>(
    null
  );
  const [revertReason, setRevertReason] = useState('');
  const [permissionMessage, setPermissionMessage] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task && visible) {
      const parsed = parseTaskDescriptionWithChecklist(task.description);
      setTitle(task.title);
      setBaseDesc(parsed.baseDescription);
      setChecklist(parsed.checklist);
      setAiRationale(parsed.aiRationale);
      setAssistantVerified(parsed.assistantVerified);
      setCreatedByUserId(parsed.createdByUserId);
      setNewStepText('');
      setPriority(task.priority || 'MEDIUM');
      setSprintId(task.sprintId ?? null);
      setOwnerId(task.ownerId ?? task.assignee?.id ?? null);
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
      setPendingStatus(null);
      setRevertReason('');
      setPermissionMessage(null);
      setConfirmDelete(false);
    }
  }, [task, visible]);

  if (!task) return null;

  const currentStatus = normalizeTaskStatus(task.status);
  const isPM = userRole === 'PM';
  const isAssistant = userRole === 'ASSISTANT';
  const isCoordinator = isPM || isAssistant;
  const effectiveOwnerId = ownerId ?? null;
  const isMyTask = Boolean(
    currentUserId && effectiveOwnerId === currentUserId
  );
  const isUnassigned = !effectiveOwnerId;
  const canEditFields = isCoordinator || isMyTask || isUnassigned;

  const buildSerializedDesc = (
    overrideBase?: string,
    overrideVerified?: boolean,
    overrideChecklist?: TaskChecklistItem[],
    overrideRationale?: string
  ) => {
    return serializeTaskDescriptionWithChecklist(
      overrideBase !== undefined ? overrideBase : baseDesc,
      overrideChecklist !== undefined ? overrideChecklist : checklist,
      overrideRationale !== undefined ? overrideRationale : aiRationale,
      {
        assistantVerified:
          overrideVerified !== undefined ? overrideVerified : assistantVerified,
        createdByUserId,
      }
    );
  };

  const handleSelectTargetStatus = (target: CanonicalTaskStatus) => {
    setPermissionMessage(null);
    if (target === currentStatus) {
      setPendingStatus(null);
      return;
    }
    const check = checkStatusTransitionPermission(
      { ...task, ownerId: effectiveOwnerId },
      target,
      userRole,
      currentUserId
    );
    if (!check.allowed) {
      setPermissionMessage(
        check.reasonKey
          ? tr(check.reasonKey)
          : tr("Thao tác không được phép.")
      );
      setPendingStatus(null);
      return;
    }
    setPendingStatus(target);
    setRevertReason('');
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatus) return;
    try {
      setSaving(true);
      let updatedBase = baseDesc;
      let nextVerified = assistantVerified;
      if (currentStatus === 'IN_REVIEW' && pendingStatus === 'IN_PROGRESS') {
        nextVerified = false;
        if (revertReason.trim()) {
          const roleLabel = isPM ? 'PM' : 'Assistant';
          const note = `\n\n> ⚠️ Yêu cầu chỉnh sửa (${roleLabel}): ${revertReason.trim()}`;
          updatedBase = updatedBase ? `${updatedBase}${note}` : note.trim();
        }
      }
      const fullDesc = buildSerializedDesc(updatedBase, nextVerified);
      await onUpdateTask(task.id, {
        spaceId: task.spaceId,
        sprintId: sprintId ?? null,
        title: title.trim() || task.title,
        description: fullDesc,
        status: pendingStatus,
        priority,
        ownerId: effectiveOwnerId,
        startDate: task.startDate,
        dueDate: dueDate ? `${dueDate}T23:59:59` : undefined,
      });
      setBaseDesc(updatedBase);
      setAssistantVerified(nextVerified);
      setPendingStatus(null);
      setRevertReason('');
    } finally {
      setSaving(false);
    }
  };

  const handleAssistantToggleVerify = async (verified: boolean) => {
    try {
      setSaving(true);
      const fullDesc = buildSerializedDesc(baseDesc, verified);
      await onUpdateTask(task.id, {
        spaceId: task.spaceId,
        sprintId: sprintId ?? null,
        title: title.trim() || task.title,
        description: fullDesc,
        status: currentStatus,
        priority,
        ownerId: effectiveOwnerId,
        startDate: task.startDate,
        dueDate: dueDate ? `${dueDate}T23:59:59` : undefined,
      });
      setAssistantVerified(verified);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignOwner = async (newOwnerId: number | null) => {
    try {
      setSaving(true);
      setOwnerId(newOwnerId);
      const fullDesc = buildSerializedDesc();
      await onUpdateTask(task.id, {
        spaceId: task.spaceId,
        sprintId: sprintId ?? null,
        title: title.trim() || task.title,
        description: fullDesc,
        status: currentStatus,
        priority,
        ownerId: newOwnerId,
        startDate: task.startDate,
        dueDate: dueDate ? `${dueDate}T23:59:59` : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAiSteps = () => {
    const generated = generateAiSubstepsForTask({
      ...task,
      title,
      priority,
    });
    setChecklist((prev) => [...prev, ...generated.steps]);
    setAiRationale(generated.rationale);
  };

  const handleAddChecklistStep = () => {
    if (!newStepText.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        text: newStepText.trim(),
        completed: false,
      },
    ]);
    setNewStepText('');
  };

  const handleToggleChecklistStep = (id: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  };

  const handleRemoveChecklistStep = (id: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveChanges = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      const fullDesc = buildSerializedDesc();
      await onUpdateTask(task.id, {
        spaceId: task.spaceId,
        sprintId: sprintId ?? null,
        title: title.trim(),
        description: fullDesc,
        status: currentStatus,
        priority,
        ownerId: effectiveOwnerId,
        startDate: task.startDate,
        dueDate: dueDate ? `${dueDate}T23:59:59` : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    const clean = (name || 'U').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const assignedMember = members.find((m) => m.id === effectiveOwnerId);
  const assigneeDisplayName =
    assignedMember?.fullName ||
    assignedMember?.displayName ||
    assignedMember?.username ||
    task.ownerName ||
    task.assignee?.fullName ||
    (effectiveOwnerId ? `User #${effectiveOwnerId}` : null);

  const completedStepsCount = checklist.filter((c) => c.completed).length;

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
          {/* Top Bar */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.cardBg,
                borderBottomColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.headerBadgesRow}>
              <View
                style={[
                  styles.taskCodeBadge,
                  {
                    backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.taskCodeText, { color: colors.primary }]}>
                  TASK-{task.id}
                </Text>
              </View>

              {isMyTask ? (
                <View style={styles.myTaskBadge}>
                  <Text style={styles.myTaskBadgeText}>
                    👤 {tr("CỦA TÔI")}
                  </Text>
                </View>
              ) : isUnassigned ? (
                <View style={styles.unassignedBadge}>
                  <Text style={styles.unassignedBadgeText}>
                    {tr("CHƯA GIAO")}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.otherMemberBadge,
                    { backgroundColor: isDark ? '#22272B' : '#F3F4F6' },
                  ]}
                >
                  <Text
                    style={[
                      styles.otherMemberBadgeText,
                      { color: colors.subText },
                    ]}
                  >
                    👤 {assigneeDisplayName}
                  </Text>
                </View>
              )}

              {assistantVerified && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={12} color="#10B981" />
                  <Text style={styles.verifiedBadgeText}>
                    {tr("Đạt yêu cầu")}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: isMyTask ? '#3B82F6' : colors.cardBorder,
                  borderLeftWidth: isMyTask ? 4 : 1,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>
                {tr("TÊN CÔNG VIỆC")}
              </Text>
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                editable={canEditFields}
                multiline
              />
            </View>

            {/* 1. STATUS TRANSITION & CONFIRMATION SECTION */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.fieldLabel, { color: colors.subText }]}>
                  {tr("TRẠNG THÁI & QUY TRÌNH DUYỆT")}
                </Text>
                <Text
                  style={[styles.roleHintBadge, { color: colors.primary }]}
                >
                  {tr("Vai trò:")} {systemLabel(userRole)}
                </Text>
              </View>

              {/* 4 Status Buttons */}
              <View style={styles.statusGrid}>
                {STATUS_STEPS.map((st) => {
                  const isCurrent = currentStatus === st.key;
                  const isPending = pendingStatus === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      style={[
                        styles.statusStepBtn,
                        {
                          backgroundColor: isCurrent
                            ? isDark
                              ? st.bgDark
                              : st.bgLight
                            : isDark
                            ? '#161A1D'
                            : '#F8FAFC',
                          borderColor: isCurrent
                            ? st.color
                            : isPending
                            ? colors.primary
                            : colors.cardBorder,
                          borderWidth: isCurrent || isPending ? 2 : 1,
                        },
                      ]}
                      onPress={() => handleSelectTargetStatus(st.key)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: st.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusStepText,
                          {
                            color: isCurrent ? st.color : colors.text,
                            fontWeight: isCurrent ? '800' : '600',
                          },
                        ]}
                      >
                        {tr(st.label)}
                      </Text>
                      {isCurrent && <Check size={13} color={st.color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Permission Error Notice if forbidden status was tapped */}
              {!!permissionMessage && (
                <View style={styles.permErrorBox}>
                  <AlertCircle size={15} color="#EF4444" />
                  <Text style={styles.permErrorText}>{permissionMessage}</Text>
                </View>
              )}

              {/* Confirmation Box when user selects a new status */}
              {pendingStatus && (
                <View
                  style={[
                    styles.confirmTransitionBox,
                    {
                      backgroundColor: isDark ? '#161A1D' : '#EFF6FF',
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <View style={styles.confirmHeaderRow}>
                    <Text
                      style={[
                        styles.confirmTitle,
                        { color: isDark ? '#579DFF' : '#0052CC' },
                      ]}
                    >
                      {tr("Xác nhận chuyển trạng thái:")}
                    </Text>
                    <View style={styles.transitionInline}>
                      <Text
                        style={[
                          styles.transitionBadge,
                          { color: colors.subText },
                        ]}
                      >
                        {systemLabel(currentStatus)}
                      </Text>
                      <ArrowRight size={14} color={colors.primary} />
                      <Text
                        style={[
                          styles.transitionBadge,
                          { color: colors.primary, fontWeight: '800' },
                        ]}
                      >
                        {systemLabel(pendingStatus)}
                      </Text>
                    </View>
                  </View>

                  {currentStatus === 'IN_REVIEW' &&
                    pendingStatus === 'IN_PROGRESS' && (
                      <TextInput
                        style={[
                          styles.revertReasonInput,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: colors.cardBorder,
                            color: colors.text,
                          },
                        ]}
                        placeholder={tr("Nhập lý do / yêu cầu chỉnh sửa cho thành viên...")}
                        placeholderTextColor={colors.mutedText}
                        value={revertReason}
                        onChangeText={setRevertReason}
                      />
                    )}

                  <View style={styles.confirmActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.confirmCancelBtn,
                        { borderColor: colors.cardBorder },
                      ]}
                      onPress={() => setPendingStatus(null)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: colors.subText,
                        }}
                      >
                        {tr("Hủy")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.confirmOkBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleConfirmStatusChange}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <CheckCircle2 size={14} color="#FFFFFF" />
                          <Text style={styles.confirmOkBtnText}>
                            {tr("Xác nhận chuyển")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Assistant / PM Special Approval Actions when in IN_REVIEW */}
              {currentStatus === 'IN_REVIEW' && (
                <View style={styles.reviewActionsWrap}>
                  {isAssistant && (
                    <TouchableOpacity
                      style={[
                        styles.assistantVerifyBtn,
                        {
                          backgroundColor: assistantVerified
                            ? isDark
                              ? '#0D3823'
                              : '#E3FCEF'
                            : '#10B981',
                          borderColor: '#10B981',
                        },
                      ]}
                      onPress={() =>
                        handleAssistantToggleVerify(!assistantVerified)
                      }
                      disabled={saving}
                    >
                      <ShieldCheck
                        size={16}
                        color={assistantVerified ? '#10B981' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.assistantVerifyBtnText,
                          {
                            color: assistantVerified ? '#10B981' : '#FFFFFF',
                          },
                        ]}
                      >
                        {assistantVerified
                          ? tr("✓ Đã đánh dấu Đạt yêu cầu (Chờ PM duyệt)")
                          : tr("Đánh dấu Đạt yêu cầu (Trợ lý xác nhận)")}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {isPM && (
                    <View style={styles.pmApproveRow}>
                      <TouchableOpacity
                        style={styles.pmApproveDoneBtn}
                        onPress={() => handleSelectTargetStatus('DONE')}
                      >
                        <CheckCircle2 size={15} color="#FFFFFF" />
                        <Text style={styles.pmApproveDoneText}>
                          {tr("PM Duyệt sang Đã xong")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pmRevertBtn,
                          {
                            backgroundColor: isDark ? '#3B2314' : '#FEF3C7',
                            borderColor: '#F59E0B',
                          },
                        ]}
                        onPress={() => handleSelectTargetStatus('IN_PROGRESS')}
                      >
                        <RotateCcw size={14} color="#F59E0B" />
                        <Text style={styles.pmRevertText}>
                          {tr("Yêu cầu sửa")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 2. ASSIGNEE & SELF-ASSIGN / MANUAL ASSIGN SECTION */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.fieldLabel, { color: colors.subText }]}>
                  {tr("NGƯỜI PHỤ TRÁCH CÔNG VIỆC")}
                </Text>

                {/* Quick Self-Assign or Unassign */}
                {isUnassigned && currentUserId ? (
                  <TouchableOpacity
                    style={[
                      styles.selfAssignBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleAssignOwner(currentUserId)}
                    disabled={saving}
                  >
                    <UserPlus size={13} color="#FFFFFF" />
                    <Text style={styles.selfAssignBtnText}>
                      {tr("+ Tự nhận việc này")}
                    </Text>
                  </TouchableOpacity>
                ) : isMyTask && currentStatus === 'TODO' ? (
                  <TouchableOpacity
                    style={[
                      styles.unassignBtn,
                      { borderColor: colors.cardBorder },
                    ]}
                    onPress={() => handleAssignOwner(null)}
                    disabled={saving}
                  >
                    <UserMinus size={13} color="#EF4444" />
                    <Text style={styles.unassignBtnText}>
                      {tr("Bỏ nhận việc")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Current Assignee Display */}
              <View
                style={[
                  styles.currentAssigneeRow,
                  {
                    backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                    borderColor: isMyTask ? '#3B82F6' : colors.cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.assigneeAvatar,
                    {
                      backgroundColor: isMyTask
                        ? '#3B82F6'
                        : effectiveOwnerId
                        ? '#5E4DB2'
                        : colors.mutedText,
                    },
                  ]}
                >
                  <Text style={styles.assigneeAvatarText}>
                    {assigneeDisplayName
                      ? getInitials(assigneeDisplayName)
                      : '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.assigneeNameText, { color: colors.text }]}
                  >
                    {assigneeDisplayName || tr("Chưa có người nhận")}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.subText }}>
                    {isMyTask
                      ? tr("Công việc do bạn trực tiếp phụ trách")
                      : effectiveOwnerId
                      ? assignedMember?.jobTitle || tr("Thành viên thực hiện")
                      : tr("Bấm '+ Tự nhận việc này' để nhận đầu việc")}
                  </Text>
                </View>
              </View>

              {/* Coordinator (PM / Assistant) Manual Member Picker */}
              {isCoordinator && members.length > 0 && (
                <View style={{ marginTop: 10, gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.subText,
                    }}
                  >
                    {tr("Phân công thủ công (Dành cho PM & Trợ lý):")}
                  </Text>
                  <View style={styles.memberChipsWrap}>
                    <TouchableOpacity
                      style={[
                        styles.memberChip,
                        {
                          backgroundColor: !effectiveOwnerId
                            ? colors.primary
                            : isDark
                            ? '#161A1D'
                            : '#F4F5F7',
                          borderColor: !effectiveOwnerId
                            ? colors.primary
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleAssignOwner(null)}
                    >
                      <Text
                        style={[
                          styles.memberChipText,
                          {
                            color: !effectiveOwnerId ? '#FFFFFF' : colors.subText,
                          },
                        ]}
                      >
                        {tr("Để trống")}
                      </Text>
                    </TouchableOpacity>

                    {members.map((m) => {
                      const mName = m.fullName || m.displayName || m.username;
                      const isSelected = effectiveOwnerId === m.id;
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
                          onPress={() => handleAssignOwner(m.id)}
                        >
                          <Text
                            style={[
                              styles.memberChipText,
                              {
                                color: isSelected ? '#FFFFFF' : colors.text,
                              },
                            ]}
                          >
                            {mName}
                          </Text>
                          {isSelected && <Check size={12} color="#FFFFFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* 3. SPRINT & PRIORITY & DUE DATE */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>
                {tr("GIAI ĐOẠN (SPRINT) & MỨC ĐỘ ƯU TIÊN")}
              </Text>

              {/* Sprint Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalPills}
              >
                <TouchableOpacity
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor:
                        !sprintId
                          ? isDark
                            ? '#1D3B6A'
                            : '#DEEBFF'
                          : isDark
                          ? '#161A1D'
                          : '#F4F5F7',
                      borderColor: !sprintId
                        ? colors.primary
                        : colors.cardBorder,
                    },
                  ]}
                  onPress={() => canEditFields && setSprintId(null)}
                >
                  <Layers size={12} color={colors.primary} />
                  <Text style={[styles.selectChipText, { color: colors.text }]}>
                    {tr("Backlog")}
                  </Text>
                </TouchableOpacity>

                {sprints.map((sp) => {
                  const isSel = sprintId === sp.id;
                  return (
                    <TouchableOpacity
                      key={sp.id}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: isSel
                            ? isDark
                              ? '#1D3B6A'
                              : '#DEEBFF'
                            : isDark
                            ? '#161A1D'
                            : '#F4F5F7',
                          borderColor: isSel
                            ? colors.primary
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() => canEditFields && setSprintId(sp.id)}
                    >
                      <Layers size={12} color={colors.primary} />
                      <Text
                        style={[styles.selectChipText, { color: colors.text }]}
                      >
                        {sp.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Priority Selector */}
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => {
                  const isSel = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityBtn,
                        {
                          backgroundColor: isSel
                            ? colors.primary
                            : isDark
                            ? '#161A1D'
                            : '#F4F5F7',
                          borderColor: isSel
                            ? colors.primary
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() => canEditFields && setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.priorityBtnText,
                          { color: isSel ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {systemLabel(p)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Due Date Input */}
              <View style={styles.dueDateRow}>
                <Calendar size={15} color={colors.subText} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: colors.subText,
                  }}
                >
                  {tr("Hạn chót (YYYY-MM-DD):")}
                </Text>
                <TextInput
                  style={[
                    styles.dueDateInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.mutedText}
                  value={dueDate}
                  onChangeText={setDueDate}
                  editable={canEditFields}
                />
              </View>
            </View>

            {/* 4. CHECKLIST CÁC BƯỚC THỰC HIỆN */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.fieldLabel, { color: colors.subText }]}>
                  {tr("CÁC BƯỚC THỰC HIỆN (")}
                  {completedStepsCount}/{checklist.length})
                </Text>
                {canEditFields && (
                  <TouchableOpacity
                    style={[
                      styles.aiStepsBtn,
                      {
                        backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
                      },
                    ]}
                    onPress={handleGenerateAiSteps}
                  >
                    <Sparkles
                      size={12}
                      color={isDark ? '#579DFF' : '#0052CC'}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: isDark ? '#579DFF' : '#0052CC',
                      }}
                    >
                      {tr("AI Gợi ý bước làm")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {checklist.length > 0 && (
                <View style={styles.checklistList}>
                  {checklist.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.checklistItem,
                        { borderBottomColor: colors.divider },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.checklistToggle}
                        onPress={() =>
                          canEditFields && handleToggleChecklistStep(item.id)
                        }
                      >
                        {item.completed ? (
                          <SquareCheck size={18} color="#10B981" />
                        ) : (
                          <Square size={18} color={colors.subText} />
                        )}
                        <Text
                          style={[
                            styles.checklistText,
                            {
                              color: item.completed
                                ? colors.subText
                                : colors.text,
                              textDecorationLine: item.completed
                                ? 'line-through'
                                : 'none',
                            },
                          ]}
                        >
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                      {canEditFields && (
                        <TouchableOpacity
                          onPress={() => handleRemoveChecklistStep(item.id)}
                          style={{ padding: 4 }}
                        >
                          <X size={14} color={colors.subText} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {canEditFields && (
                <View style={styles.addStepRow}>
                  <TextInput
                    style={[
                      styles.addStepInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      },
                    ]}
                    placeholder={tr("Thêm bước thực hiện cụ thể...")}
                    placeholderTextColor={colors.mutedText}
                    value={newStepText}
                    onChangeText={setNewStepText}
                    onSubmitEditing={handleAddChecklistStep}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addStepBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleAddChecklistStep}
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 5. DESCRIPTION SECTION */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>
                {tr("MÔ TẢ & GHI CHÚ CHI TIẾT")}
              </Text>
              <TextInput
                style={[
                  styles.descInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder={tr("Nhập mô tả chi tiết công việc, tài liệu tham khảo...")}
                placeholderTextColor={colors.mutedText}
                value={baseDesc}
                onChangeText={setBaseDesc}
                editable={canEditFields}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Delete Task Option (PM or Creator on TODO) */}
            {onDeleteTask && (isPM || (isMyTask && currentStatus === 'TODO')) && (
              <View style={{ marginTop: 4 }}>
                {!confirmDelete ? (
                  <TouchableOpacity
                    style={[
                      styles.deleteTaskBtn,
                      {
                        backgroundColor: isDark ? '#2A1619' : '#FEF2F2',
                        borderColor: isDark ? '#5C232A' : '#FECACA',
                      },
                    ]}
                    onPress={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={15} color="#EF4444" />
                    <Text style={styles.deleteTaskBtnText}>
                      {tr("Xóa công việc này")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.confirmDeleteBox,
                      {
                        backgroundColor: isDark ? '#2A1619' : '#FEF2F2',
                        borderColor: '#EF4444',
                      },
                    ]}
                  >
                    <Text style={styles.confirmDeleteTitle}>
                      {tr("Xác nhận xóa công việc này?")}
                    </Text>
                    <View style={styles.confirmActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.confirmCancelBtn,
                          { borderColor: colors.cardBorder },
                        ]}
                        onPress={() => setConfirmDelete(false)}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: colors.text,
                          }}
                        >
                          {tr("Hủy")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.confirmOkBtn,
                          { backgroundColor: '#EF4444' },
                        ]}
                        onPress={async () => {
                          await onDeleteTask(task.id);
                          onClose();
                        }}
                      >
                        <Text style={styles.confirmOkBtnText}>
                          {tr("Xóa vĩnh viễn")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Save Bar */}
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

            {canEditFields && (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={15} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {tr("Lưu thông tin")}
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
    height: '90%',
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
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  taskCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskCodeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  myTaskBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  myTaskBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  unassignedBadge: {
    backgroundColor: '#F59E0B22',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unassignedBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  otherMemberBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  otherMemberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98122',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleHintBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    paddingVertical: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusStepBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusStepText: {
    fontSize: 12,
    flex: 1,
  },
  permErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444418',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
  },
  permErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  confirmTransitionBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  confirmHeaderRow: {
    gap: 4,
  },
  confirmTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  transitionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  transitionBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  revertReasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmOkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmOkBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewActionsWrap: {
    marginTop: 4,
    gap: 8,
  },
  assistantVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  assistantVerifyBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pmApproveRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pmApproveDoneBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 11,
    borderRadius: 12,
  },
  pmApproveDoneText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pmRevertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  pmRevertText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  selfAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  selfAssignBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  unassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  unassignBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  currentAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  assigneeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  assigneeNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  memberChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  horizontalPills: {
    gap: 8,
    paddingVertical: 2,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dueDateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  aiStepsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  checklistList: {
    gap: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  checklistToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checklistText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  addStepRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  addStepInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 12,
  },
  addStepBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 86,
    textAlignVertical: 'top',
  },
  deleteTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteTaskBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmDeleteBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  confirmDeleteTitle: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
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
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
