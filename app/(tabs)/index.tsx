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
  Globe,
  FolderPlus,
  Folder,
  Users,
  Crown,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace, Space, ClassifiedWorkspaces } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';
import { WorkspaceModal } from '../../components/WorkspaceModal';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'joined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
  const [joinedWorkspaces, setJoinedWorkspaces] = useState<Workspace[]>([]);
  const [userSpaces, setUserSpaces] = useState<{ workspace: Workspace; spaces: Space[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createWsModalVisible, setCreateWsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      let classified: ClassifiedWorkspaces = {
        ownedWorkspaces: [],
        joinedWorkspaces: [],
        pendingWorkspaces: [],
      };
      try {
        classified = await workspaceService.getClassifiedWorkspaces(user.id);
      } catch (err) {
        // Fallback to getWorkspacesByOwner if classified endpoint is unavailable
        const fallback = await workspaceService.getWorkspacesByOwner(user.id);
        classified = {
          ownedWorkspaces: fallback,
          joinedWorkspaces: [],
          pendingWorkspaces: [],
        };
      }

      setOwnedWorkspaces(classified.ownedWorkspaces || []);
      setJoinedWorkspaces(classified.joinedWorkspaces || []);

      const allSpaces = await workspaceService.getAllUserSpaces(user.id);
      setUserSpaces(allSpaces);
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

  // Combine and classify for display
  const allWorkspaces = [
    ...ownedWorkspaces.map((w) => ({ ...w, isOwner: true })),
    ...joinedWorkspaces.map((w) => ({ ...w, isOwner: false })),
  ];

  const filteredWorkspaces = allWorkspaces.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'owned') return w.isOwner;
    if (activeTab === 'joined') return !w.isOwner;
    return true;
  });

  const allSpacesList = userSpaces.flatMap((item) =>
    item.spaces.map((sp) => ({ ...sp, workspaceName: item.workspace.name }))
  );

  const currentWorkspace = allWorkspaces[0];
  const workspaceTitle = currentWorkspace
    ? currentWorkspace.name
    : user?.username
    ? `${user.username}-workspace`
    : 'Không gian làm việc';

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
              placeholder="Tìm kiếm workspace..."
              placeholderTextColor="#8C9BAB"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Quick Access Spaces Row */}
          {allSpacesList.length > 0 && (
            <View style={styles.spacesSection}>
              <Text style={styles.sectionTitle}>Không gian (Spaces) liên quan</Text>
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
                      <JiraSlidersIcon size={18} color="#FFFFFF" />
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
            </View>
          )}

          {/* Filter Segment (Tất cả / Của tôi / Đang tham gia) */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'all' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'all' && styles.segmentTextActive,
                ]}
              >
                Tất cả ({allWorkspaces.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'owned' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('owned')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'owned' && styles.segmentTextActive,
                ]}
              >
                Của tôi ({ownedWorkspaces.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'joined' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('joined')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'joined' && styles.segmentTextActive,
                ]}
              >
                Đang tham gia ({joinedWorkspaces.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Workspaces List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#579DFF" />
              <Text style={styles.loadingText}>Đang tải danh sách Workspace...</Text>
            </View>
          ) : filteredWorkspaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Layers size={36} color="#579DFF" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'owned'
                  ? 'Bạn chưa tạo Workspace nào'
                  : activeTab === 'joined'
                  ? 'Chưa tham gia Workspace nào'
                  : 'Chưa có Workspace nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'joined'
                  ? 'Khi bạn được mời tham gia Workspace từ các thành viên khác, hãy kiểm tra tab Thông báo để chấp nhận.'
                  : 'Bắt đầu bằng cách tạo Workspace đầu tiên để quản lý dự án và các thành viên.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCreateWsModalVisible(true)}
                activeOpacity={0.8}
              >
                <FolderPlus size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Tạo Workspace mới</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.workspacesList}>
              {filteredWorkspaces.map((w) => (
                <TouchableOpacity
                  key={`${w.isOwner ? 'owned' : 'joined'}-${w.id}`}
                  style={styles.workspaceCard}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/workspaces/${w.id}`)}
                >
                  <View
                    style={[
                      styles.wsIconWrap,
                      { backgroundColor: w.isOwner ? '#1D3B6A' : '#0D3823' },
                    ]}
                  >
                    {w.isOwner ? (
                      <Folder size={20} color="#579DFF" />
                    ) : (
                      <Users size={20} color="#57D9A3" />
                    )}
                  </View>

                  <View style={styles.wsInfo}>
                    <View style={styles.wsHeaderLine}>
                      <Text style={styles.wsName} numberOfLines={1}>
                        {w.name}
                      </Text>

                      {w.isOwner ? (
                        <View style={styles.roleBadgeOwned}>
                          <Crown size={10} color="#579DFF" style={{ marginRight: 3 }} />
                          <Text style={styles.roleTextOwned}>Của tôi</Text>
                        </View>
                      ) : (
                        <View style={styles.roleBadgeJoined}>
                          <Users size={10} color="#57D9A3" style={{ marginRight: 3 }} />
                          <Text style={styles.roleTextJoined}>Đang tham gia</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.wsDesc} numberOfLines={2}>
                      {w.description || 'Không gian làm việc nhóm'}
                    </Text>

                    <Text style={styles.wsDate}>
                      Tạo ngày: {new Date(w.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>

                  <ChevronRight size={18} color="#8C9BAB" />
                </TouchableOpacity>
              ))}
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
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#E6EDF3',
    fontSize: 15,
  },
  spacesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  quickAccessScroll: {
    gap: 12,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#282E33',
    minWidth: 150,
    gap: 10,
  },
  quickCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTextWrap: {
    flex: 1,
  },
  quickCardTitle: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '700',
  },
  quickCardSub: {
    color: '#8C9BAB',
    fontSize: 11,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 17,
  },
  segmentButtonActive: {
    backgroundColor: '#1D3B6A',
  },
  segmentText: {
    color: '#8C9BAB',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#579DFF',
    fontWeight: '700',
  },
  workspacesList: {
    gap: 10,
  },
  workspaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  wsIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wsInfo: {
    flex: 1,
    marginRight: 8,
  },
  wsHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wsName: {
    color: '#E6EDF3',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  roleBadgeOwned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D3B6A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTextOwned: {
    color: '#579DFF',
    fontSize: 10,
    fontWeight: '700',
  },
  roleBadgeJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D3823',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTextJoined: {
    color: '#57D9A3',
    fontSize: 10,
    fontWeight: '700',
  },
  wsDesc: {
    color: '#8C9BAB',
    fontSize: 12,
    lineHeight: 16,
  },
  wsDate: {
    color: '#6B7280',
    fontSize: 10,
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
