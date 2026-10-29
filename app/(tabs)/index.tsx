import { translate as tr, useTranslation as useSystemTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FolderPlus,
  Folder,
  Users,
  Crown,
  ChevronRight,
  Layers,
  X,
  CheckSquare,
  Rocket,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { recentSpacesService } from '../../services/recentSpaces.service';
import { Workspace, Space, ClassifiedWorkspaces, Task } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';
import { WorkspaceModal } from '../../components/WorkspaceModal';

interface UserTaskItem {
  task: Task;
  spaceName: string;
  workspaceName: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'joined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
  const [joinedWorkspaces, setJoinedWorkspaces] = useState<Workspace[]>([]);
  const [userSpaces, setUserSpaces] = useState<{ workspace: Workspace; spaces: Space[] }[]>([]);
  const [userTasks, setUserTasks] = useState<UserTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createWsModalVisible, setCreateWsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [classified, allSpaces, allTasks] = await Promise.all([
        workspaceService.getClassifiedWorkspaces(user.id).catch(async () => {
          const fallback = await workspaceService.getWorkspacesByOwner(user.id);
          return {
            ownedWorkspaces: fallback,
            joinedWorkspaces: [],
            pendingWorkspaces: [],
          } as ClassifiedWorkspaces;
        }),
        workspaceService.getAllUserSpaces(user.id).catch(() => []),
        workspaceService.getAllUserTasks(user.id).catch(() => []),
      ]);

      setOwnedWorkspaces(classified.ownedWorkspaces || []);
      setJoinedWorkspaces(classified.joinedWorkspaces || []);
      setUserSpaces(allSpaces);
      setUserTasks(allTasks);
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

  // Combine workspaces
  const allWorkspaces = [
    ...ownedWorkspaces.map((w) => ({ ...w, isOwner: true })),
    ...joinedWorkspaces.map((w) => ({ ...w, isOwner: false })),
  ];

  // All spaces flattened
  const allSpacesList = userSpaces.flatMap((item) =>
    item.spaces.map((sp) => ({
      ...sp,
      workspaceName: item.workspace.name,
    }))
  );

  // Search filter
  const cleanQuery = searchQuery.trim().toLowerCase();
  const isSearching = cleanQuery.length > 0;

  const searchedWorkspaces = isSearching
    ? allWorkspaces.filter(
        (w) =>
          w.name.toLowerCase().includes(cleanQuery) ||
          (w.description && w.description.toLowerCase().includes(cleanQuery))
      )
    : [];

  const searchedSpaces = isSearching
    ? allSpacesList.filter(
        (s) =>
          s.name.toLowerCase().includes(cleanQuery) ||
          (s.workspaceName && s.workspaceName.toLowerCase().includes(cleanQuery))
      )
    : [];

  const searchedTasks = isSearching
    ? userTasks.filter(
        (item) =>
          item.task.title.toLowerCase().includes(cleanQuery) ||
          (item.task.description && item.task.description.toLowerCase().includes(cleanQuery))
      )
    : [];

  const totalMatches =
    searchedWorkspaces.length + searchedSpaces.length + searchedTasks.length;

  // Filter for normal workspace list
  const filteredWorkspaces = allWorkspaces.filter((w) => {
    if (activeTab === 'owned') return w.isOwner;
    if (activeTab === 'joined') return !w.isOwner;
    return true;
  });

  const handleOpenSpace = async (spaceId: number) => {
    await recentSpacesService.addRecentSpaceId(spaceId);
    router.push(`/spaces/${spaceId}`);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'DONE':
        return {
          label: tr("Hoàn thành"),
          bg: isDark ? '#0D3823' : '#E3FCEF',
          text: isDark ? '#36B37E' : '#006644',
        };
      case 'IN_PROGRESS':
        return {
          label: tr("Đang làm"),
          bg: isDark ? '#43290F' : '#FFF0B3',
          text: isDark ? '#F59E0B' : '#B76E00',
        };
      default:
        return {
          label: tr("Cần làm"),
          bg: isDark ? '#1D3B6A' : '#DEEBFF',
          text: isDark ? '#579DFF' : '#0052CC',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Jira Header (Top middle component removed as requested) */}
        <JiraHeader
          rightActions={
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setCreateWsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Plus size={22} color={colors.text} />
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
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.subText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={tr("Tìm kiếm workspace, space, task...")}
              placeholderTextColor={colors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.clearSearchBtn}
              >
                <X size={16} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{tr("Đang tải dữ liệu...")}</Text>
            </View>
          ) : isSearching ? (
            /* ================= SEARCH RESULTS VIEW ================= */
            <View style={styles.searchResultsContainer}>
              <View style={styles.searchHeaderRow}>
                <Text style={styles.searchResultsTitle}>{tr("Kết quả tìm kiếm")}</Text>
                <View style={styles.matchCountBadge}>
                  <Text style={styles.matchCountText}>{totalMatches} {tr("kết quả")}</Text>
                </View>
              </View>

              {totalMatches === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Search size={32} color="#8C9BAB" />
                  </View>
                  <Text style={styles.emptyTitle}>{tr("Không tìm thấy kết quả")}</Text>
                  <Text style={styles.emptySubtitle}>
                    {tr('Không có workspace, không gian hay công việc nào khớp với "{query}"', { query: searchQuery })}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Matching Workspaces */}
                  {searchedWorkspaces.length > 0 && (
                    <View style={styles.searchGroup}>
                      <View style={styles.searchGroupHeader}>
                        <Folder size={16} color="#579DFF" />
                        <Text style={styles.searchGroupTitle}>
                          {tr("Workspace (")}{searchedWorkspaces.length})
                        </Text>
                      </View>
                      <View style={styles.searchCardGroup}>
                        {searchedWorkspaces.map((w, idx) => (
                          <React.Fragment key={`ws-${w.id}`}>
                            {idx > 0 && <View style={styles.groupDivider} />}
                            <TouchableOpacity
                              style={styles.searchItemRow}
                              activeOpacity={0.75}
                              onPress={() => router.push(`/workspaces/${w.id}`)}
                            >
                              <View
                                style={[
                                  styles.itemIconWrap,
                                  { backgroundColor: w.isOwner ? '#1D3B6A' : '#0D3823' },
                                ]}
                              >
                                {w.isOwner ? (
                                  <Folder size={18} color="#579DFF" />
                                ) : (
                                  <Users size={18} color="#57D9A3" />
                                )}
                              </View>
                              <View style={styles.itemInfoWrap}>
                                <View style={styles.itemNameRow}>
                                  <Text style={styles.itemName} numberOfLines={1}>
                                    {w.name}
                                  </Text>
                                  <View
                                    style={
                                      w.isOwner ? styles.roleBadgeOwned : styles.roleBadgeJoined
                                    }
                                  >
                                    <Text
                                      style={
                                        w.isOwner ? styles.roleTextOwned : styles.roleTextJoined
                                      }
                                    >
                                      {w.isOwner ? tr("Của tôi") : tr("Đang tham gia")}
                                    </Text>
                                  </View>
                                </View>
                                {!!w.description && (
                                  <Text style={styles.itemDesc} numberOfLines={1}>
                                    {w.description}
                                  </Text>
                                )}
                              </View>
                              <ChevronRight size={18} color="#8C9BAB" />
                            </TouchableOpacity>
                          </React.Fragment>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Matching Spaces */}
                  {searchedSpaces.length > 0 && (
                    <View style={styles.searchGroup}>
                      <View style={styles.searchGroupHeader}>
                        <JiraSlidersIcon size={16} color="#E65100" />
                        <Text style={styles.searchGroupTitle}>
                          {tr("Không gian (")}{searchedSpaces.length})
                        </Text>
                      </View>
                      <View style={styles.searchCardGroup}>
                        {searchedSpaces.map((sp, idx) => (
                          <React.Fragment key={`sp-${sp.id}`}>
                            {idx > 0 && <View style={styles.groupDivider} />}
                            <TouchableOpacity
                              style={styles.searchItemRow}
                              activeOpacity={0.75}
                              onPress={() => handleOpenSpace(sp.id)}
                            >
                              <View
                                style={[
                                  styles.itemIconWrap,
                                  {
                                    backgroundColor: idx % 2 === 0 ? '#E65100' : '#1D3B6A',
                                  },
                                ]}
                              >
                                {idx % 2 === 0 ? (
                                  <JiraSlidersIcon size={18} color="#FFFFFF" />
                                ) : (
                                  <Rocket size={18} color="#579DFF" />
                                )}
                              </View>
                              <View style={styles.itemInfoWrap}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                  {sp.name}
                                </Text>
                                <Text style={styles.itemBreadcrumb} numberOfLines={1}>
                                  {tr("Thuộc Workspace:")}{sp.workspaceName}
                                </Text>
                              </View>
                              <ChevronRight size={18} color="#8C9BAB" />
                            </TouchableOpacity>
                          </React.Fragment>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Matching Tasks */}
                  {searchedTasks.length > 0 && (
                    <View style={styles.searchGroup}>
                      <View style={styles.searchGroupHeader}>
                        <CheckSquare size={16} color="#36B37E" />
                        <Text style={styles.searchGroupTitle}>
                          {tr("Công việc (")}{searchedTasks.length})
                        </Text>
                      </View>
                      <View style={styles.searchCardGroup}>
                        {searchedTasks.map((item, idx) => {
                          const badge = getStatusBadge(item.task.status);
                          return (
                            <React.Fragment key={`task-${item.task.id}`}>
                              {idx > 0 && <View style={styles.groupDivider} />}
                              <TouchableOpacity
                                style={styles.searchItemRow}
                                activeOpacity={0.75}
                                onPress={() => handleOpenSpace(item.task.spaceId)}
                              >
                                <View
                                  style={[
                                    styles.itemIconWrap,
                                    { backgroundColor: '#1C2127', borderWidth: 1, borderColor: '#282E33' },
                                  ]}
                                >
                                  <CheckSquare size={18} color="#579DFF" />
                                </View>
                                <View style={styles.itemInfoWrap}>
                                  <View style={styles.itemNameRow}>
                                    <Text style={styles.itemName} numberOfLines={1}>
                                      {item.task.title}
                                    </Text>
                                    <View
                                      style={[
                                        styles.taskStatusBadge,
                                        { backgroundColor: badge.bg },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.taskStatusText,
                                          { color: badge.text },
                                        ]}
                                      >
                                        {badge.label}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={styles.itemBreadcrumb} numberOfLines={1}>
                                    {item.spaceName} • {item.workspaceName}
                                  </Text>
                                </View>
                                <ChevronRight size={18} color="#8C9BAB" />
                              </TouchableOpacity>
                            </React.Fragment>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            /* ================= NORMAL HOME VIEW ================= */
            <>
              {/* Quick Access Spaces Row */}
              {allSpacesList.length > 0 && (
                <View style={styles.spacesSection}>
                  <Text style={styles.sectionTitle}>{tr("Không gian (Spaces) liên quan")}</Text>
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
                        onPress={() => handleOpenSpace(sp.id)}
                      >
                        <View
                          style={[
                            styles.quickCardIconWrap,
                            {
                              backgroundColor: idx % 2 === 0 ? '#E65100' : '#6554C0',
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
                    {tr("Tất cả (")}{allWorkspaces.length})
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
                    {tr("Của tôi (")}{ownedWorkspaces.length})
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
                    {tr("Đang tham gia (")}{joinedWorkspaces.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Workspaces List */}
              {filteredWorkspaces.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Layers size={36} color="#579DFF" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'owned'
                      ? tr("Bạn chưa tạo Workspace nào")
                      : activeTab === 'joined'
                      ? tr("Chưa tham gia Workspace nào")
                      : tr("Chưa có Workspace nào")}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'joined'
                      ? tr("Khi bạn được mời tham gia Workspace từ các thành viên khác, hãy kiểm tra tab Thông báo để chấp nhận.")
                      : tr("Bắt đầu bằng cách tạo Workspace đầu tiên để quản lý dự án và các thành viên.")}
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setCreateWsModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <FolderPlus size={16} color="#FFFFFF" />
                    <Text style={styles.emptyActionBtnText}>{tr("Tạo Workspace mới")}</Text>
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
                              <Text style={styles.roleTextOwned}>{tr("Của tôi")}</Text>
                            </View>
                          ) : (
                            <View style={styles.roleBadgeJoined}>
                              <Users size={10} color="#57D9A3" style={{ marginRight: 3 }} />
                              <Text style={styles.roleTextJoined}>{tr("Đang tham gia")}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.wsDesc} numberOfLines={2}>
                          {w.description || tr("Không gian làm việc nhóm")}
                        </Text>

                        <Text style={styles.wsDate}>
                          {tr("Tạo ngày:")}{' '}{new Date(w.createdAt).toLocaleDateString(locale)}
                        </Text>
                      </View>

                      <ChevronRight size={18} color="#8C9BAB" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
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
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    headerIconButton: {
      padding: 4,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      color: colors.text,
      fontSize: 14,
    },
    clearSearchBtn: {
      padding: 4,
      marginLeft: 6,
    },
    searchResultsContainer: {
      gap: 16,
      paddingBottom: 20,
    },
    searchHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    searchResultsTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    matchCountBadge: {
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    matchCountText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    searchGroup: {
      gap: 8,
    },
    searchGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchGroupTitle: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    searchCardGroup: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    searchItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    groupDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 58,
    },
    itemIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    itemInfoWrap: {
      flex: 1,
      marginRight: 8,
    },
    itemNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginBottom: 2,
    },
    itemName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    itemDesc: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 2,
    },
    itemBreadcrumb: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 2,
    },
    taskStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    taskStatusText: {
      fontSize: 10,
      fontWeight: '700',
    },
    spacesSection: {
      marginBottom: 16,
    },
    sectionTitle: {
      color: colors.subText,
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
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    quickCardSub: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: colors.segmentBg,
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
      backgroundColor: colors.segmentActiveBg,
    },
    segmentText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },
    segmentTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    workspacesList: {
      gap: 10,
    },
    workspaceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
      marginRight: 6,
    },
    roleBadgeOwned: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    roleTextOwned: {
      color: isDark ? '#579DFF' : '#0052CC',
      fontSize: 10,
      fontWeight: '700',
    },
    roleBadgeJoined: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0D3823' : '#E3FCEF',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    roleTextJoined: {
      color: isDark ? '#57D9A3' : '#006644',
      fontSize: 10,
      fontWeight: '700',
    },
    wsDesc: {
      color: colors.subText,
      fontSize: 12,
      lineHeight: 16,
    },
    wsDate: {
      color: colors.mutedText,
      fontSize: 10,
      marginTop: 4,
    },
    centerContainer: {
      padding: 30,
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
      paddingVertical: 40,
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
  });
