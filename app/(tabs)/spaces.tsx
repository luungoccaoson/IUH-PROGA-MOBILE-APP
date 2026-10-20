import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Star,
  Folder,
  FolderPlus,
  Layers,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace, Space } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';
import { WorkspaceModal } from '../../components/WorkspaceModal';

export default function SpacesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [spacesData, setSpacesData] = useState<{ workspace: Workspace; spaces: Space[] }[]>([]);
  const [favorites, setFavorites] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [wsList, allSpaces] = await Promise.all([
        workspaceService.getWorkspacesByOwner(user.id),
        workspaceService.getAllUserSpaces(user.id),
      ]);
      setWorkspaces(wsList);
      setSpacesData(allSpaces);
    } catch (err) {
      console.log('Error loading spaces:', err);
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

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
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

  // Flatten spaces
  const allSpaces = spacesData.flatMap((item) =>
    item.spaces.map((sp) => ({
      ...sp,
      workspaceName: item.workspace.name,
    }))
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Jira Header */}
        <JiraHeader
          title="Không gian"
          rightActions={
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
              >
                <Plus size={24} color="#E6EDF3" />
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
              tintColor="#579DFF"
              colors={['#579DFF']}
            />
          }
        >
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#579DFF" />
              <Text style={styles.loadingText}>Đang tải không gian...</Text>
            </View>
          ) : workspaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Layers size={36} color="#579DFF" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có Không gian nào</Text>
              <Text style={styles.emptySubtitle}>
                Tạo Workspace và Space đầu tiên để bắt đầu phân công nhiệm vụ và quản lý dự án cùng đội ngũ.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <FolderPlus size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Tạo Không gian mới</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Section: Đã xem gần đây (hiển thị workspace/space đầu tiên) */}
              {allSpaces.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Đã xem gần đây</Text>
                  <TouchableOpacity
                    style={styles.spaceCard}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/spaces/${allSpaces[0].id}`)}
                  >
                    <View style={[styles.spaceIconWrap, { backgroundColor: '#E65100' }]}>
                      <JiraSlidersIcon size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.spaceInfo}>
                      <Text style={styles.spaceName}>{allSpaces[0].name}</Text>
                      <Text style={styles.spaceKey}>
                        {allSpaces[0].workspaceName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(`sp-${allSpaces[0].id}`)}
                      style={styles.starBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Star
                        size={20}
                        color={favorites[`sp-${allSpaces[0].id}`] ? '#F59E0B' : '#8C9BAB'}
                        fill={favorites[`sp-${allSpaces[0].id}`] ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Đã xem gần đây</Text>
                  <TouchableOpacity
                    style={styles.spaceCard}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/workspaces/${workspaces[0].id}`)}
                  >
                    <View style={[styles.spaceIconWrap, { backgroundColor: '#E65100' }]}>
                      <JiraSlidersIcon size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.spaceInfo}>
                      <Text style={styles.spaceName}>{workspaces[0].name}</Text>
                      <Text style={styles.spaceKey}>
                        {workspaces[0].name.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(`ws-${workspaces[0].id}`)}
                      style={styles.starBtn}
                    >
                      <Star
                        size={20}
                        color={favorites[`ws-${workspaces[0].id}`] ? '#F59E0B' : '#8C9BAB'}
                        fill={favorites[`ws-${workspaces[0].id}`] ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              )}

              {/* Section: Tất cả các không gian (Workspaces & Spaces) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tất cả các không gian</Text>

                <View style={styles.spaceCardGroup}>
                  {workspaces.map((ws, idx) => (
                    <React.Fragment key={ws.id}>
                      {idx > 0 && <View style={styles.groupDivider} />}
                      <TouchableOpacity
                        style={styles.spaceGroupItem}
                        activeOpacity={0.75}
                        onPress={() => router.push(`/workspaces/${ws.id}`)}
                      >
                        <View
                          style={[
                            styles.spaceIconWrap,
                            {
                              backgroundColor:
                                idx % 2 === 0 ? '#E65100' : '#1D3B6A',
                            },
                          ]}
                        >
                          {idx % 2 === 0 ? (
                            <JiraSlidersIcon size={20} color="#FFFFFF" />
                          ) : (
                            <Folder size={20} color="#579DFF" />
                          )}
                        </View>
                        <View style={styles.spaceInfo}>
                          <Text style={styles.spaceName}>{ws.name}</Text>
                          <Text style={styles.spaceKey}>
                            {ws.description || ws.name.toUpperCase()}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => toggleFavorite(`ws-${ws.id}`)}
                          style={styles.starBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Star
                            size={20}
                            color={favorites[`ws-${ws.id}`] ? '#F59E0B' : '#8C9BAB'}
                            fill={favorites[`ws-${ws.id}`] ? '#F59E0B' : 'transparent'}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        <WorkspaceModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
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
    paddingTop: 16,
  },
  iconBtn: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  spaceCardGroup: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22272B',
    overflow: 'hidden',
  },
  spaceGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  groupDivider: {
    height: 1,
    backgroundColor: '#22272B',
    marginLeft: 66,
  },
  spaceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
  },
  spaceKey: {
    color: '#8C9BAB',
    fontSize: 13,
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
    color: '#8C9BAB',
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
