import { systemLabel, translate as tr, useTranslation as useSystemTranslation } from '../i18n';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import {
  ListTodo,
  Clock,
  Eye,
  CheckCircle2,
  Plus,
  UserPlus,
  ShieldCheck,
  RotateCcw,
  SquareCheck,
  AlertCircle,
  Search,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { Task, TaskStatus, User, SpaceRoleType, Sprint } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';
import {
  normalizeTaskStatus,
  CanonicalTaskStatus,
  checkStatusTransitionPermission,
  parseTaskDescriptionWithChecklist,
} from '../utils/taskRules';

interface KanbanBoardProps {
  tasks: Task[];
  sprints?: Sprint[];
  members?: User[];
  currentUserId?: number;
  userRole?: SpaceRoleType;
  selectedSprintId?: number | 'BACKLOG';
  onSelectSprint?: (sprintId: number | 'BACKLOG') => void;
  onUpdateStatus: (taskId: number, newStatus: TaskStatus) => Promise<void>;
  onRequestStatusChange?: (
    task: Task,
    targetStatus: TaskStatus,
    isRevert?: boolean
  ) => void;
  onSelectTask?: (task: Task) => void;
  onSelfAssign?: (task: Task) => void;
  onAssistantVerify?: (task: Task, verified: boolean) => void;
  onAddTask?: (defaultStatus?: TaskStatus) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = Math.min(315, Math.max(265, Math.round(SCREEN_WIDTH * 0.77)));

const COLUMNS: {
  key: CanonicalTaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  pillBgLight: string;
  pillBgDark: string;
}[] = [
  {
    key: 'TODO',
    title: 'CẦN LÀM',
    icon: ListTodo,
    color: '#64748B',
    pillBgLight: '#E2E8F0',
    pillBgDark: '#22272B',
  },
  {
    key: 'IN_PROGRESS',
    title: 'ĐANG LÀM',
    icon: Clock,
    color: '#2563EB',
    pillBgLight: '#DBEAFE',
    pillBgDark: '#1D3B6A',
  },
  {
    key: 'IN_REVIEW',
    title: 'CHỜ DUYỆT',
    icon: Eye,
    color: '#D97706',
    pillBgLight: '#FEF3C7',
    pillBgDark: '#3B2314',
  },
  {
    key: 'DONE',
    title: 'ĐÃ XONG',
    icon: CheckCircle2,
    color: '#16A34A',
    pillBgLight: '#DCFCE7',
    pillBgDark: '#0D3823',
  },
];

const AVATAR_COLORS = [
  '#5E4DB2',
  '#0052CC',
  '#00875A',
  '#E65100',
  '#C2185B',
  '#0284C7',
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  sprints = [],
  members = [],
  currentUserId,
  userRole = 'MEMBER',
  selectedSprintId,
  onSelectSprint,
  onUpdateStatus,
  onRequestStatusChange,
  onSelectTask,
  onSelfAssign,
  onAssistantVerify,
  onAddTask,
}) => {
  const { colors, isDark } = useThemeStore();
  useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Default to active Sprint (or first Sprint, or BACKLOG) - never "All Sprints" when sprints exist
  const defaultSprintValue: number | 'BACKLOG' = useMemo(() => {
    const active = sprints.find((s) => s.status === 'ACTIVE') || sprints[0];
    return active ? active.id : 'BACKLOG';
  }, [sprints]);

  const [internalSprintId, setInternalSprintId] = useState<number | 'BACKLOG'>(
    selectedSprintId ?? defaultSprintValue
  );

  useEffect(() => {
    if (selectedSprintId !== undefined) {
      setInternalSprintId(selectedSprintId);
    } else {
      setInternalSprintId(defaultSprintValue);
    }
  }, [selectedSprintId, defaultSprintValue]);

  const effectiveSprintId = selectedSprintId ?? internalSprintId;

  const handleChooseSprint = (val: number | 'BACKLOG') => {
    setInternalSprintId(val);
    if (onSelectSprint) {
      onSelectSprint(val);
    }
    setSprintModalVisible(false);
  };

  // Search & Filter states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sprintModalVisible, setSprintModalVisible] = useState(false);
  const [sprintSearchQuery, setSprintSearchQuery] = useState('');
  const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<'ALL' | 'MINE' | 'UNASSIGNED' | number>('ALL');

  const [activeColIndex, setActiveColIndex] = useState(0);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Drag & Drop state (Long-press to drag card across the 4 columns)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<CanonicalTaskStatus | null>(null);
  const draggingTaskRef = useRef<Task | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;

  const isPM = userRole === 'PM';
  const isAssistant = userRole === 'ASSISTANT';

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'URGENT':
        return '#EF4444';
      case 'HIGH':
        return '#F97316';
      case 'LOW':
        return '#10B981';
      default:
        return '#D97706';
    }
  };

  const getAssigneeInfo = (task: Task) => {
    const oid = task.ownerId || task.assignee?.id;
    if (!oid) return null;
    const found = members.find((m) => m.id === oid);
    const fullName =
      found?.fullName ||
      found?.displayName ||
      found?.username ||
      task.ownerName ||
      task.assignee?.fullName ||
      `User #${oid}`;
    const clean = fullName.trim();
    const parts = clean.split(/\s+/);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : clean.substring(0, 2).toUpperCase();
    const shortName = parts[parts.length - 1] || clean;
    const color = AVATAR_COLORS[oid % AVATAR_COLORS.length];
    return { id: oid, fullName, shortName, initials, color };
  };

  const triggerStatusTransition = (
    task: Task,
    target: CanonicalTaskStatus,
    isRevert = false
  ) => {
    setPermissionNotice(null);
    const perm = checkStatusTransitionPermission(
      task,
      target,
      userRole,
      currentUserId
    );
    if (!perm.allowed) {
      setPermissionNotice(
        perm.reasonKey
          ? tr(perm.reasonKey)
          : tr("Thao tác không được phép.")
      );
      return;
    }

    if (onRequestStatusChange) {
      onRequestStatusChange(task, target, isRevert);
    } else {
      void onUpdateStatus(task.id, target);
    }
  };

  const triggerStatusTransitionRef = useRef(triggerStatusTransition);
  triggerStatusTransitionRef.current = triggerStatusTransition;

  // Map X coordinate to 1 of the 4 Kanban status columns during drag
  const getStatusFromX = (x: number): CanonicalTaskStatus => {
    const quarter = SCREEN_WIDTH / 4;
    if (x < quarter) return 'TODO';
    if (x < quarter * 2) return 'IN_PROGRESS';
    if (x < quarter * 3) return 'IN_REVIEW';
    return 'DONE';
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({
          x: gestureState.moveX - 115,
          y: gestureState.moveY - 50,
        });
        const target = getStatusFromX(gestureState.moveX);
        setHoveredStatus(target);
      },
      onPanResponderRelease: (_, gestureState) => {
        const target = getStatusFromX(gestureState.moveX);
        const currentTask = draggingTaskRef.current;
        draggingTaskRef.current = null;
        setDraggingTask(null);
        setHoveredStatus(null);

        if (
          currentTask &&
          target &&
          normalizeTaskStatus(currentTask.status) !== target
        ) {
          const isRev =
            normalizeTaskStatus(currentTask.status) === 'IN_REVIEW' &&
            target === 'IN_PROGRESS';
          triggerStatusTransitionRef.current(currentTask, target, isRev);
        }
      },
      onPanResponderTerminate: () => {
        draggingTaskRef.current = null;
        setDraggingTask(null);
        setHoveredStatus(null);
      },
    })
  ).current;

  const handleStartDrag = (task: Task, startX: number, startY: number) => {
    const st = normalizeTaskStatus(task.status);
    draggingTaskRef.current = task;
    setDraggingTask(task);
    setHoveredStatus(st);
    pan.setValue({ x: startX - 115, y: startY - 50 });
  };

  const sprintIdsSet = useMemo(
    () => new Set(sprints.map((s) => s.id)),
    [sprints]
  );

  // Filter tasks strictly by the selected Sprint (or Backlog if no sprints exist) + Assignee filter + Search
  const filteredTasks = useMemo(() => {
    const cleanQ = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.isDeleted) return false;

      // 1. Sprint filter (Only show tasks of the currently selected Sprint)
      if (sprints.length > 0) {
        if (effectiveSprintId === 'BACKLOG') {
          if (t.sprintId && sprintIdsSet.has(t.sprintId)) return false;
        } else {
          if (t.sprintId !== effectiveSprintId) return false;
        }
      }

      // 2. Assignee filter
      const oid = t.ownerId || t.assignee?.id;
      if (assigneeFilter === 'MINE') {
        if (!currentUserId || oid !== currentUserId) return false;
      } else if (assigneeFilter === 'UNASSIGNED') {
        if (oid) return false;
      } else if (typeof assigneeFilter === 'number') {
        if (oid !== assigneeFilter) return false;
      }

      // 3. Search query filter
      if (cleanQ) {
        const matchTitle = t.title.toLowerCase().includes(cleanQ);
        const matchCode = `task-${t.id}`.includes(cleanQ);
        if (!matchTitle && !matchCode) return false;
      }

      return true;
    });
  }, [
    tasks,
    sprints.length,
    effectiveSprintId,
    sprintIdsSet,
    assigneeFilter,
    currentUserId,
    searchQuery,
  ]);

  const currentSprintLabel = useMemo(() => {
    if (effectiveSprintId === 'BACKLOG') return tr("Backlog");
    const found = sprints.find((s) => s.id === effectiveSprintId);
    return found ? found.name : tr("Sprint hiện tại");
  }, [effectiveSprintId, sprints]);

  const currentAssigneeLabel = useMemo(() => {
    if (assigneeFilter === 'ALL') return tr("Người được chỉ định");
    if (assigneeFilter === 'MINE') return `👤 ${tr("Của tôi")}`;
    if (assigneeFilter === 'UNASSIGNED') return tr("Chưa giao");
    const found = members.find((m) => m.id === assigneeFilter);
    return found
      ? found.fullName || found.displayName || found.username
      : tr("Người được chỉ định");
  }, [assigneeFilter, members]);

  const searchedSprints = useMemo(() => {
    const q = sprintSearchQuery.trim().toLowerCase();
    if (!q) return sprints;
    return sprints.filter((s) => s.name.toLowerCase().includes(q));
  }, [sprints, sprintSearchQuery]);

  const handleHorizontalScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.min(
      COLUMNS.length - 1,
      Math.max(0, Math.round(x / (COLUMN_WIDTH + 12)))
    );
    if (idx !== activeColIndex) {
      setActiveColIndex(idx);
    }
  };

  return (
    <View style={styles.boardContainer}>
      {/* Top Filter Bar (Search icon + Sprint Dropdown Pill + Assignee Dropdown Pill) */}
      <View style={styles.filterBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterStripScroll}
        >
          {/* Search Trigger Button */}
          <TouchableOpacity
            style={[
              styles.searchIconBtn,
              searchOpen && {
                backgroundColor: colors.primaryBg,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setSearchOpen(!searchOpen)}
            activeOpacity={0.75}
          >
            <Search
              size={16}
              color={searchOpen ? colors.primary : colors.subText}
            />
          </TouchableOpacity>

          {/* Sprint Dropdown Trigger Pill */}
          {sprints.length > 0 && (
            <TouchableOpacity
              style={[
                styles.dropdownPill,
                {
                  backgroundColor: isDark ? '#1D3B6A' : '#EFF6FF',
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => {
                setSprintSearchQuery('');
                setSprintModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dropdownPillText,
                  { color: colors.primary, fontWeight: '800' },
                ]}
              >
                {currentSprintLabel}
              </Text>
              <ChevronDown size={14} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Assignee Dropdown Trigger Pill */}
          <TouchableOpacity
            style={[
              styles.dropdownPill,
              assigneeFilter !== 'ALL' && {
                backgroundColor: isDark ? '#1D3B6A' : '#EFF6FF',
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setAssigneeModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.dropdownPillText,
                assigneeFilter !== 'ALL' && {
                  color: colors.primary,
                  fontWeight: '800',
                },
              ]}
            >
              {currentAssigneeLabel}
            </Text>
            <ChevronDown
              size={14}
              color={
                assigneeFilter !== 'ALL' ? colors.primary : colors.subText
              }
            />
          </TouchableOpacity>
        </ScrollView>

        {/* Search Input Box when searchOpen */}
        {searchOpen && (
          <View style={styles.searchBoxRow}>
            <Search size={15} color={colors.subText} />
            <TextInput
              style={styles.searchBoxInput}
              placeholder={tr("Tìm kiếm tên công việc hoặc mã TASK...")}
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!permissionNotice && (
          <View style={styles.permBanner}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.permBannerText}>{permissionNotice}</Text>
          </View>
        )}
      </View>

      {/* 4 KANBAN COLUMNS SIDE-BY-SIDE (Stretching downward naturally, with Long-Press Drag & Drop!) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!draggingTask}
        onScroll={handleHorizontalScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.columnsScrollContent}
      >
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(
            (t) => normalizeTaskStatus(t.status) === col.key
          );
          const isTargeted = Boolean(draggingTask && hoveredStatus === col.key);

          return (
            <View
              key={col.key}
              style={[
                styles.column,
                isTargeted && {
                  borderColor: col.color,
                  borderWidth: 2,
                },
              ]}
            >
              {/* Column Header */}
              <View style={styles.columnHeader}>
                <View style={styles.columnTitleWrap}>
                  <Text style={styles.columnTitle}>{tr(col.title)}</Text>
                </View>

                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isDark
                        ? col.pillBgDark
                        : col.pillBgLight,
                    },
                  ]}
                >
                  <Text style={[styles.countBadgeText, { color: col.color }]}>
                    {colTasks.length}
                  </Text>
                </View>
              </View>

              {/* Cards Container */}
              <View style={styles.cardsList}>
                {colTasks.length === 0 ? (
                  <View style={styles.emptyColumn}>
                    <Text style={styles.emptyColumnText}>
                      {isTargeted
                        ? tr("Thả task vào đây")
                        : tr("Chưa có công việc ở cột này")}
                    </Text>
                  </View>
                ) : (
                  colTasks.map((t) => {
                    const st = normalizeTaskStatus(t.status);
                    const priorityColor = getPriorityColor(t.priority);
                    const assignee = getAssigneeInfo(t);
                    const oid = t.ownerId || t.assignee?.id;
                    const isMyTask = Boolean(
                      currentUserId && oid === currentUserId
                    );
                    const isBeingDragged = draggingTask?.id === t.id;
                    const parsed = parseTaskDescriptionWithChecklist(
                      t.description
                    );

                    return (
                      <TouchableOpacity
                        key={t.id}
                        activeOpacity={0.85}
                        delayLongPress={200}
                        onLongPress={(e) => {
                          const { pageX, pageY } = e.nativeEvent;
                          handleStartDrag(t, pageX, pageY);
                        }}
                        onPress={() => onSelectTask && onSelectTask(t)}
                        style={[
                          styles.taskCard,
                          isMyTask && {
                            borderColor: '#3B82F6',
                            borderLeftWidth: 4,
                            borderLeftColor: '#3B82F6',
                          },
                          isBeingDragged && styles.taskCardHidden,
                        ]}
                      >
                        {/* 1. Task Title (Bold when isMyTask, no Sprint/Epic clutter!) */}
                        <Text
                          style={[
                            styles.taskTitle,
                            isMyTask && { fontWeight: '800' },
                            st === 'DONE' && {
                              textDecorationLine: 'line-through',
                              opacity: 0.7,
                            },
                          ]}
                          numberOfLines={3}
                        >
                          {t.title}
                        </Text>

                        {/* 2. Compact Ownership / Verification Tag (Only if Mine or Assistant Verified) */}
                        {(isMyTask || parsed.assistantVerified) && (
                          <View style={styles.tagsRow}>
                            {isMyTask && (
                              <View style={styles.mineTagPill}>
                                <Text style={styles.mineTagText}>
                                  👤 {tr("CỦA TÔI")}
                                </Text>
                              </View>
                            )}

                            {parsed.assistantVerified && (
                              <View style={styles.verifiedTagPill}>
                                <ShieldCheck size={10} color="#15803D" />
                                <Text style={styles.verifiedTagText}>
                                  {tr("Đạt yêu cầu")}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* 3. Card Bottom Bar: Checkbox + TASK-# on Left | Priority `=` + Avatar on Right */}
                        <View style={styles.cardBottomRow}>
                          <View style={styles.cardBottomLeft}>
                            <SquareCheck
                              size={16}
                              color={st === 'DONE' ? '#16A34A' : '#3B82F6'}
                            />
                            <Text
                              style={[
                                styles.taskCodeText,
                                st === 'DONE' && {
                                  textDecorationLine: 'line-through',
                                },
                              ]}
                            >
                              TASK-{t.id}
                            </Text>
                          </View>

                          <View style={styles.cardBottomRight}>
                            {/* Priority Bars `=` + Priority Text */}
                            <View style={styles.priorityInlineWrap}>
                              <View style={styles.priorityBarsWrap}>
                                <View
                                  style={[
                                    styles.priorityBar,
                                    { backgroundColor: priorityColor },
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.priorityBar,
                                    { backgroundColor: priorityColor },
                                  ]}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.priorityLabelText,
                                  { color: priorityColor },
                                ]}
                              >
                                {systemLabel(t.priority || 'MEDIUM')}
                              </Text>
                            </View>

                            {/* Circular Avatar with Initials or + Nhận việc */}
                            {assignee ? (
                              <View
                                style={[
                                  styles.avatarCircle,
                                  {
                                    backgroundColor: isMyTask
                                      ? '#2563EB'
                                      : assignee.color,
                                  },
                                ]}
                              >
                                <Text style={styles.avatarInitials}>
                                  {assignee.initials}
                                </Text>
                              </View>
                            ) : onSelfAssign && currentUserId ? (
                              <TouchableOpacity
                                style={styles.claimMiniBtn}
                                onPress={() => onSelfAssign(t)}
                              >
                                <UserPlus size={10} color="#2563EB" />
                                <Text style={styles.claimMiniText}>
                                  {tr("+ Nhận việc")}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>

                        {/* 4. Role-based Review Approval Actions in CHỜ DUYỆT */}
                        {st === 'IN_REVIEW' && isPM && (
                          <View style={styles.quickApproveRow}>
                            <TouchableOpacity
                              style={[
                                styles.quickApproveBtn,
                                { backgroundColor: '#16A34A' },
                              ]}
                              onPress={() => triggerStatusTransition(t, 'DONE')}
                            >
                              <Text style={styles.quickApproveText}>
                                ✓ {tr("Duyệt Done")}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.quickRevertBtn}
                              onPress={() =>
                                triggerStatusTransition(
                                  t,
                                  'IN_PROGRESS',
                                  true
                                )
                              }
                            >
                              <RotateCcw size={11} color="#D97706" />
                              <Text style={styles.quickRevertText}>
                                {tr("Yêu cầu sửa")}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {st === 'IN_REVIEW' && isAssistant && (
                          <View style={styles.quickApproveRow}>
                            <TouchableOpacity
                              style={[
                                styles.quickApproveBtn,
                                {
                                  backgroundColor: parsed.assistantVerified
                                    ? '#DCFCE7'
                                    : '#16A34A',
                                },
                              ]}
                              onPress={() =>
                                onAssistantVerify &&
                                onAssistantVerify(
                                  t,
                                  !parsed.assistantVerified
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.quickApproveText,
                                  {
                                    color: parsed.assistantVerified
                                      ? '#15803D'
                                      : '#FFFFFF',
                                  },
                                ]}
                              >
                                {parsed.assistantVerified
                                  ? `✓ ${tr("Đã đạt")}`
                                  : tr("Đánh dấu Đạt")}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.quickRevertBtn}
                              onPress={() =>
                                triggerStatusTransition(
                                  t,
                                  'IN_PROGRESS',
                                  true
                                )
                              }
                            >
                              <RotateCcw size={11} color="#D97706" />
                              <Text style={styles.quickRevertText}>
                                {tr("Yêu cầu sửa")}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}

                {/* "+ Tạo" button at the bottom of the column */}
                {onAddTask && col.key !== 'DONE' && (
                  <TouchableOpacity
                    style={styles.columnCreateBtn}
                    onPress={() => onAddTask(col.key)}
                    activeOpacity={0.75}
                  >
                    <Plus size={16} color={colors.subText} />
                    <Text style={styles.columnCreateBtnText}>
                      {tr("Tạo Task")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 4 Column Pagination Dots at the bottom */}
      <View style={styles.dotsRow}>
        {COLUMNS.map((col, idx) => (
          <View
            key={col.key}
            style={[
              styles.dot,
              idx === activeColIndex && {
                backgroundColor: colors.primary,
                width: 18,
              },
            ]}
          />
        ))}
      </View>

      {/* =================================================================== */}
      {/* FULLSCREEN DRAG & DROP OVERLAY WHEN LONG-PRESSING A CARD */}
      {/* =================================================================== */}
      {draggingTask && (
        <View
          style={styles.dragOverlay}
          pointerEvents="box-none"
          {...panResponder.panHandlers}
        >
          {/* Top 4-Column Drop Targets Bar */}
          <View style={styles.dropZoneBar}>
            {COLUMNS.map((col) => {
              const isHovered = hoveredStatus === col.key;
              return (
                <View
                  key={`drop-${col.key}`}
                  style={[
                    styles.dropZoneTarget,
                    isHovered && {
                      borderColor: col.color,
                      backgroundColor: isDark
                        ? col.pillBgDark
                        : col.pillBgLight,
                      transform: [{ scale: 1.04 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dropZoneTargetText,
                      isHovered && { color: col.color, fontWeight: '800' },
                    ]}
                    numberOfLines={1}
                  >
                    {tr(col.title)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Floating Dragged Card Following Finger */}
          <Animated.View
            style={[
              styles.floatingCard,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            <Text style={styles.taskTitle} numberOfLines={2}>
              {draggingTask.title}
            </Text>
            <View style={styles.cardBottomRow}>
              <Text style={styles.taskCodeText}>TASK-{draggingTask.id}</Text>
              <Text style={styles.floatingTargetStatus}>
                → {systemLabel(hoveredStatus || draggingTask.status)}
              </Text>
            </View>
          </Animated.View>
        </View>
      )}

      {/* =================================================================== */}
      {/* BOTTOM SHEET MODAL: LỌC THEO SPRINT (WITH SEARCH & RADIO BUTTONS) */}
      {/* =================================================================== */}
      <Modal
        visible={sprintModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSprintModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSprintModalVisible(false)}
        >
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                style={[
                  styles.sheetCloseCircle,
                  { backgroundColor: isDark ? '#22272B' : '#F1F5F9' },
                ]}
                onPress={() => setSprintModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {tr("Lọc theo sprint")}
              </Text>
              <View style={{ width: 34 }} />
            </View>

            {/* Search Sprint Input */}
            <View
              style={[
                styles.sheetSearchRow,
                {
                  backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Search size={15} color={colors.subText} />
              <TextInput
                style={[styles.sheetSearchInput, { color: colors.text }]}
                placeholder={tr("Tìm kiếm Sprint...")}
                placeholderTextColor={colors.mutedText}
                value={sprintSearchQuery}
                onChangeText={setSprintSearchQuery}
              />
            </View>

            {/* Radio List of Sprints + Backlog */}
            <View
              style={[
                styles.sheetListContainer,
                {
                  backgroundColor: isDark ? '#161A1D' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              {searchedSprints.map((sp, idx) => {
                const isSelected = effectiveSprintId === sp.id;
                return (
                  <TouchableOpacity
                    key={sp.id}
                    style={[
                      styles.sheetRadioRow,
                      idx < searchedSprints.length && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.divider,
                      },
                    ]}
                    onPress={() => handleChooseSprint(sp.id)}
                  >
                    <View style={styles.sheetRadioLeft}>
                      <Text
                        style={[styles.sheetRadioLabel, { color: colors.text }]}
                      >
                        {sp.name}
                      </Text>
                      {sp.status === 'ACTIVE' && (
                        <View style={styles.activeSprintPill}>
                          <Text style={styles.activeSprintPillText}>
                            {systemLabel('ACTIVE')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected
                            ? colors.primary
                            : colors.subText,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Backlog Option */}
              <TouchableOpacity
                style={styles.sheetRadioRow}
                onPress={() => handleChooseSprint('BACKLOG')}
              >
                <Text style={[styles.sheetRadioLabel, { color: colors.text }]}>
                  {tr("Backlog")}
                </Text>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor:
                        effectiveSprintId === 'BACKLOG'
                          ? colors.primary
                          : colors.subText,
                    },
                  ]}
                >
                  {effectiveSprintId === 'BACKLOG' && (
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* =================================================================== */}
      {/* BOTTOM SHEET MODAL: LỌC THEO NGƯỜI ĐƯỢC CHỈ ĐỊNH */}
      {/* =================================================================== */}
      <Modal
        visible={assigneeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssigneeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setAssigneeModalVisible(false)}
        >
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                style={[
                  styles.sheetCloseCircle,
                  { backgroundColor: isDark ? '#22272B' : '#F1F5F9' },
                ]}
                onPress={() => setAssigneeModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {tr("Người được chỉ định")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAssigneeFilter('ALL');
                  setAssigneeModalVisible(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.subText,
                  }}
                >
                  {tr("Bỏ chọn")}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.sheetListContainer,
                {
                  backgroundColor: isDark ? '#161A1D' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              {[
                { key: 'ALL' as const, label: tr("Tất cả thành viên") },
                { key: 'MINE' as const, label: `👤 ${tr("Việc của tôi")}` },
                { key: 'UNASSIGNED' as const, label: tr("Chưa giao") },
              ].map((opt) => {
                const isSelected = assigneeFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sheetRadioRow,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.divider,
                      },
                    ]}
                    onPress={() => {
                      setAssigneeFilter(opt.key);
                      setAssigneeModalVisible(false);
                    }}
                  >
                    <Text
                      style={[styles.sheetRadioLabel, { color: colors.text }]}
                    >
                      {opt.label}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected
                            ? colors.primary
                            : colors.subText,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {members.map((m, idx) => {
                const mName = m.fullName || m.displayName || m.username;
                const isSelected = assigneeFilter === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.sheetRadioRow,
                      idx < members.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.divider,
                      },
                    ]}
                    onPress={() => {
                      setAssigneeFilter(m.id);
                      setAssigneeModalVisible(false);
                    }}
                  >
                    <Text
                      style={[styles.sheetRadioLabel, { color: colors.text }]}
                    >
                      {mName}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected
                            ? colors.primary
                            : colors.subText,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    boardContainer: {
      gap: 10,
      paddingBottom: 16,
    },
    filterBarWrap: {
      gap: 8,
    },
    filterStripScroll: {
      gap: 8,
      alignItems: 'center',
      paddingVertical: 2,
    },
    searchIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropdownPillText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    searchBoxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      height: 40,
    },
    searchBoxInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
    },
    permBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#EF444418',
      borderColor: '#EF4444',
      borderWidth: 1,
      padding: 10,
      borderRadius: 10,
    },
    permBannerText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },
    columnsScrollContent: {
      gap: 12,
      paddingRight: 16,
      alignItems: 'flex-start',
    },
    column: {
      width: COLUMN_WIDTH,
      backgroundColor: isDark ? '#161A1D' : '#EBECF0',
      borderRadius: 14,
      padding: 10,
      minHeight: 420,
    },
    columnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      paddingVertical: 8,
      marginBottom: 4,
    },
    columnTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    columnTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    countBadge: {
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    cardsList: {
      gap: 8,
    },
    emptyColumn: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
    },
    emptyColumnText: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
    },
    taskCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    taskCardHidden: {
      opacity: 0.25,
      borderStyle: 'dashed',
    },
    taskTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    mineTagPill: {
      backgroundColor: '#2563EB',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    mineTagText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    verifiedTagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    verifiedTagText: {
      color: '#15803D',
      fontSize: 10,
      fontWeight: '800',
    },
    cardBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    cardBottomLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    taskCodeText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },
    cardBottomRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priorityInlineWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    priorityBarsWrap: {
      gap: 2.5,
      justifyContent: 'center',
    },
    priorityBar: {
      width: 11,
      height: 2,
      borderRadius: 1,
    },
    priorityLabelText: {
      fontSize: 10,
      fontWeight: '700',
    },
    avatarCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    claimMiniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? '#1D3B6A' : '#DBEAFE',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    claimMiniText: {
      color: '#2563EB',
      fontSize: 10,
      fontWeight: '800',
    },
    quickApproveRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    quickApproveBtn: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickApproveText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    quickRevertBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#3B2314' : '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
    },
    quickRevertText: {
      color: '#D97706',
      fontSize: 11,
      fontWeight: '800',
    },
    columnCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      marginTop: 2,
    },
    columnCreateBtnText: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '700',
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingTop: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.cardBorder,
    },
    dragOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    dropZoneBar: {
      position: 'absolute',
      top: 6,
      left: 4,
      right: 4,
      flexDirection: 'row',
      gap: 6,
      backgroundColor: colors.headerBg,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 6,
      elevation: 8,
    },
    dropZoneTarget: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: colors.cardBg,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    dropZoneTargetText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '700',
    },
    floatingCard: {
      position: 'absolute',
      width: 230,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 12,
      gap: 6,
    },
    floatingTargetStatus: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      gap: 14,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetCloseCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    sheetSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      height: 40,
    },
    sheetSearchInput: {
      flex: 1,
      fontSize: 13,
    },
    sheetListContainer: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    sheetRadioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    sheetRadioLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sheetRadioLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    activeSprintPill: {
      backgroundColor: '#DBEAFE',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    activeSprintPillText: {
      color: '#2563EB',
      fontSize: 10,
      fontWeight: '800',
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
  });
