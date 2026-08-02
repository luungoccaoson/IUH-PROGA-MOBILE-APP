import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Settings, Plus, ListTodo, KanbanSquare, History, CheckCircle2, Clock, Calendar, User } from 'lucide-react-native';
import { workspaceService } from '../../services/workspace.service';
import { Space, Task, TaskStatus, Workspace } from '../../types';
import { DonutChart } from '../../components/DonutChart';
import { TaskItemCard } from '../../components/TaskItemCard';
import { CreateTaskModal } from '../../components/CreateTaskModal';
import { SpaceModal } from '../../components/SpaceModal';

type SubTabType = 'overview' | 'tasks' | 'kanban';

export default function SpaceDetailScreen() {
  const { spaceId } = useLocalSearchParams();
  const router = useRouter();
  const idNum = parseInt(spaceId as string, 10);

  const [activeTab, setActiveTab] = useState<SubTabType>('overview');
  const [space, setSpace] = useState<Space | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [createTaskVisible, setCreateTaskVisible] = useState(false);
  const [editSpaceVisible, setEditSpaceVisible] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadSpaceData = useCallback(async () => {
    if (!idNum) return;
    try {
      setError('');
      // Load tasks
      const taskList = await workspaceService.getTasksBySpace(idNum);
      setTasks(taskList);

      // Load space details via workspace lookup or fallback mock
      const spacesList = await workspaceService.getSpacesByWorkspace(1).catch(() => []);
      const current = spacesList.find((s) => s.id === idNum) || {
        id: idNum,
        workspaceId: 1,
        name: `Space #${idNum}`,
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setSpace(current);
    } catch (err: any) {
      console.error('Error loading space page:', err);
      setError('Không thể tải dữ liệu Space.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [idNum]);

  useEffect(() => {
    loadSpaceData();
  }, [loadSpaceData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSpaceData();
  };

  // Mock tasks fallback if no real tasks from BE yet
  const mockTasks: Task[] = [
    { id: 1, spaceId: idNum, title: 'Thiết kế sơ đồ ERD & PostgreSQL Schema', status: 'DONE', priority: 'HIGH', ownerName: 'Son Luu', dueDate: '2026-07-05', createdAt: '2026-07-01' },
    { id: 2, spaceId: idNum, title: 'Xây dựng Auth-Service & Cấu hình Security JWT', status: 'IN_PROGRESS', priority: 'URGENT', ownerName: 'Duy Dev', dueDate: '2026-07-12', createdAt: '2026-07-06' },
    { id: 3, spaceId: idNum, title: 'Xây dựng Giao diện Mobile Expo SDK 54', status: 'IN_PROGRESS', priority: 'HIGH', ownerName: 'Son Luu', dueDate: '2026-08-10', createdAt: '2026-08-01' },
    { id: 4, spaceId: idNum, title: 'Tích hợp Requirement Agent tự động phân rã Task', status: 'TODO', priority: 'MEDIUM', ownerName: 'Hoa Tester', dueDate: '2026-08-15', createdAt: '2026-08-02' },
  ];

  const tasksToDisplay = tasks.length > 0 ? tasks : mockTasks;

  // Status counts for Donut Chart
  const todoCount = tasksToDisplay.filter((t) => t.status === 'TODO').length;
  const inProgressCount = tasksToDisplay.filter((t) => t.status === 'IN_PROGRESS').length;
  const reviewCount = tasksToDisplay.filter((t) => t.status === 'REVIEW').length;
  const doneCount = tasksToDisplay.filter((t) => t.status === 'DONE').length;

  // Filter tasks for Task Tab
  const filteredTasks = tasksToDisplay.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await workspaceService.updateTaskStatus(taskId, newStatus);
    } catch (e) {
      console.error('Failed to update status on server:', e);
    }
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

  const handleDeleteTask = async (taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await workspaceService.deleteTask(taskId);
    } catch (e) {}
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
    await workspaceService.deleteSpace(space.id);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Đang tải chi tiết Space...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.topHeader}>
        <View style={styles.spaceTitleRow}>
          <View style={styles.initialsBadge}>
            <Text style={styles.initialsText}>
              {space?.name ? space.name.substring(0, 2).toUpperCase() : 'SP'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.spaceName}>{space?.name}</Text>
            {!!space?.startDate && (
              <Text style={styles.spaceDateText}>
                {new Date(space.startDate).toLocaleDateString('vi-VN')} -{' '}
                {space.endDate ? new Date(space.endDate).toLocaleDateString('vi-VN') : 'Không hạn'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.settingsBtn} onPress={() => setEditSpaceVisible(true)}>
          <Settings size={18} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Sub Tabs Navigation */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabItem, activeTab === 'overview' && styles.subTabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <History size={14} color={activeTab === 'overview' ? '#111827' : '#6B7280'} />
          <Text style={[styles.subTabText, activeTab === 'overview' && styles.subTabTextActive]}>
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeTab === 'tasks' && styles.subTabActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <ListTodo size={14} color={activeTab === 'tasks' ? '#111827' : '#6B7280'} />
          <Text style={[styles.subTabText, activeTab === 'tasks' && styles.subTabTextActive]}>
            Danh sách task
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeTab === 'kanban' && styles.subTabActive]}
          onPress={() => setActiveTab('kanban')}
        >
          <KanbanSquare size={14} color={activeTab === 'kanban' ? '#111827' : '#6B7280'} />
          <Text style={[styles.subTabText, activeTab === 'kanban' && styles.subTabTextActive]}>
            Bảng Kanban
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB CONTENTS */}
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabView}>
            {/* 4 Metric cards */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>ĐÃ HOÀN THÀNH</Text>
                <Text style={styles.metricValue}>{doneCount}</Text>
                <Text style={styles.metricSub}>Trong 7 ngày qua</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>ĐANG THỰC HIỆN</Text>
                <Text style={[styles.metricValue, { color: '#1A73E8' }]}>{inProgressCount}</Text>
                <Text style={styles.metricSub}>Đang tiến hành</Text>
              </View>
            </View>

            {/* Donut Chart Component */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>TỔNG QUAN TRẠNG THÁI CÔNG VIỆC</Text>
              <DonutChart
                todo={todoCount}
                inProgress={inProgressCount}
                review={reviewCount}
                done={doneCount}
              />
            </View>

            {/* Recent Activities Log */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>HOẠT ĐỘNG GẦN ĐÂY</Text>

              <View style={styles.activityItem}>
                <View style={styles.activityAvatar}>
                  <Text style={styles.activityAvatarText}>SL</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText}>
                    <Text style={{ fontWeight: '700' }}>Son Luu</Text> đã chuyển trạng thái{' '}
                    <Text style={{ fontWeight: '700' }}>TASK-2</Text> sang IN PROGRESS
                  </Text>
                  <Text style={styles.activityTime}>36 phút trước</Text>
                </View>
              </View>

              <View style={styles.activityItem}>
                <View style={styles.activityAvatar}>
                  <Text style={styles.activityAvatarText}>DD</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText}>
                    <Text style={{ fontWeight: '700' }}>Duy Dev</Text> đã tạo task mới{' '}
                    <Text style={{ fontWeight: '700' }}>TASK-3: Giao diện Mobile Expo SDK 54</Text>
                  </Text>
                  <Text style={styles.activityTime}>2 giờ trước</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: TASKS LIST */}
        {activeTab === 'tasks' && (
          <View style={styles.tabView}>
            {/* Action & Filter Bar */}
            <View style={styles.filterActionRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                {(['ALL', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as string[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                    onPress={() => setStatusFilter(f)}
                  >
                    <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.addTaskBtn} onPress={() => setCreateTaskVisible(true)}>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addTaskBtnText}>Tạo Task</Text>
              </TouchableOpacity>
            </View>

            {/* Task list view */}
            {filteredTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Không tìm thấy task nào với bộ lọc này.</Text>
              </View>
            ) : (
              filteredTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              ))
            )}
          </View>
        )}

        {/* TAB 3: KANBAN BOARD */}
        {activeTab === 'kanban' && (
          <View style={styles.tabView}>
            <View style={styles.kanbanHeaderRow}>
              <Text style={styles.kanbanNote}>
                * Chạm vào thẻ công việc để chuyển nhanh sang cột trạng thái tiếp theo.
              </Text>
              <TouchableOpacity style={styles.addTaskBtn} onPress={() => setCreateTaskVisible(true)}>
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addTaskBtnText}>Thêm Task</Text>
              </TouchableOpacity>
            </View>

            {/* 4 Kanban Column Blocks */}
            {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map((status) => {
              const colTasks = tasksToDisplay.filter((t) => t.status === status);
              const headerColors: Record<TaskStatus, { border: string; title: string }> = {
                TODO: { border: '#6B7280', title: 'CẦN LÀM (TODO)' },
                IN_PROGRESS: { border: '#1A73E8', title: 'ĐANG LÀM (IN PROGRESS)' },
                REVIEW: { border: '#B06000', title: 'ĐANG DUYỆT (REVIEW)' },
                DONE: { border: '#137333', title: 'ĐÃ XONG (DONE)' },
              };
              const colInfo = headerColors[status];

              return (
                <View key={status} style={[styles.kanbanColBox, { borderLeftColor: colInfo.border }]}>
                  <View style={styles.kanbanColHeader}>
                    <Text style={styles.kanbanColTitle}>{colInfo.title}</Text>
                    <View style={styles.kanbanCountBadge}>
                      <Text style={styles.kanbanCountText}>{colTasks.length}</Text>
                    </View>
                  </View>

                  {colTasks.length === 0 ? (
                    <Text style={styles.emptyColText}>Chưa có task ở cột này</Text>
                  ) : (
                    colTasks.map((task) => (
                      <TaskItemCard
                        key={task.id}
                        task={task}
                        onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <CreateTaskModal
        visible={createTaskVisible}
        onClose={() => setCreateTaskVisible(false)}
        onSubmit={handleCreateTask}
      />

      <SpaceModal
        visible={editSpaceVisible}
        onClose={() => setEditSpaceVisible(false)}
        onSubmit={handleEditSpace}
        onDelete={handleDeleteSpace}
        spaceToEdit={space}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5EF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  spaceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  initialsBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#D1E7DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#137333',
  },
  spaceName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  spaceDateText: {
    fontSize: 10,
    color: '#6B7280',
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F6F5EF',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#111827',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  subTabTextActive: {
    color: '#111827',
  },
  tabContent: {
    padding: 16,
  },
  tabView: {
    gap: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  activityItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  activityText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  filterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  filterChips: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
  kanbanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kanbanNote: {
    fontSize: 10,
    color: '#6B7280',
    flex: 1,
    marginRight: 10,
  },
  kanbanColBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  kanbanColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  kanbanColTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  kanbanCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F6F5EF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kanbanCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  emptyColText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
