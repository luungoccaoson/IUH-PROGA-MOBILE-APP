import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Star,
  Rocket,
  Folder,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';
import { WorkspaceModal } from '../../components/WorkspaceModal';

export default function SpacesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [favorites, setFavorites] = useState<{ [id: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadWorkspaces = async () => {
    if (!user?.id) return;
    try {
      const list = await workspaceService.getWorkspacesByOwner(user.id);
      setWorkspaces(list);
    } catch (err) {
      console.log('Error loading workspaces in spaces screen:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkspaces();
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCreateWorkspace = async (name: string, description: string) => {
    if (!user?.id) return;
    const newWs = await workspaceService.createWorkspace({
      name,
      description,
      ownerId: user.id,
    });
    setWorkspaces((prev) => [newWs, ...prev]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Jira Header */}
        <JiraHeader
          title="Không gian"
          rightActions={
            <>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Search size={22} color="#E6EDF3" />
              </TouchableOpacity>
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
          {/* Section: Đã xem gần đây */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đã xem gần đây</Text>

            <TouchableOpacity
              style={styles.spaceCard}
              activeOpacity={0.75}
              onPress={() => {
                if (workspaces.length > 0) {
                  router.push(`/workspaces/${workspaces[0].id}`);
                }
              }}
            >
              <View style={[styles.spaceIconWrap, { backgroundColor: '#E65100' }]}>
                <JiraSlidersIcon size={20} color="#FFFFFF" />
              </View>
              <View style={styles.spaceInfo}>
                <Text style={styles.spaceName}>
                  {workspaces.length > 0 ? workspaces[0].name : 'PROGA'}
                </Text>
                <Text style={styles.spaceKey}>
                  {workspaces.length > 0 ? workspaces[0].name.toUpperCase() : 'PROGA'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite('recent-1')}
                style={styles.starBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Star
                  size={20}
                  color={favorites['recent-1'] ? '#F59E0B' : '#8C9BAB'}
                  fill={favorites['recent-1'] ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Section: Tất cả các không gian */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tất cả các không gian</Text>

            <View style={styles.spaceCardGroup}>
              {/* Item 1: PROGA */}
              <TouchableOpacity
                style={styles.spaceGroupItem}
                activeOpacity={0.75}
                onPress={() => {
                  if (workspaces.length > 0) {
                    router.push(`/workspaces/${workspaces[0].id}`);
                  }
                }}
              >
                <View style={[styles.spaceIconWrap, { backgroundColor: '#E65100' }]}>
                  <JiraSlidersIcon size={20} color="#FFFFFF" />
                </View>
                <View style={styles.spaceInfo}>
                  <Text style={styles.spaceName}>
                    {workspaces.length > 0 ? workspaces[0].name : 'PROGA'}
                  </Text>
                  <Text style={styles.spaceKey}>
                    {workspaces.length > 0 ? workspaces[0].name.toUpperCase() : 'PROGA'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavorite('space-proga')}
                  style={styles.starBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Star
                    size={20}
                    color={favorites['space-proga'] ? '#F59E0B' : '#8C9BAB'}
                    fill={favorites['space-proga'] ? '#F59E0B' : 'transparent'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.groupDivider} />

              {/* Item 2: Test */}
              <TouchableOpacity
                style={styles.spaceGroupItem}
                activeOpacity={0.75}
                onPress={() => {
                  if (workspaces.length > 1) {
                    router.push(`/workspaces/${workspaces[1].id}`);
                  }
                }}
              >
                <View style={[styles.spaceIconWrap, { backgroundColor: '#1D3B6A' }]}>
                  <Rocket size={20} color="#579DFF" />
                </View>
                <View style={styles.spaceInfo}>
                  <Text style={styles.spaceName}>
                    {workspaces.length > 1 ? workspaces[1].name : 'Test'}
                  </Text>
                  <Text style={styles.spaceKey}>
                    {workspaces.length > 1 ? workspaces[1].name.toUpperCase() : 'TEST'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavorite('space-test')}
                  style={styles.starBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Star
                    size={20}
                    color={favorites['space-test'] ? '#F59E0B' : '#8C9BAB'}
                    fill={favorites['space-test'] ? '#F59E0B' : 'transparent'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Other workspaces dynamically */}
              {workspaces.slice(2).map((w) => (
                <React.Fragment key={w.id}>
                  <View style={styles.groupDivider} />
                  <TouchableOpacity
                    style={styles.spaceGroupItem}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/workspaces/${w.id}`)}
                  >
                    <View style={[styles.spaceIconWrap, { backgroundColor: '#4C6B8B' }]}>
                      <Folder size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.spaceInfo}>
                      <Text style={styles.spaceName}>{w.name}</Text>
                      <Text style={styles.spaceKey}>{w.name.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(`ws-${w.id}`)}
                      style={styles.starBtn}
                    >
                      <Star
                        size={20}
                        color={favorites[`ws-${w.id}`] ? '#F59E0B' : '#8C9BAB'}
                        fill={favorites[`ws-${w.id}`] ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>

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
});
