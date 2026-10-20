import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search,
  Plus,
  Star,
  Rocket,
  Folder,
  Layers,
  FolderPlus,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { recentSpacesService } from '../../services/recentSpaces.service';
import { Workspace, Space, ClassifiedWorkspaces } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';
import { WorkspaceModal } from '../../components/WorkspaceModal';

interface SpaceItemView {
  id: number;
  name: string;
  code: string;
  workspaceName?: string;
  type: 'workspace' | 'space';
  iconType: 'sliders' | 'rocket' | 'folder';
  isOwner?: boolean;
}

export default function SpacesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [items, setItems] = useState<SpaceItemView[]>([]);
  const [recentSpaceIds, setRecentSpaceIds] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createWsModalVisible, setCreateWsModalVisible] = useState(false);

  const loadRecentSpaces = useCallback(async () => {
    const ids = await recentSpacesService.getRecentSpaceIds();
    setRecentSpaceIds(ids);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentSpaces();
    }, [loadRecentSpaces])
  );

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      loadRecentSpaces();
      let classified: ClassifiedWorkspaces = {
        ownedWorkspaces: [],
        joinedWorkspaces: [],
        pendingWorkspaces: [],
      };
      try {
        classified = await workspaceService.getClassifiedWorkspaces(user.id);
      } catch {
        const fallback = await workspaceService.getWorkspacesByOwner(user.id);
        classified = {
          ownedWorkspaces: fallback,
          joinedWorkspaces: [],
          pendingWorkspaces: [],
        };
      }

      const allSpacesList = await workspaceService.getAllUserSpaces(user.id);

      const displayList: SpaceItemView[] = [];

      // Only display Spaces
      allSpacesList.forEach((group, gIdx) => {
        group.spaces.forEach((sp, sIdx) => {
          displayList.push({
            id: sp.id,
            name: sp.name,
            code: group.workspace.name.toUpperCase(),
            workspaceName: group.workspace.name,
            type: 'space',
            iconType: (sIdx + gIdx) % 2 === 0 ? 'sliders' : 'rocket',
          });
        });
      });

      setItems(displayList);
    } catch (err) {
      console.log('Error loading spaces:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, loadRecentSpaces]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleFavorite = (key: string) => {
    setFavorites((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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

  const handleItemPress = async (item: SpaceItemView) => {
    if (item.type === 'space') {
      await recentSpacesService.addRecentSpaceId(item.id);
      setRecentSpaceIds((prev) => [item.id, ...prev.filter((id) => id !== item.id)].slice(0, 20));
      router.push(`/spaces/${item.id}`);
    } else {
      router.push(`/workspaces/${item.id}`);
    }
  };

  // Recent items: hiện tối đa 3 không gian và hiển thị lên đầu đối với không gian đã xem gần nhất
  const recentOrdered: SpaceItemView[] = [];

  for (const id of recentSpaceIds) {
    const found = items.find((item) => item.id === id);
    if (found && !recentOrdered.some((r) => r.id === found.id)) {
      recentOrdered.push(found);
    }
    if (recentOrdered.length >= 3) break;
  }

  // Nếu chưa đủ 3 không gian đã xem, bổ sung thêm các không gian có sẵn
  if (recentOrdered.length < 3) {
    for (const item of items) {
      if (!recentOrdered.some((r) => r.id === item.id)) {
        recentOrdered.push(item);
      }
      if (recentOrdered.length >= 3) break;
    }
  }

  const recentItems = recentOrdered.slice(0, 3);

  const renderIcon = (type: 'sliders' | 'rocket' | 'folder') => {
    if (type === 'sliders') {
      return (
        <View style={[styles.itemIconWrap, { backgroundColor: '#E65100' }]}>
          <JiraSlidersIcon size={20} color="#FFFFFF" />
        </View>
      );
    }
    if (type === 'rocket') {
      return (
        <View style={[styles.itemIconWrap, { backgroundColor: '#1D3B6A' }]}>
          <Rocket size={20} color="#579DFF" />
        </View>
      );
    }
    return (
      <View style={[styles.itemIconWrap, { backgroundColor: '#2C3E50' }]}>
        <Folder size={20} color="#579DFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Jira Header */}
        <JiraHeader
          title="Không gian"
          rightActions={
            <>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Search size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={() => setCreateWsModalVisible(true)}
              >
                <Plus size={24} color={colors.text} />
              </TouchableOpacity>
            </>
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
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Đang tải không gian...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Layers size={36} color="#579DFF" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có Không gian nào</Text>
              <Text style={styles.emptySubtitle}>
                Bắt đầu bằng cách tạo Không gian làm việc đầu tiên để quản lý dự án cùng đội ngũ.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCreateWsModalVisible(true)}
                activeOpacity={0.8}
              >
                <FolderPlus size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Tạo Không gian mới</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Section: Đã xem gần đây */}
              {recentItems.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Đã xem gần đây</Text>
                  <View style={styles.cardGroup}>
                    {recentItems.map((item, idx) => {
                      const favKey = `recent-${item.type}-${item.id}`;
                      const isFav = !!favorites[favKey];
                      return (
                        <React.Fragment key={favKey}>
                          {idx > 0 && <View style={styles.groupDivider} />}
                          <TouchableOpacity
                            style={styles.groupItem}
                            activeOpacity={0.75}
                            onPress={() => handleItemPress(item)}
                          >
                            {renderIcon(item.iconType)}
                            <View style={styles.itemInfo}>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.itemCode}>
                                {item.code}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => toggleFavorite(favKey)}
                              style={styles.starBtn}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Star
                                size={20}
                                color={isFav ? '#F59E0B' : colors.subText}
                                fill={isFav ? '#F59E0B' : 'transparent'}
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Section: Tất cả các không gian */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tất cả các không gian</Text>
                <View style={styles.cardGroup}>
                  {items.map((item, idx) => {
                    const favKey = `all-${item.type}-${item.id}`;
                    const isFav = !!favorites[favKey];
                    return (
                      <React.Fragment key={favKey}>
                        {idx > 0 && <View style={styles.groupDivider} />}
                        <TouchableOpacity
                          style={styles.groupItem}
                          activeOpacity={0.75}
                          onPress={() => handleItemPress(item)}
                        >
                          {renderIcon(item.iconType)}
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.itemCode}>
                              {item.code}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleFavorite(favKey)}
                            style={styles.starBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Star
                              size={20}
                              color={isFav ? '#F59E0B' : colors.subText}
                              fill={isFav ? '#F59E0B' : 'transparent'}
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
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
      paddingTop: 16,
    },
    iconBtn: {
      padding: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 10,
    },
    cardGroup: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    groupItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    groupDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 66,
    },
    itemIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    itemCode: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 2,
      letterSpacing: 0.5,
    },
    starBtn: {
      padding: 4,
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
      paddingVertical: 50,
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
