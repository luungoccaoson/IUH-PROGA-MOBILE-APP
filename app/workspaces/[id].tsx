import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Folder,
  Calendar,
  Compass,
  ChevronRight,
  Settings,
  CheckCircle2,
  Layers,
  UserPlus,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { workspaceService } from '../../services/workspace.service';
import { Workspace, Space } from '../../types';
import { SpaceModal } from '../../components/SpaceModal';
import { WorkspaceModal } from '../../components/WorkspaceModal';
import { AddWorkspaceMemberModal } from '../../components/AddWorkspaceMemberModal';

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const workspaceId = parseInt(id as string, 10);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, percent: 0 });
  const [existingMemberIds, setExistingMemberIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modals State
  const [spaceModalVisible, setSpaceModalVisible] = useState(false);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [editWsModalVisible, setEditWsModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setError('');
      const wsData = await workspaceService.getWorkspaceById(workspaceId);
      setWorkspace(wsData);

      const [spacesList, membersList] = await Promise.all([
        workspaceService.getSpacesByWorkspace(workspaceId).catch(() => []),
        workspaceService.getWorkspaceMembers(workspaceId).catch(() => []),
      ]);
      setSpaces(spacesList);

      const memberIds: number[] = (membersList || [])
        .map((m: any) => m.id?.userId || m.userId)
        .filter((uid): uid is number => typeof uid === 'number');

      if (wsData?.ownerId && !memberIds.includes(wsData.ownerId)) {
        memberIds.push(wsData.ownerId);
      }
      setExistingMemberIds(memberIds);

      // Fetch all tasks across spaces in this workspace to calculate true overall progress
      try {
        const spaceTasksList = await Promise.all(
          spacesList.map((sp) => workspaceService.getTasksBySpace(sp.id).catch(() => []))
        );
        const allTasks = spaceTasksList.flat();
        const total = allTasks.length;
        const done = allTasks.filter((t) => t.status === 'DONE').length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        setTaskStats({ total, done, percent });
      } catch {
        setTaskStats({ total: 0, done: 0, percent: 0 });
      }
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
    loadDetails();
  };

  const handleUpdateWorkspace = async (name: string, description: string) => {
    if (!workspace) return;
    try {
      const updated = await workspaceService.updateWorkspace(workspace.id, {
        name,
        description,
        ownerId: workspace.ownerId,
      });
      setWorkspace(updated);
      Alert.alert('Thành công', 'Thông tin Workspace đã được cập nhật.');
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể cập nhật thông tin Workspace.');
    }
  };

  const handleDeleteWorkspace = () => {
    if (!workspace) return;
    Alert.alert(
      'Xác nhận xóa Workspace',
      `Bạn có chắc chắn muốn xóa "${workspace.name}"? Toàn bộ các không gian và công việc bên trong sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await workspaceService.deleteWorkspace(workspace.id);
              Alert.alert('Thành công', 'Đã xóa Workspace thành công.');
              router.back();
            } catch (e: any) {
              Alert.alert('Lỗi', e.response?.data?.message || 'Không thể xóa Workspace này.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#101214" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#579DFF" />
          <Text style={styles.loadingText}>Đang tải chi tiết Workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workspace) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#101214" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Không tìm thấy Workspace.'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Custom Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#E6EDF3" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workspace.name}
            </Text>
            <Text style={styles.headerSub}>Chi Tiết Workspace</Text>
          </View>

          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => setSettingsMenuVisible(true)}
          >
            <Settings size={20} color="#8C9BAB" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
          {/* Workspace Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoTopRow}>
              <View style={styles.iconTag}>
                <Folder size={22} color="#579DFF" />
              </View>
              <View style={styles.infoTitleWrap}>
                <Text style={styles.wsName}>{workspace.name}</Text>
                <Text style={styles.wsDesc}>
                  {workspace.description || 'Chưa có mô tả chi tiết cho Workspace này.'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Calendar size={14} color="#8C9BAB" />
              <Text style={styles.metaText}>
                Tạo ngày: {new Date(workspace.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>TỔNG SPACES</Text>
                <Layers size={16} color="#8C9BAB" />
              </View>
              <Text style={styles.metricValue}>{spaces.length}</Text>
              <Text style={styles.metricSubText}>Không gian làm việc</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>TIẾN ĐỘ CHUNG</Text>
                <CheckCircle2 size={16} color="#57D9A3" />
              </View>
              <Text style={[styles.metricValue, { color: '#57D9A3' }]}>
                {taskStats.percent}%
              </Text>
              <Text style={styles.metricSubText}>
                {taskStats.total > 0
                  ? `${taskStats.done}/${taskStats.total} việc hoàn thành`
                  : 'Chưa có công việc'}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          {taskStats.total > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${taskStats.percent}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Spaces Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Compass size={18} color="#579DFF" />
              <Text style={styles.sectionTitle}>Danh Sách Spaces ({spaces.length})</Text>
            </View>

            <TouchableOpacity
              style={styles.addSpaceBtn}
              onPress={() => setSpaceModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.addSpaceText}>Thêm Space</Text>
            </TouchableOpacity>
          </View>

          {/* Spaces List */}
          <View style={styles.spacesList}>
            {spaces.length === 0 ? (
              <View style={styles.emptySpaceBox}>
                <Compass size={32} color="#8C9BAB" style={{ marginBottom: 10 }} />
                <Text style={styles.emptySpaceTitle}>Chưa có Space nào</Text>
                <Text style={styles.emptySpaceText}>
                  Hãy nhấn nút "Thêm Space" để tạo không gian quản lý dự án cho Workspace này.
                </Text>
              </View>
            ) : (
              spaces.map((sp) => {
                const initials = sp.name.substring(0, 2).toUpperCase();
                return (
                  <TouchableOpacity
                    key={sp.id}
                    style={styles.spaceCard}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/spaces/${sp.id}`)}
                  >
                    <View style={styles.spaceBadge}>
                      <Text style={styles.spaceBadgeText}>{initials}</Text>
                    </View>
                    <View style={styles.spaceInfo}>
                      <Text style={styles.spaceTitle} numberOfLines={1}>
                        {sp.name}
                      </Text>
                      <Text style={styles.spaceDate}>
                        {sp.startDate
                          ? new Date(sp.startDate).toLocaleDateString('vi-VN')
                          : 'Chưa đặt'}{' '}
                        →{' '}
                        {sp.endDate
                          ? new Date(sp.endDate).toLocaleDateString('vi-VN')
                          : 'Không thời hạn'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#8C9BAB" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Create Space Modal */}
        <SpaceModal
          visible={spaceModalVisible}
          onClose={() => setSpaceModalVisible(false)}
          onSubmit={handleCreateSpace}
        />

        {/* Edit Workspace Modal */}
        <WorkspaceModal
          visible={editWsModalVisible}
          onClose={() => setEditWsModalVisible(false)}
          onSubmit={handleUpdateWorkspace}
          workspaceToEdit={workspace}
        />

        {/* Add Member to Workspace Modal */}
        <AddWorkspaceMemberModal
          visible={addMemberModalVisible}
          workspaceId={workspaceId}
          existingMemberIds={existingMemberIds}
          onClose={() => setAddMemberModalVisible(false)}
          onMemberInvited={loadDetails}
        />

        {/* Settings Action Sheet Modal */}
        <Modal
          visible={settingsMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSettingsMenuVisible(false)}
          >
            <View style={styles.actionSheetContainer}>
              <View style={styles.actionSheetHeader}>
                <View style={styles.actionSheetIndicator} />
                <Text style={styles.actionSheetTitle}>Cài đặt Workspace</Text>
                <Text style={styles.actionSheetSub}>{workspace.name}</Text>
              </View>

              {/* Action 1: Thêm thành viên */}
              <TouchableOpacity
                style={styles.actionItem}
                activeOpacity={0.7}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  setAddMemberModalVisible(true);
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: '#1D3B6A' }]}>
                  <UserPlus size={18} color="#579DFF" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Thêm thành viên</Text>
                  <Text style={styles.actionDesc}>
                    Mời người dùng khác tham gia vào Workspace này
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Action 2: Chỉnh sửa thông tin workspace */}
              <TouchableOpacity
                style={styles.actionItem}
                activeOpacity={0.7}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  setEditWsModalVisible(true);
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: '#282E33' }]}>
                  <Edit3 size={18} color="#E6EDF3" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Chỉnh sửa Workspace</Text>
                  <Text style={styles.actionDesc}>
                    Thay đổi tên và mô tả của Workspace
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              {/* Action 3: Xóa workspace */}
              <TouchableOpacity
                style={styles.actionItem}
                activeOpacity={0.7}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  handleDeleteWorkspace();
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: '#3A1414' }]}>
                  <Trash2 size={18} color="#EF4444" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
                    Xóa Workspace
                  </Text>
                  <Text style={styles.actionDesc}>
                    Xóa vĩnh viễn Workspace này và toàn bộ các Spaces bên trong
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={() => setSettingsMenuVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelActionBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  headerBar: {
    height: 56,
    backgroundColor: '#101214',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#22272B',
  },
  headerIconBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#8C9BAB',
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#101214',
  },
  loadingText: {
    fontSize: 13,
    color: '#8C9BAB',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '700',
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: '#1D3B6A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#579DFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#1C2127',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconTag: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1D3B6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitleWrap: {
    flex: 1,
  },
  wsName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E6EDF3',
    marginBottom: 4,
  },
  wsDesc: {
    fontSize: 13,
    color: '#8C9BAB',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#22272B',
  },
  metaText: {
    fontSize: 12,
    color: '#8C9BAB',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C9BAB',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#E6EDF3',
    marginVertical: 4,
  },
  metricSubText: {
    fontSize: 11,
    color: '#626F86',
    fontWeight: '500',
  },
  progressCard: {
    backgroundColor: '#1C2127',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#161A1D',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#57D9A3',
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E6EDF3',
  },
  addSpaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C66E4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  addSpaceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  spacesList: {
    gap: 10,
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  spaceBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1D3B6A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spaceBadgeText: {
    color: '#579DFF',
    fontSize: 13,
    fontWeight: '800',
  },
  spaceInfo: {
    flex: 1,
  },
  spaceTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '700',
  },
  spaceDate: {
    color: '#8C9BAB',
    fontSize: 11,
    marginTop: 3,
  },
  emptySpaceBox: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282E33',
  },
  emptySpaceTitle: {
    color: '#E6EDF3',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySpaceText: {
    color: '#8C9BAB',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#1C2127',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  actionSheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38414A',
    marginBottom: 12,
  },
  actionSheetTitle: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '800',
  },
  actionSheetSub: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '700',
  },
  actionDesc: {
    color: '#8C9BAB',
    fontSize: 11,
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#22272B',
    marginVertical: 6,
  },
  cancelActionBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161A1D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  cancelActionBtnText: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
  },
});
