import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Folder, Calendar, Compass, ChevronRight, Settings } from 'lucide-react-native';
import { workspaceService } from '../../services/workspace.service';
import { Workspace, Space } from '../../types';
import { SpaceModal } from '../../components/SpaceModal';

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const workspaceId = parseInt(id as string, 10);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Space Modal State
  const [spaceModalVisible, setSpaceModalVisible] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setError('');
      const wsData = await workspaceService.getWorkspaceById(workspaceId);
      setWorkspace(wsData);

      const spacesList = await workspaceService.getSpacesByWorkspace(workspaceId);
      setSpaces(spacesList);
    } catch (err: any) {
      console.error('Error loading workspace details:', err);
      setError('Không thể tải thông tin Workspace.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  const handleCreateSpace = async (name: string, startDate?: string, endDate?: string) => {
    if (!workspaceId) return;
    const newSpace = await workspaceService.createSpace({
      workspaceId,
      name,
      startDate,
      endDate,
    });
    setSpaces((prev) => [...prev, newSpace]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Đang tải chi tiết Workspace...</Text>
      </View>
    );
  }

  if (error || !workspace) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Không tìm thấy Workspace.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Workspace Title & Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconTag}>
            <Folder size={20} color="#111827" />
          </View>
          <Text style={styles.wsName}>{workspace.name}</Text>
          <Text style={styles.wsDesc}>
            {workspace.description || 'Chưa có mô tả chi tiết.'}
          </Text>

          <View style={styles.metaRow}>
            <Calendar size={12} color="#6B7280" />
            <Text style={styles.metaText}>
              Tạo ngày: {new Date(workspace.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TỔNG SPACES</Text>
            <Text style={styles.metricValue}>{spaces.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TIẾN ĐỘ CHUNG</Text>
            <Text style={[styles.metricValue, { color: '#137333' }]}>68%</Text>
          </View>
        </View>

        {/* Spaces Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Compass size={16} color="#111827" />
            <Text style={styles.sectionTitle}>Danh Sách Spaces ({spaces.length})</Text>
          </View>

          <TouchableOpacity style={styles.addSpaceBtn} onPress={() => setSpaceModalVisible(true)}>
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.addSpaceText}>Thêm Space</Text>
          </TouchableOpacity>
        </View>

        {/* Spaces List */}
        <View style={styles.spacesList}>
          {spaces.length === 0 ? (
            <View style={styles.emptySpaceBox}>
              <Text style={styles.emptySpaceText}>
                Chưa có Space nào trong Workspace này. Hãy nhấn nút "Thêm Space" để tạo mới.
              </Text>
            </View>
          ) : (
            spaces.map((sp) => {
              const initials = sp.name.substring(0, 2).toUpperCase();
              return (
                <TouchableOpacity
                  key={sp.id}
                  style={styles.spaceCard}
                  onPress={() => router.push(`/spaces/${sp.id}`)}
                >
                  <View style={styles.spaceBadge}>
                    <Text style={styles.spaceBadgeText}>{initials}</Text>
                  </View>
                  <View style={styles.spaceInfo}>
                    <Text style={styles.spaceTitle}>{sp.name}</Text>
                    {!!sp.startDate && (
                      <Text style={styles.spaceDate}>
                        {new Date(sp.startDate).toLocaleDateString('vi-VN')} -{' '}
                        {sp.endDate ? new Date(sp.endDate).toLocaleDateString('vi-VN') : 'vô hạn'}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Create Space Modal */}
      <SpaceModal
        visible={spaceModalVisible}
        onClose={() => setSpaceModalVisible(false)}
        onSubmit={handleCreateSpace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5EF',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F6F5EF',
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#D93025',
    fontWeight: '700',
    marginBottom: 10,
  },
  backBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconTag: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F6F5EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wsName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  wsDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F6F5EF',
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  addSpaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addSpaceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  spacesList: {
    gap: 10,
  },
  emptySpaceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  emptySpaceText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  spaceBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#D1E7DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spaceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#137333',
  },
  spaceInfo: {
    flex: 1,
  },
  spaceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  spaceDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
