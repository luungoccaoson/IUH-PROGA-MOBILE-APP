import { systemLabel, translate as tr, useTranslation as useSystemTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  List,
  LayoutGrid,
  CheckCircle2,
  Layers,
  UserPlus,
  ShieldCheck,
  Building,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { userService } from '../../services/user.service';
import { Task, Space, User, TaskStatus, TaskPriority } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { CreateTaskModal } from '../../components/CreateTaskModal';
import { KanbanBoard } from '../../components/KanbanBoard';
import { TaskDetailModal } from '../../components/TaskDetailModal';
import { StatusConfirmModal } from '../../components/StatusConfirmModal';
import {
  normalizeTaskStatus,
  parseTaskDescriptionWithChecklist,
  serializeTaskDescriptionWithChecklist,
} from '../../utils/taskRules';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [tasksWithSpace, setTasksWithSpace] = useState<
    { task: Task; spaceName: string; workspaceName: string; sprintName?: string }[]
  >([]);
  const [allSpaces, setAllSpaces] = useState<Space[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'MINE' | 'UNASSIGNED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isKanbanDragging, setIsKanbanDragging] = useState<boolean>(false);

  const [confirmModalState, setConfirmModalState] = useState<{
    visible: boolean;
    task: Task | null;
    targetStatus: TaskStatus | null;
    isRevert: boolean;
  }>({
    visible: false,
    task: null,
    targetStatus: null,
    isRevert: false,
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [taskList, spacesData, usersList] = await Promise.all([
        workspaceService.getAllUserTasks(user.id),
        workspaceService.getAllUserSpaces(user.id),
        userService.getAllUsers().catch(() => []),
      ]);

      const userMap = new Map<number, string>();
      (usersList || []).forEach((u) =>
        userMap.set(u.id, u.fullName || u.displayName || u.username)
      );
      if (user?.id) {
        userMap.set(
          user.id,
          user.fullName || user.displayName || user.username
        );
      }

      const enriched = taskList.map((item) => {
        const oid = item.task.ownerId || item.task.assignee?.id;
        return {
          ...item,
          task: {
            ...item.task,
            ownerName: oid ? userMap.get(oid) || item.task.ownerName : undefined,
          },
        };
      });

      setTasksWithSpace(enriched);
      const flatSpaces = spacesData.flatMap((item) => item.spaces);
      setAllSpaces(flatSpaces);
      setAllUsers(usersList || []);
      setSelectedTask((prev) =>
        prev
          ? enriched.find((i) => i.task.id === prev.id)?.task || null
          : null
      );
    } catch (err) {
      console.log('Error loading tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getInitials = (name?: string) => {
    const clean = (name || 'U').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const handleRequestStatusChange = (
    task: Task,
    targetStatus: TaskStatus,
    isRevert = false
  ) => {
    setConfirmModalState({
      visible: true,
      task,
      targetStatus,
      isRevert:
        isRevert ||
        (normalizeTaskStatus(task.status) === 'IN_REVIEW' &&
          normalizeTaskStatus(targetStatus) === 'IN_PROGRESS'),
    });
  };

  const handleExecuteConfirmedStatusChange = async (reason?: string) => {
    const { task, targetStatus, isRevert } = confirmModalState;
    if (!task || !targetStatus) return;

    const parsed = parseTaskDescriptionWithChecklist(task.description);
    let updatedBase = parsed.baseDescription;
    let nextVerified = parsed.assistantVerified;

    if (isRevert) {
      nextVerified = false;
      if (reason) {
        const note = `\n\n> ⚠️ Yêu cầu chỉnh sửa: ${reason}`;
        updatedBase = updatedBase ? `${updatedBase}${note}` : note.trim();
      }
    }

    const updatedDescription = serializeTaskDescriptionWithChecklist(
      updatedBase,
      parsed.checklist,
      parsed.aiRationale,
      {
        assistantVerified: nextVerified,
        createdByUserId: parsed.createdByUserId,
      }
    );

    await workspaceService.updateTask(task.id, {
      spaceId: task.spaceId,
      sprintId: task.sprintId ?? null,
      title: task.title,
      description: updatedDescription,
      status: targetStatus,
      priority: task.priority,
      ownerId: task.ownerId ?? null,
      startDate: task.startDate,
      dueDate: task.dueDate,
    });
    await loadData();
  };

  const handleSelfAssign = async (task: Task) => {
    if (!user?.id) return;
    try {
      await workspaceService.updateTask(task.id, {
        spaceId: task.spaceId,
        sprintId: task.sprintId ?? null,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        ownerId: user.id,
        startDate: task.startDate,
        dueDate: task.dueDate,
      });
      await loadData();
    } catch {
      Alert.alert(tr("Lỗi"), tr("Không thể nhận công việc này."));
    }
  };

  const handleUpdateTaskFull = async (
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
  ) => {
    await workspaceService.updateTask(taskId, data);
    await loadData();
  };

  const handleDeleteTask = async (taskId: number) => {
    await workspaceService.deleteTask(taskId);
    await loadData();
  };

  const handleOpenCreateModal = () => {
    if (allSpaces.length === 0) {
      Alert.alert(
        tr("Chưa có Space"),
        tr("Vui lòng tạo một Không gian (Space) trước khi tạo nhiệm vụ mới."),
        [
          { text: tr("Hủy"), style: 'cancel' },
          {
            text: tr("Tạo Không gian"),
            onPress: () => router.push('/(tabs)/spaces'),
          },
        ]
      );
      return;
    }
    setCreateModalVisible(true);
  };

  const handleCreateTask = async (data: any) => {
    if (allSpaces.length === 0) return;
    const targetSpaceId = allSpaces[0].id;
    await workspaceService.createTask({
      spaceId: targetSpaceId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
    });
    await loadData();
  };

  const totalCount = tasksWithSpace.length;
  const myCount = tasksWithSpace.filter(
    ({ task }) =>
      user?.id &&
      (task.ownerId === user.id || task.assignee?.id === user.id)
  ).length;
  const unassignedCount = tasksWithSpace.filter(
    ({ task }) => !task.ownerId && !task.assignee?.id
  ).length;
  const todoCount = tasksWithSpace.filter(
    ({ task }) => normalizeTaskStatus(task.status) === 'TODO'
  ).length;
  const inProgressCount = tasksWithSpace.filter(
    ({ task }) => normalizeTaskStatus(task.status) === 'IN_PROGRESS'
  ).length;
  const inReviewCount = tasksWithSpace.filter(
    ({ task }) => normalizeTaskStatus(task.status) === 'IN_REVIEW'
  ).length;
  const doneCount = tasksWithSpace.filter(
    ({ task }) => normalizeTaskStatus(task.status) === 'DONE'
  ).length;

  const filteredTasks = useMemo(() => {
    return tasksWithSpace.filter(({ task }) => {
      const st = normalizeTaskStatus(task.status);
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      const oid = task.ownerId || task.assignee?.id;
      if (ownerFilter === 'MINE') {
        if (!user?.id || oid !== user.id) return false;
      } else if (ownerFilter === 'UNASSIGNED') {
        if (oid) return false;
      }
      return true;
    });
  }, [tasksWithSpace, statusFilter, ownerFilter, user?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader
          title={tr("Tất cả công việc")}
          rightActions={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.viewModeGroup}>
                <TouchableOpacity
                  style={[
                    styles.viewModeBtn,
                    viewMode === 'list' && styles.viewModeBtnActive,
                  ]}
                  onPress={() => setViewMode('list')}
                  activeOpacity={0.8}
                >
                  <List
                    size={16}
                    color={viewMode === 'list' ? colors.primary : colors.subText}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.viewModeBtn,
                    viewMode === 'board' && styles.viewModeBtnActive,
                  ]}
                  onPress={() => setViewMode('board')}
                  activeOpacity={0.8}
                >
                  <LayoutGrid
                    size={16}
                    color={viewMode === 'board' ? colors.primary : colors.subText}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={handleOpenCreateModal}
              >
                <Plus size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Top Filters Bar */}
        <View style={styles.filtersContainer}>
          {/* Owner Filter Segment */}
          <View style={styles.ownerFilterRow}>
            <TouchableOpacity
              style={[
                styles.ownerFilterBtn,
                ownerFilter === 'ALL' && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setOwnerFilter('ALL')}
            >
              <Text
                style={[
                  styles.ownerFilterText,
                  {
                    color: ownerFilter === 'ALL' ? '#FFFFFF' : colors.subText,
                  },
                ]}
              >
                {tr("Tất cả (")}{totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ownerFilterBtn,
                ownerFilter === 'MINE' && {
                  backgroundColor: '#3B82F6',
                  borderColor: '#3B82F6',
                },
              ]}
              onPress={() => setOwnerFilter('MINE')}
            >
              <Text
                style={[
                  styles.ownerFilterText,
                  {
                    color: ownerFilter === 'MINE' ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                👤 {tr("Của tôi (")}{myCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ownerFilterBtn,
                ownerFilter === 'UNASSIGNED' && {
                  backgroundColor: '#F59E0B',
                  borderColor: '#F59E0B',
                },
              ]}
              onPress={() => setOwnerFilter('UNASSIGNED')}
            >
              <Text
                style={[
                  styles.ownerFilterText,
                  {
                    color:
                      ownerFilter === 'UNASSIGNED'
                        ? '#FFFFFF'
                        : colors.subText,
                  },
                ]}
              >
                {tr("Chưa giao (")}{unassignedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterScroll}
          >
            {[
              { key: 'ALL', label: tr("Mọi trạng thái") },
              { key: 'TODO', label: `${tr("Cần làm")} (${todoCount})` },
              { key: 'IN_PROGRESS', label: `${tr("Đang làm")} (${inProgressCount})` },
              { key: 'IN_REVIEW', label: `${tr("Chờ duyệt")} (${inReviewCount})` },
              { key: 'DONE', label: `${tr("Đã xong")} (${doneCount})` },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.statusPill,
                  statusFilter === f.key && styles.statusPillActive,
                ]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    statusFilter === f.key && styles.statusPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>
              {tr("Đang tải danh sách công việc...")}
            </Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <CheckCircle2 size={36} color="#579DFF" />
            </View>
            <Text style={styles.emptyTitle}>{tr("Chưa có công việc nào")}</Text>
            <Text style={styles.emptySubtitle}>
              {allSpaces.length === 0
                ? tr("Hãy tạo Không gian trước để bắt đầu thêm và theo dõi công việc.")
                : tr("Bấm nút \"+\" ở góc phải trên để tạo nhiệm vụ đầu tiên.")}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isKanbanDragging}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#579DFF"
                colors={['#579DFF']}
              />
            }
          >
            {viewMode === 'board' ? (
              <KanbanBoard
                tasks={filteredTasks.map((i) => i.task)}
                members={allUsers}
                currentUserId={user?.id}
                userRole="PM"
                onUpdateStatus={async (taskId, newStatus) => {
                  const found = filteredTasks.find((i) => i.task.id === taskId);
                  if (found) handleRequestStatusChange(found.task, newStatus);
                }}
                onRequestStatusChange={handleRequestStatusChange}
                onSelectTask={(t) => setSelectedTask(t)}
                onSelfAssign={handleSelfAssign}
                onDragStateChange={setIsKanbanDragging}
              />
            ) : (
              filteredTasks.map(({ task, spaceName, sprintName }) => {
                const st = normalizeTaskStatus(task.status);
                const isDone = st === 'DONE';
                const oid = task.ownerId || task.assignee?.id;
                const isMyTask = Boolean(user?.id && oid === user.id);
                const assigneeName =
                  task.ownerName ||
                  task.assignee?.fullName ||
                  allUsers.find((u) => u.id === oid)?.fullName;
                const parsed = parseTaskDescriptionWithChecklist(
                  task.description
                );

                const stBadge =
                  st === 'DONE'
                    ? { bg: '#10B98122', text: '#10B981' }
                    : st === 'IN_REVIEW'
                    ? { bg: '#F59E0B22', text: '#F59E0B' }
                    : st === 'IN_PROGRESS'
                    ? { bg: '#3B82F622', text: '#3B82F6' }
                    : {
                        bg: isDark ? '#22272B' : '#F3F4F6',
                        text: colors.subText,
                      };

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.issueCard,
                      isMyTask && {
                        borderColor: '#3B82F6',
                        borderLeftWidth: 4,
                        borderLeftColor: '#3B82F6',
                        backgroundColor: isDark ? '#172234' : '#F8FAFF',
                      },
                    ]}
                    activeOpacity={0.82}
                    onPress={() => setSelectedTask(task)}
                  >
                    {/* Top Row: Code + My Task Badge + Status Badge */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.codeGroup}>
                        <Text
                          style={[
                            styles.taskCode,
                            isDone && styles.strikeThroughText,
                          ]}
                        >
                          TASK-{task.id}
                        </Text>
                        {isMyTask && (
                          <View style={styles.myTaskTag}>
                            <Text style={styles.myTaskTagText}>
                              👤 {tr("CỦA TÔI")}
                            </Text>
                          </View>
                        )}
                        {parsed.assistantVerified && (
                          <View style={styles.verifiedTag}>
                            <ShieldCheck size={11} color="#10B981" />
                            <Text style={styles.verifiedTagText}>
                              {tr("Đạt yêu cầu")}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: stBadge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: stBadge.text },
                          ]}
                        >
                          {systemLabel(st)}
                        </Text>
                      </View>
                    </View>

                    {/* Title (Bold if isMyTask, NOT struck through when DONE!) */}
                    <Text
                      style={[
                        styles.issueTitle,
                        isMyTask && { fontWeight: '800', fontSize: 15 },
                      ]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>

                    {/* Space & Sprint Meta Row */}
                    <View style={styles.metaChipsRow}>
                      <TouchableOpacity
                        style={[
                          styles.metaChip,
                          { backgroundColor: isDark ? '#22272B' : '#F3F4F6' },
                        ]}
                        onPress={() => router.push(`/spaces/${task.spaceId}`)}
                      >
                        <Building size={11} color={colors.primary} />
                        <Text
                          style={[styles.metaChipText, { color: colors.text }]}
                        >
                          {spaceName}
                        </Text>
                      </TouchableOpacity>

                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: isDark ? '#22272B' : '#F3F4F6' },
                        ]}
                      >
                        <Layers size={11} color="#8B5CF6" />
                        <Text
                          style={[
                            styles.metaChipText,
                            { color: colors.subText },
                          ]}
                        >
                          {sprintName || task.sprintName || tr("Backlog")}
                        </Text>
                      </View>
                    </View>

                    {/* Footer: Assignee + Quick Status Action */}
                    <View style={styles.cardFooterRow}>
                      {assigneeName ? (
                        <View style={styles.assigneeChip}>
                          <View
                            style={[
                              styles.miniAvatar,
                              {
                                backgroundColor: isMyTask
                                  ? '#3B82F6'
                                  : '#5E4DB2',
                              },
                            ]}
                          >
                            <Text style={styles.miniAvatarText}>
                              {getInitials(assigneeName)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.assigneeName,
                              {
                                color: isMyTask ? '#3B82F6' : colors.text,
                                fontWeight: isMyTask ? '800' : '600',
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {assigneeName}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.unassignedRow}>
                          <Text style={styles.unassignedText}>
                            {tr("Chưa giao")}
                          </Text>
                          <TouchableOpacity
                            style={styles.claimBtn}
                            onPress={() => handleSelfAssign(task)}
                          >
                            <UserPlus size={11} color="#FFFFFF" />
                            <Text style={styles.claimBtnText}>
                              {tr("+ Nhận việc")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: colors.primary,
                        }}
                      >
                        {tr("Chi tiết →")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Status Transition Confirmation Modal */}
        <StatusConfirmModal
          visible={confirmModalState.visible}
          task={confirmModalState.task}
          targetStatus={confirmModalState.targetStatus}
          isRevertWithReason={confirmModalState.isRevert}
          onClose={() =>
            setConfirmModalState((prev) => ({ ...prev, visible: false }))
          }
          onConfirm={handleExecuteConfirmedStatusChange}
        />

        {/* Task Detail Modal */}
        <TaskDetailModal
          visible={Boolean(selectedTask)}
          task={selectedTask}
          members={allUsers}
          currentUserId={user?.id}
          userRole="PM"
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTaskFull}
          onDeleteTask={handleDeleteTask}
        />

        <CreateTaskModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSubmit={handleCreateTask}
        />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    iconBtn: {
      padding: 4,
    },
    viewModeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 2,
    },
    viewModeBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    viewModeBtnActive: {
      backgroundColor: colors.primaryBg,
    },
    filtersContainer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
      gap: 10,
    },
    ownerFilterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    ownerFilterBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    ownerFilterText: {
      fontSize: 11,
      fontWeight: '800',
    },
    statusFilterScroll: {
      gap: 8,
      paddingBottom: 4,
    },
    statusPill: {
      backgroundColor: colors.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statusPillActive: {
      backgroundColor: colors.primaryBg,
      borderColor: colors.primary,
    },
    statusPillText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },
    statusPillTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    listContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 6,
    },
    issueCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    codeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      flex: 1,
    },
    taskCode: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '800',
      fontFamily: 'monospace',
    },
    myTaskTag: {
      backgroundColor: '#3B82F6',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    myTaskTagText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    verifiedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#10B98120',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    verifiedTagText: {
      color: '#10B981',
      fontSize: 9,
      fontWeight: '800',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    issueTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    strikeThroughText: {
      textDecorationLine: 'line-through',
      color: colors.subText,
    },
    metaChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    metaChipText: {
      fontSize: 11,
      fontWeight: '700',
    },
    cardFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    assigneeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    miniAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniAvatarText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    assigneeName: {
      fontSize: 12,
      maxWidth: 150,
    },
    unassignedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    unassignedText: {
      color: colors.mutedText,
      fontSize: 11,
      fontStyle: 'italic',
    },
    claimBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#3B82F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    claimBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 10,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptySubtitle: {
      color: colors.subText,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
