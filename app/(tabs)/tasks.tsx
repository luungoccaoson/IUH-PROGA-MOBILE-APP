import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  User,
  ChevronDown,
  List,
  LayoutGrid,
  SquareCheck,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { Task, Space } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { CreateTaskModal } from '../../components/CreateTaskModal';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [tasksWithSpace, setTasksWithSpace] = useState<
    { task: Task; spaceName: string; workspaceName: string }[]
  >([]);
  const [allSpaces, setAllSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Tất cả công việc');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const filterOptions = [
    'Tất cả công việc',
    'Việc cần làm (TODO)',
    'Đang làm (IN_PROGRESS)',
    'Đã xong (DONE)',
  ];

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [taskList, spacesData] = await Promise.all([
        workspaceService.getAllUserTasks(user.id),
        workspaceService.getAllUserSpaces(user.id),
      ]);
      setTasksWithSpace(taskList);
      const flatSpaces = spacesData.flatMap((item) => item.spaces);
      setAllSpaces(flatSpaces);
    } catch (err) {
      console.log('Error loading tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      await workspaceService.updateTaskStatus(taskId, newStatus);
      setTasksWithSpace((prev) =>
        prev.map((item) =>
          item.task.id === taskId
            ? { ...item, task: { ...item.task, status: newStatus } }
            : item
        )
      );
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái công việc.');
    }
  };

  const handleOpenCreateModal = () => {
    if (allSpaces.length === 0) {
      Alert.alert(
        'Chưa có Space',
        'Vui lòng tạo một Không gian (Space) trước khi tạo nhiệm vụ mới.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tạo Không gian', onPress: () => router.push('/(tabs)/spaces') },
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
    loadData();
  };

  // Filter tasks based on selected filter
  const filteredTasks = tasksWithSpace.filter(({ task }) => {
    if (selectedFilter === 'Việc cần làm (TODO)') return task.status === 'TODO';
    if (selectedFilter === 'Đang làm (IN_PROGRESS)')
      return task.status === 'IN_PROGRESS';
    if (selectedFilter === 'Đang kiểm thử (REVIEW)')
      return task.status === 'REVIEW';
    if (selectedFilter === 'Đã xong (DONE)') return task.status === 'DONE';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader
          title="Tất cả công việc"
          rightActions={
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={handleOpenCreateModal}
              >
                <Plus size={24} color={colors.text} />
              </TouchableOpacity>
            </>
          }
        />

        {/* Filter and View Mode Toolbar */}
        <View style={styles.toolbarRow}>
          {/* Filter Dropdown Pill */}
          <TouchableOpacity
            style={styles.filterPill}
            activeOpacity={0.75}
            onPress={() => setFilterDropdownVisible(true)}
          >
            <User size={15} color={colors.subText} style={{ marginRight: 6 }} />
            <Text style={styles.filterPillText} numberOfLines={1}>
              {selectedFilter}
            </Text>
            <ChevronDown size={16} color={colors.subText} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* View Mode Toggle Buttons */}
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
                size={18}
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
                size={18}
                color={viewMode === 'board' ? colors.primary : colors.subText}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách công việc...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <CheckCircle2 size={36} color="#579DFF" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có công việc nào</Text>
            <Text style={styles.emptySubtitle}>
              {allSpaces.length === 0
                ? 'Hãy tạo Không gian trước để bắt đầu thêm và theo dõi công việc.'
                : 'Bấm nút "+" ở góc phải trên để tạo nhiệm vụ đầu tiên.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Tạo công việc mới</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'list' ? (
          /* List Mode */
          <ScrollView
            style={styles.listContent}
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
            {filteredTasks.map(({ task, spaceName }) => {
              const isDone = task.status === 'DONE';
              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.issueCard}
                  activeOpacity={0.7}
                  onPress={() => toggleTaskStatus(task.id, task.status)}
                >
                  <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() => toggleTaskStatus(task.id, task.status)}
                  >
                    <SquareCheck
                      size={20}
                      color={isDone ? '#579DFF' : '#8C9BAB'}
                    />
                  </TouchableOpacity>

                  <View style={styles.issueTextWrap}>
                    <Text
                      style={[
                        styles.issueTitle,
                        isDone && styles.strikeThroughText,
                      ]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>
                    <Text style={styles.issueSubtitle}>
                      #{task.id} • {spaceName} • {task.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          /* Board / Kanban Columns Mode */
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.boardScroll}
            contentContainerStyle={styles.boardContent}
          >
            {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map(
              (status) => {
                const columnTasks = tasksWithSpace.filter(
                  (i) => i.task.status === status
                );
                return (
                  <View key={status} style={styles.boardColumn}>
                    <View style={styles.columnHeader}>
                      <Text style={styles.columnTitle}>{status}</Text>
                      <View style={styles.columnCountBadge}>
                        <Text style={styles.columnCountText}>
                          {columnTasks.length}
                        </Text>
                      </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      {columnTasks.length === 0 ? (
                        <View style={styles.columnEmptyBox}>
                          <Text style={styles.columnEmptyText}>Không có task</Text>
                        </View>
                      ) : (
                        columnTasks.map(({ task, spaceName }) => (
                          <TouchableOpacity
                            key={task.id}
                            style={styles.boardCard}
                            activeOpacity={0.75}
                            onPress={() =>
                              toggleTaskStatus(task.id, task.status)
                            }
                          >
                            <Text style={styles.boardCardTitle} numberOfLines={2}>
                              {task.title}
                            </Text>
                            <Text style={styles.boardCardSub}>
                              #{task.id} • {spaceName}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                );
              }
            )}
          </ScrollView>
        )}

        {/* Filter Selection Modal */}
        <Modal
          visible={filterDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFilterDropdownVisible(false)}
          >
            <View style={styles.dropdownMenu}>
              <Text style={styles.dropdownTitle}>Bộ lọc công việc</Text>
              {filterOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedFilter(opt);
                    setFilterDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedFilter === opt && styles.dropdownItemTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

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
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      maxWidth: 240,
    },
    filterPillText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flexShrink: 1,
    },
    viewModeGroup: {
      flexDirection: 'row',
      backgroundColor: colors.segmentBg,
      borderRadius: 10,
      padding: 2,
      gap: 4,
    },
    viewModeBtn: {
      padding: 8,
      borderRadius: 8,
    },
    viewModeBtnActive: {
      backgroundColor: colors.segmentActiveBg,
    },
    listContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    issueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    checkboxTouch: {
      marginRight: 14,
      padding: 2,
    },
    issueTextWrap: {
      flex: 1,
    },
    issueTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
    },
    strikeThroughText: {
      textDecorationLine: 'line-through',
      color: colors.mutedText,
    },
    issueSubtitle: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 4,
    },
    centerContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 10,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.cardInner,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    emptySubtitle: {
      color: colors.subText,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 20,
    },
    emptyActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 8,
    },
    emptyActionBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    boardScroll: {
      flex: 1,
    },
    boardContent: {
      paddingHorizontal: 16,
      gap: 12,
    },
    boardColumn: {
      width: 260,
      backgroundColor: colors.cardInner,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    columnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    columnTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    columnCountBadge: {
      backgroundColor: colors.segmentBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    columnCountText: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '700',
    },
    columnEmptyBox: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    columnEmptyText: {
      color: colors.subText,
      fontSize: 12,
    },
    boardCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    boardCardTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    boardCardSub: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dropdownMenu: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      width: '85%',
      maxWidth: 320,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropdownTitle: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 12,
      paddingHorizontal: 8,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    dropdownItemText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    dropdownItemTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
