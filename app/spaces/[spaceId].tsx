import { systemLabel, translate as tr, useTranslation as useSystemTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Settings,
  Plus,
  ListTodo,
  KanbanSquare,
  BarChart2,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  SquareCheck,
  Building,
  Crown,
  Shield,
  UserPlus,
  Mail,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { userService } from '../../services/user.service';
import { Space, Task, TaskStatus, Workspace } from '../../types';
import { CreateTaskModal } from '../../components/CreateTaskModal';
import { SpaceModal } from '../../components/SpaceModal';
import { AddSpaceMemberModal } from '../../components/AddSpaceMemberModal';
import { KanbanBoard } from '../../components/KanbanBoard';
import { recentSpacesService } from '../../services/recentSpaces.service';
import { getProgressColor } from '../../utils/progress';

type SubTabType = 'overview' | 'tasks' | 'kanban' | 'members';

export interface SpaceMemberDetail {
  id: number;
  username: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  roleId: number;
  roleName: string;
  status: string;
  joinedAt?: string;
  assignedTasksCount: number;
  completedTasksCount: number;
  isOwner: boolean;
}

export default function SpaceDetailScreen() {
  const { spaceId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuthStore();
  const idNum = parseInt(spaceId as string, 10);

  const [activeTab, setActiveTab] = useState<SubTabType>('overview');
  const [space, setSpace] = useState<Space | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<SpaceMemberDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [createTaskVisible, setCreateTaskVisible] = useState(false);
  const [editSpaceVisible, setEditSpaceVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);

  const getInitials = (name?: string, email?: string) => {
    const text = name || email || 'User';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const loadData = useCallback(async () => {
    if (!idNum) return;
    try {
      const [spaceData, taskList] = await Promise.all([
        workspaceService.getSpaceById(idNum).catch(async () => {
          // fallback search in spaces
          if (!user?.id) return null;
          const userSpaces = await workspaceService.getAllUserSpaces(user.id);
          for (const item of userSpaces) {
            const found = item.spaces.find((s) => s.id === idNum);
            if (found) return found;
          }
          return null;
        }),
        workspaceService.getTasksBySpace(idNum).catch(() => []),
      ]);

      let wsData: Workspace | null = null;
      let rawSpaceMembers: any[] = [];
      let rawWsMembers: any[] = [];

      if (spaceData) {
        setSpace(spaceData);
        recentSpacesService.addRecentSpaceId(idNum);
        if (spaceData.workspaceId) {
          wsData = await workspaceService.getWorkspaceById(spaceData.workspaceId).catch(() => null);
          setWorkspace(wsData);
          rawWsMembers = await workspaceService.getWorkspaceMembers(spaceData.workspaceId).catch(() => []);
        }
        rawSpaceMembers = await workspaceService.getSpaceMembers(idNum).catch(() => []);
      }

      const rawMembers = rawSpaceMembers.length > 0 ? rawSpaceMembers : rawWsMembers;

      const memberMetaMap = new Map<number, { roleId: number; status: string; joinedAt?: string }>();

      (rawMembers || []).forEach((m: any) => {
        const uid = m.id?.userId ?? m.userId ?? (typeof m.id === 'number' ? m.id : null);
        if (uid) {
          memberMetaMap.set(uid, {
            roleId: m.roleId ?? 3,
            status: m.status || 'ACCEPTED',
            joinedAt: m.joinedAt,
          });
        }
      });

      // Always ensure Workspace Owner is included
      if (wsData?.ownerId && !memberMetaMap.has(wsData.ownerId)) {
        memberMetaMap.set(wsData.ownerId, {
          roleId: 1,
          status: 'ACCEPTED',
        });
      }

      // Always ensure current user is included if in space
      if (user?.id && !memberMetaMap.has(user.id)) {
        memberMetaMap.set(user.id, {
          roleId: wsData?.ownerId === user.id ? 1 : 3,
          status: 'ACCEPTED',
        });
      }

      const userIds = Array.from(memberMetaMap.keys());

      const userProfiles = await Promise.all(
        userIds.map(async (uid) => {
          if (user && user.id === uid) return user;
          try {
            return await userService.getUserById(uid);
          } catch {
            return null;
          }
        })
      );

      const parsedMembers: SpaceMemberDetail[] = userIds.map((uid, idx) => {
        const profile = userProfiles[idx];
        const meta = memberMetaMap.get(uid);
        const isOwner = wsData?.ownerId === uid || meta?.roleId === 1;

        const assignedTasks = taskList.filter((t: any) => t.assigneeId === uid || t.ownerId === uid);
        const completedTasks = assignedTasks.filter((t) => t.status === 'DONE');

        const fullName = profile?.fullName || profile?.displayName || profile?.username || '';
        const username = profile?.username || `user_${uid}`;
        const email = profile?.email || '';
        const avatarUrl = profile?.avatarUrl;

        let roleName = 'MEMBER';
        if (isOwner) {
          roleName = 'Owner';
        } else if (meta?.roleId === 2) {
          roleName = 'Project Manager';
        }

        return {
          id: uid,
          username,
          fullName,
          email,
          avatarUrl,
          roleId: meta?.roleId || (isOwner ? 1 : 3),
          roleName,
          status: meta?.status || 'ACCEPTED',
          joinedAt: meta?.joinedAt,
          assignedTasksCount: assignedTasks.length,
          completedTasksCount: completedTasks.length,
          isOwner,
        };
      });

      setMembers(parsedMembers);
      setTasks(taskList);
    } catch (err) {
      console.log('Error loading space detail:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [idNum, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await workspaceService.updateTaskStatus(taskId, newStatus);
    } catch (e) {
      Alert.alert(tr("Lỗi"), tr("Không thể cập nhật trạng thái nhiệm vụ."));
      loadData();
    }
  };

  const handleToggleTaskStatus = async (taskId: number, currentStatus: TaskStatus) => {
    let nextStatus: TaskStatus = 'TODO';
    if (currentStatus === 'TODO') {
      nextStatus = 'IN_PROGRESS';
    } else if (currentStatus === 'IN_PROGRESS') {
      nextStatus = 'DONE';
    } else {
      nextStatus = 'TODO';
    }
    await handleUpdateTaskStatus(taskId, nextStatus);
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority: any;
    status: TaskStatus;
    dueDate?: string;
  }) => {
    const newTask = await workspaceService.createTask({
      spaceId: idNum,
      ...data,
    });
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleEditSpace = async (name: string, startDate?: string, endDate?: string) => {
    if (!space) return;
    const updated = await workspaceService.updateSpace(space.id, {
      workspaceId: space.workspaceId,
      name,
      startDate,
      endDate,
    });
    setSpace(updated);
  };

  const handleDeleteSpace = async () => {
    if (!space) return;
    Alert.alert(tr("Xác nhận xóa"), tr("Bạn có chắc muốn xóa không gian \"{0}\"?", { 0: space.name }), [
      { text: tr("Hủy"), style: 'cancel' },
      {
        text: tr("Xóa"),
        style: 'destructive',
        onPress: async () => {
          try {
            await workspaceService.deleteSpace(space.id);
            router.back();
          } catch (e) {
            Alert.alert(tr("Lỗi"), tr("Không thể xóa Không gian này."));
          }
        },
      },
    ]);
  };

  // Task metrics calculation (Only TODO, IN_PROGRESS, DONE)
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
  const percentComplete = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const progressColor = getProgressColor(percentComplete);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{tr("Đang tải chi tiết Không gian...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {space?.name || `Space #${idNum}`}
            </Text>
            {workspace && (
              <Text style={styles.headerSub} numberOfLines={1}>
                {workspace.name}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setEditSpaceVisible(true)}
            activeOpacity={0.7}
          >
            <Settings size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Sub-tabs Bar */}
        <View style={styles.subTabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subTabBarContainer}
          >
            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'overview' && styles.subTabActive]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.8}
            >
              <BarChart2
                size={16}
                color={activeTab === 'overview' ? '#579DFF' : '#8C9BAB'}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'overview' && styles.subTabTextActive,
                ]}
              >
                {tr("Tổng quan")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'tasks' && styles.subTabActive]}
              onPress={() => setActiveTab('tasks')}
              activeOpacity={0.8}
            >
              <ListTodo
                size={16}
                color={activeTab === 'tasks' ? '#579DFF' : '#8C9BAB'}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'tasks' && styles.subTabTextActive,
                ]}
              >
                {tr("Công việc")}</Text>
              <View style={[styles.tabBadge, activeTab === 'tasks' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'tasks' && styles.tabBadgeTextActive]}>
                  {totalTasks}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'kanban' && styles.subTabActive]}
              onPress={() => setActiveTab('kanban')}
              activeOpacity={0.8}
            >
              <KanbanSquare
                size={16}
                color={activeTab === 'kanban' ? '#579DFF' : '#8C9BAB'}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'kanban' && styles.subTabTextActive,
                ]}
              >
                {tr("Bảng Kanban")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'members' && styles.subTabActive]}
              onPress={() => setActiveTab('members')}
              activeOpacity={0.8}
            >
              <Users
                size={16}
                color={activeTab === 'members' ? '#579DFF' : '#8C9BAB'}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'members' && styles.subTabTextActive,
                ]}
              >
                {tr("Thành viên")}</Text>
              <View style={[styles.tabBadge, activeTab === 'members' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'members' && styles.tabBadgeTextActive]}>
                  {members.length}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* TAB CONTENTS */}
        {activeTab === 'kanban' ? (
          <View style={styles.kanbanTabContainer}>
            <KanbanBoard
              tasks={tasks}
              onUpdateStatus={handleUpdateTaskStatus}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#579DFF"
                colors={['#579DFF']}
              />
            }
          >
          {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
          {activeTab === 'overview' && (
            <View style={styles.tabSection}>
              {/* Progress Card */}
              <View style={styles.cardBox}>
                <View style={styles.progressHeader}>
                  <Text style={styles.cardBoxTitle}>{tr("TIẾN ĐỘ HOÀN THÀNH")}</Text>
                  <Text style={[styles.progressPercentText, { color: progressColor.main }]}>
                    {percentComplete}%
                  </Text>
                </View>

                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${percentComplete}%`, backgroundColor: progressColor.main },
                    ]}
                  />
                </View>

                <Text style={styles.progressSubText}>
                  {tr('Đã hoàn tất {done} trên tổng số {total} nhiệm vụ', { done: doneTasks, total: totalTasks })}</Text>
              </View>

              {/* 3 Metric Cards Grid (TODO, IN_PROGRESS, DONE) */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("CẦN LÀM")}</Text>
                  <Text style={[styles.metricValue, { color: '#8C9BAB' }]}>
                    {todoTasks}
                  </Text>
                  <Text style={styles.metricSub}>{tr("Trạng thái TODO")}</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("ĐANG THỰC HIỆN")}</Text>
                  <Text style={[styles.metricValue, { color: '#579DFF' }]}>
                    {inProgressTasks}
                  </Text>
                  <Text style={styles.metricSub}>{tr("Trạng thái IN PROGRESS")}</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("ĐÃ HOÀN THÀNH")}</Text>
                  <Text style={[styles.metricValue, { color: '#57D9A3' }]}>
                    {doneTasks}
                  </Text>
                  <Text style={styles.metricSub}>{tr("Trạng thái DONE")}</Text>
                </View>
              </View>

              {/* Space Info Card */}
              <View style={styles.cardBox}>
                <Text style={styles.cardBoxTitle}>{tr("THÔNG TIN KHÔNG GIAN")}</Text>

                <View style={styles.infoRow}>
                  <Calendar size={16} color="#8C9BAB" style={{ marginRight: 10 }} />
                  <Text style={styles.infoLabel}>{tr("Thời gian:")}</Text>
                  <Text style={styles.infoValue}>
                    {space?.startDate
                      ? new Date(space.startDate).toLocaleDateString(locale)
                      : tr("Chưa đặt")}{' '}
                    →{' '}
                    {space?.endDate
                      ? new Date(space.endDate).toLocaleDateString(locale)
                      : tr("Không thời hạn")}
                  </Text>
                </View>

                {workspace && (
                  <View style={styles.infoRow}>
                    <Building size={16} color="#8C9BAB" style={{ marginRight: 10 }} />
                    <Text style={styles.infoLabel}>{tr("Workspace:")}</Text>
                    <Text style={styles.infoValue}>{workspace.name}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Clock size={16} color="#8C9BAB" style={{ marginRight: 10 }} />
                  <Text style={styles.infoLabel}>{tr("Khởi tạo ngày:")}</Text>
                  <Text style={styles.infoValue}>
                    {space?.createdAt
                      ? new Date(space.createdAt).toLocaleDateString(locale)
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Quick Action Button */}
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => setCreateTaskVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>{tr("Thêm công việc vào Space")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: CÔNG VIỆC (TASKS LIST) */}
          {activeTab === 'tasks' && (
            <View style={styles.tabSection}>
              {/* Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {[
                  { key: 'ALL', label: tr("Tất cả ({0})", { 0: totalTasks }) },
                  { key: 'TODO', label: tr("Cần làm ({0})", { 0: todoTasks }) },
                  { key: 'IN_PROGRESS', label: tr("Đang làm ({0})", { 0: inProgressTasks }) },
                  { key: 'DONE', label: tr("Đã xong ({0})", { 0: doneTasks }) },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterPill,
                      statusFilter === f.key && styles.filterPillActive,
                    ]}
                    onPress={() => setStatusFilter(f.key)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === f.key && styles.filterPillTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredTasks.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <CheckCircle2 size={36} color="#579DFF" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyCardTitle}>{tr("Không có công việc nào")}</Text>
                  <Text style={styles.emptyCardSub}>
                    {tr("Chưa có nhiệm vụ nào trong mục này. Bấm nút bên dưới để tạo mới.")}</Text>
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => setCreateTaskVisible(true)}
                  >
                    <Plus size={16} color="#579DFF" style={{ marginRight: 4 }} />
                    <Text style={styles.emptyCreateBtnText}>{tr("Thêm task")}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredTasks.map((t) => {
                  const isDone = t.status === 'DONE';
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.taskCard}
                      activeOpacity={0.75}
                      onPress={() => handleToggleTaskStatus(t.id, t.status)}
                    >
                      <TouchableOpacity
                        style={{ marginRight: 12, padding: 2 }}
                        onPress={() => handleToggleTaskStatus(t.id, t.status)}
                      >
                        <SquareCheck
                          size={20}
                          color={isDone ? '#579DFF' : '#8C9BAB'}
                        />
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.taskCardTitle,
                            isDone && styles.strikeThrough,
                          ]}
                          numberOfLines={2}
                        >
                          {t.title}
                        </Text>
                        <Text style={styles.taskCardSub}>
                          #{t.id} • {systemLabel(t.status)} {tr("• Độ ưu tiên:")}{systemLabel(t.priority || 'MEDIUM')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => setCreateTaskVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>{tr("Tạo công việc mới")}</Text>
              </TouchableOpacity>
            </View>
          )}



          {/* TAB 4: THÀNH VIÊN (MEMBERS) */}
          {activeTab === 'members' && (
            <View style={styles.tabSection}>
              <View style={styles.cardBox}>
                <View style={styles.memberHeaderRow}>
                  <Text style={styles.cardBoxTitle}>
                    {tr("DANH SÁCH THÀNH VIÊN (")}{members.length})
                  </Text>
                  {space?.workspaceId ? (
                    <TouchableOpacity
                      style={styles.addMemberBtn}
                      onPress={() => setAddMemberModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <UserPlus size={14} color="#579DFF" />
                      <Text style={styles.addMemberBtnText}>{tr("Thêm")}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {members.length === 0 ? (
                  <View style={styles.emptyMembersWrap}>
                    <Users size={32} color="#8C9BAB" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyCardSub}>
                      {tr("Chưa có thành viên nào trong không gian này.")}</Text>
                  </View>
                ) : (
                  members.map((m, idx) => (
                    <View
                      key={`member-${m.id}-${idx}`}
                      style={[
                        styles.memberRow,
                        idx === members.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={styles.memberAvatarImg} />
                      ) : (
                        <View style={[styles.memberAvatar, m.isOwner && styles.ownerAvatar]}>
                          <Text style={[styles.memberAvatarText, m.isOwner && styles.ownerAvatarText]}>
                            {getInitials(m.fullName, m.email)}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={styles.memberNameLine}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {m.fullName || tr("Thành viên #{0}", { 0: m.id })}
                          </Text>
                          {m.isOwner ? (
                            <View style={styles.ownerBadge}>
                              <Crown size={11} color="#FFAB00" style={{ marginRight: 3 }} />
                              <Text style={styles.ownerBadgeText}>{tr("Owner")}</Text>
                            </View>
                          ) : m.roleId === 2 ? (
                            <View style={styles.pmBadge}>
                              <Shield size={11} color="#579DFF" style={{ marginRight: 3 }} />
                              <Text style={styles.pmBadgeText}>{tr("PM")}</Text>
                            </View>
                          ) : (
                            <View style={styles.memberBadge}>
                              <Text style={styles.memberBadgeText}>{tr("Member")}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {m.email ? m.email : `@${m.username}`}
                        </Text>

                        <View style={styles.memberStatsRow}>
                          <View style={styles.statDot} />
                          <Text style={styles.memberStatsText}>
                            {m.assignedTasksCount > 0
                              ? tr("{0} công việc ({1} hoàn thành)", { 0: m.assignedTasksCount, 1: m.completedTasksCount })
                              : tr("Chưa có công việc được giao")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Create Task Modal */}
        <CreateTaskModal
          visible={createTaskVisible}
          onClose={() => setCreateTaskVisible(false)}
          onSubmit={handleCreateTask}
        />

        {/* Space Edit Modal */}
        <SpaceModal
          visible={editSpaceVisible}
          onClose={() => setEditSpaceVisible(false)}
          onSubmit={handleEditSpace}
          spaceToEdit={space}
          onDelete={handleDeleteSpace}
        />

        {/* Add Space Member Modal */}
        {space?.workspaceId ? (
          <AddSpaceMemberModal
            visible={addMemberModalVisible}
            workspaceId={space.workspaceId}
            spaceId={idNum}
            existingMemberIds={members.map((m) => m.id)}
            onClose={() => setAddMemberModalVisible(false)}
            onMemberAdded={loadData}
          />
        ) : null}
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
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 12,
    },
    headerBar: {
      height: 60,
      backgroundColor: colors.headerBg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.headerBorder,
    },
    backBtn: {
      padding: 6,
      marginRight: 8,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    headerSub: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 1,
    },
    settingsBtn: {
      padding: 6,
    },
    subTabBarWrapper: {
      backgroundColor: colors.cardInner,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    subTabBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    subTabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 6,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    subTabActive: {
      borderBottomColor: colors.primary,
      backgroundColor: isDark ? 'rgba(87, 157, 255, 0.08)' : 'rgba(0, 82, 204, 0.08)',
    },
    subTabText: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '600',
    },
    subTabTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    tabBadge: {
      backgroundColor: colors.segmentBg,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      marginLeft: 2,
    },
    tabBadgeActive: {
      backgroundColor: colors.primaryBg,
    },
    tabBadgeText: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '700',
    },
    tabBadgeTextActive: {
      color: colors.primary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    kanbanTabContainer: {
      flex: 1,
      paddingTop: 12,
      paddingHorizontal: 12,
    },
    tabSection: {
      gap: 16,
    },
    cardBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardBoxTitle: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressPercentText: {
      color: '#57D9A3',
      fontSize: 16,
      fontWeight: '800',
    },
    progressBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cardInner,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#57D9A3',
      borderRadius: 4,
    },
    progressSubText: {
      color: colors.subText,
      fontSize: 12,
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    metricLabel: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginVertical: 4,
    },
    metricSub: {
      color: colors.mutedText,
      fontSize: 11,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 6,
    },
    infoLabel: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '600',
      width: 100,
    },
    infoValue: {
      color: colors.text,
      fontSize: 13,
      flex: 1,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryBg,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 6,
    },
    primaryActionBtnText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    filterScroll: {
      gap: 8,
      paddingBottom: 12,
    },
    filterPill: {
      backgroundColor: colors.cardBg,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterPillActive: {
      backgroundColor: colors.primaryBg,
      borderColor: colors.primary,
    },
    filterPillText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },
    filterPillTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    emptyCardBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyCardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptyCardSub: {
      color: colors.subText,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
    },
    emptyCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    emptyCreateBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    taskCardTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 19,
    },
    strikeThrough: {
      textDecorationLine: 'line-through',
      color: colors.mutedText,
    },
    taskCardSub: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 4,
    },
    kanbanScroll: {
      gap: 12,
      paddingBottom: 20,
    },
    kanbanColumn: {
      width: 240,
      backgroundColor: colors.cardInner,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    kanbanColHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    kanbanColTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    colBadge: {
      backgroundColor: colors.segmentBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    colBadgeText: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '700',
    },
    colEmpty: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    colEmptyText: {
      color: colors.subText,
      fontSize: 12,
    },
    kanbanCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    kanbanCardTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    kanbanCardSub: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 4,
    },
    memberHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    addMemberBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      gap: 4,
    },
    addMemberBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    emptyMembersWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    memberAvatarImg: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    ownerAvatar: {
      backgroundColor: isDark ? '#382800' : '#FFF0B3',
      borderWidth: 1,
      borderColor: '#FFAB00',
    },
    ownerAvatarText: {
      color: isDark ? '#FFAB00' : '#B76E00',
    },
    memberAvatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    memberNameLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    memberName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    memberEmail: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 2,
    },
    memberStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    statDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#57D9A3',
      marginRight: 6,
    },
    memberStatsText: {
      color: colors.mutedText,
      fontSize: 11,
      fontWeight: '500',
    },
    ownerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#2A1F00' : '#FFF0B3',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#7F5F01' : '#F5CD47',
    },
    ownerBadgeText: {
      color: isDark ? '#FFAB00' : '#B76E00',
      fontSize: 10,
      fontWeight: '800',
    },
    pmBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#092147' : '#DEEBFF',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#1D3B6A' : '#B3D4FF',
    },
    pmBadgeText: {
      color: isDark ? '#579DFF' : '#0052CC',
      fontSize: 10,
      fontWeight: '800',
    },
    memberBadge: {
      backgroundColor: colors.segmentBg,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    memberBadgeText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '700',
    },
  });
