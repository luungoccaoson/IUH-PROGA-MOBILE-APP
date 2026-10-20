import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  Search,
  Kanban,
  SquareCheck,
  Globe,
  FolderPlus,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace, Space, Task } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';
import { WorkspaceModal } from '../../components/WorkspaceModal';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'viewed' | 'active'>('viewed');
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [userSpaces, setUserSpaces] = useState<{ workspace: Workspace; spaces: Space[] }[]>([]);
  const [recentTasks, setRecentTasks] = useState<{ task: Task; spaceName: string; workspaceName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createWsModalVisible, setCreateWsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [wsList, spList, taskList] = await Promise.all([
        workspaceService.getWorkspacesByOwner(user.id),
        workspaceService.getAllUserSpaces(user.id),
        workspaceService.getAllUserTasks(user.id),
      ]);
      setWorkspaces(wsList);
      setUserSpaces(spList);
      setRecentTasks(taskList);
    } catch (e) {
      console.log('Error fetching home data:', e);
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

  const handleCreateWorkspace = async (name: string, description: string) => {
    if (!user?.id) return;
    await workspaceService.createWorkspace({
      name,
      description,
      ownerId: user.id,
    });
    loadData();
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      await workspaceService.updateTaskStatus(taskId, newStatus);
      setRecentTasks((prev) =>
        prev.map((item) =>
          item.task.id === taskId
            ? { ...item, task: { ...item.task, status: newStatus } }
            : item
        )
      );
    } catch (err) {
      console.log('Failed to update task status:', err);
    }
  };

  const currentWorkspace = workspaces[0];
  const workspaceTitle = currentWorkspace
    ? currentWorkspace.name
    : user?.username
    ? `${user.username}-workspace`
    : 'Không gian làm việc';

  const allSpacesList = userSpaces.flatMap((item) =>
    item.spaces.map((sp) => ({ ...sp, workspaceName: item.workspace.name }))
  );

  const filteredTasks = recentTasks.filter((item) => {
    if (searchQuery.trim()) {
      return (
        item.task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.spaceName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeTab === 'active') {
      return item.task.status !== 'DONE';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Jira Header */}
        <JiraHeader
          renderCenter={() => (
            <TouchableOpacity
              style={styles.workspacePill}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/spaces')}
            >
              <View style={styles.workspaceIconBadge}>
                <Globe size={13} color="#579DFF" />
              </View>
              <Text style={styles.workspacePillText} numberOfLines={1}>
                {workspaceTitle}
              </Text>
            </TouchableOpacity>
          )}
          rightActions={
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setCreateWsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Plus size={22} color="#E6EDF3" />
            </TouchableOpacity>
          }
        />

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
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#8C9BAB" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm công việc, space..."
              placeholderTextColor="#8C9BAB"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Quick Access Spaces Row */}
          {allSpacesList.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickAccessScroll}
            >
              {allSpacesList.map((sp, idx) => (
                <TouchableOpacity
                  key={sp.id}
                  style={styles.quickCard}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/spaces/${sp.id}`)}
                >
                  <View
                    style={[
                      styles.quickCardIconWrap,
                      {
                        backgroundColor:
                          idx % 2 === 0 ? '#E65100' : '#6554C0',
                      },
                    ]}
                  >
                    {idx % 2 === 0 ? (
                      <JiraSlidersIcon size={18} color="#FFFFFF" />
                    ) : (
                      <Kanban size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.quickCardTextWrap}>
                    <Text style={styles.quickCardTitle} numberOfLines={1}>
                      {sp.name}
                    </Text>
                    <Text style={styles.quickCardSub}>{sp.workspaceName}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Segment Filter (Đã xem / Hoạt động) */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'viewed' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('viewed')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'viewed' && styles.segmentTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'active' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('active')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'active' && styles.segmentTextActive,
                ]}
              >
                Đang làm
              </Text>
            </TouchableOpacity>
          </View>

          {/* Task List or Empty State */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#579DFF" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CheckCircle2 size={36} color="#579DFF" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có công việc nào</Text>
              <Text style={styles.emptySubtitle}>
                {workspaces.length === 0
                  ? 'Bắt đầu bằng cách tạo Không gian làm việc đầu tiên của bạn.'
                  : 'Hãy tạo nhiệm vụ mới trong Không gian để bắt đầu theo dõi tiến độ.'}
              </Text>
              {workspaces.length === 0 && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setCreateWsModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <FolderPlus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyActionBtnText}>
                    Tạo Không gian làm việc
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.groupContainer}>
              <Text style={styles.groupHeader}>Gần đây</Text>
              {filteredTasks.map(({ task, spaceName }) => {
                const isDone = task.status === 'DONE';
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.issueItemCard}
                    activeOpacity={0.75}
                    onPress={() => handleToggleTask(task.id, task.status)}
                  >
                    <TouchableOpacity
                      style={styles.issueIconWrap}
                      onPress={() => handleToggleTask(task.id, task.status)}
                    >
                      <SquareCheck
                        size={20}
                        color={isDone ? '#579DFF' : '#8C9BAB'}
                      />
                    </TouchableOpacity>
                    <View style={styles.issueInfo}>
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
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        <WorkspaceModal
          visible={createWsModalVisible}
          onClose={() => setCreateWsModalVisible(false)}
          onSubmit={handleCreateWorkspace}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101214',
  },
  container: {
    flex: 1,
    backgroundColor: '#101214',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderWidth: 1,
    borderColor: '#282E33',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 240,
    gap: 8,
  },
  workspaceIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1D3B6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspacePillText: {
    color: '#E6EDF3',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerIconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#282E33',
    paddingHorizontal: 16,
    height: 44,
    marginTop: 14,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#E6EDF3',
    fontSize: 15,
  },
  quickAccessScroll: {
    gap: 12,
    paddingBottom: 16,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#282E33',
    minWidth: 160,
    gap: 12,
  },
  quickCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTextWrap: {
    flex: 1,
  },
  quickCardTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardSub: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#161A1D',
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  segmentButton: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 17,
  },
  segmentButtonActive: {
    backgroundColor: '#1D3B6A',
  },
  segmentText: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#579DFF',
    fontWeight: '700',
  },
  groupContainer: {
    marginBottom: 18,
  },
  groupHeader: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  issueItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  issueIconWrap: {
    marginRight: 14,
  },
  issueInfo: {
    flex: 1,
  },
  issueTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },
  strikeThroughText: {
    textDecorationLine: 'line-through',
    color: '#8C9BAB',
  },
  issueSubtitle: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 4,
  },
  centerContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8C9BAB',
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#161A1D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#8C9BAB',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D3B6A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionBtnText: {
    color: '#579DFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
