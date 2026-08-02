import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Folder, AlertCircle, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace } from '../../types';
import { WorkspaceCard } from '../../components/WorkspaceCard';
import { WorkspaceModal } from '../../components/WorkspaceModal';

export default function WorkspacesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError('');
      const list = await workspaceService.getWorkspacesByOwner(user.id);
      setWorkspaces(list);
    } catch (err: any) {
      console.error('Error loading workspaces:', err);
      setError('Không thể tải danh sách Workspace. Vui lòng kiểm tra lại kết nối server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkspaces();
  };

  const handleOpenCreateModal = () => {
    setWorkspaceToEdit(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (w: Workspace) => {
    setWorkspaceToEdit(w);
    setModalVisible(true);
  };

  const handleModalSubmit = async (name: string, description: string) => {
    if (!user?.id) return;

    if (workspaceToEdit) {
      // Edit
      const updated = await workspaceService.updateWorkspace(workspaceToEdit.id, {
        name,
        description,
        ownerId: user.id,
      });
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } else {
      // Create
      const newWs = await workspaceService.createWorkspace({
        name,
        description,
        ownerId: user.id,
      });
      setWorkspaces((prev) => [newWs, ...prev]);
    }
  };

  const handleDeleteWorkspace = async (id: number) => {
    try {
      await workspaceService.deleteWorkspace(id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      alert('Không thể xóa Workspace này.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar action */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.subTitle}>QUẢN LÝ HỆ THỐNG</Text>
          <Text style={styles.title}>Danh Sách Workspaces</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleOpenCreateModal}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <AlertCircle size={18} color="#D93025" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Đang tải danh sách Workspace...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {workspaces.length === 0 ? (
            <View style={styles.emptyCard}>
              <Folder size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Chưa có Workspace nào</Text>
              <Text style={styles.emptyDesc}>
                Bắt đầu bằng cách tạo Workspace đầu tiên của bạn để quản lý các Spaces và các nhiệm vụ tích hợp AI Agents.
              </Text>
              <TouchableOpacity style={styles.createFirstBtn} onPress={handleOpenCreateModal}>
                <Text style={styles.createFirstText}>Tạo Workspace đầu tiên</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workspaces.map((w) => (
              <WorkspaceCard
                key={w.id}
                workspace={w}
                onPress={() => router.push(`/workspaces/${w.id}`)}
                onEdit={() => handleOpenEditModal(w)}
                onDelete={() => handleDeleteWorkspace(w.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Workspace Create/Edit Modal */}
      <WorkspaceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
        workspaceToEdit={workspaceToEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F6F5EF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDEDEC',
    borderColor: '#FADBD8',
    borderWidth: 1,
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    color: '#D93025',
    fontSize: 12,
    fontWeight: '600',
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
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    backgroundColor: '#F6F5EF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 18,
  },
  createFirstBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  createFirstText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
