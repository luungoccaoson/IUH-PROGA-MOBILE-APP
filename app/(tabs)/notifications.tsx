import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Settings,
  MoreVertical,
  CheckCircle2,
  UserPlus,
  Check,
  X,
  Building,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [pendingWorkspaces, setPendingWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'invites'>('all');

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const classified = await workspaceService.getClassifiedWorkspaces(user.id);
      setPendingWorkspaces(classified.pendingWorkspaces || []);
    } catch (err) {
      console.log('Error loading notifications/invitations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleAccept = async (ws: Workspace) => {
    if (!user?.id) return;
    try {
      setProcessingId(ws.id);
      await workspaceService.acceptInvitation(ws.id, user.id);
      Alert.alert(
        'Thành công',
        `Bạn đã chấp nhận lời mời tham gia workspace "${ws.name}". Workspace này đã xuất hiện trong danh sách "Đang tham gia" ở trang chủ.`
      );
      setPendingWorkspaces((prev) => prev.filter((item) => item.id !== ws.id));
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời. Vui lòng thử lại sau.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (ws: Workspace) => {
    if (!user?.id) return;
    Alert.alert(
      'Xác nhận từ chối',
      `Bạn có chắc chắn muốn từ chối lời mời tham gia workspace "${ws.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(ws.id);
              await workspaceService.declineInvitation(ws.id, user.id);
              setPendingWorkspaces((prev) => prev.filter((item) => item.id !== ws.id));
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể từ chối lời mời.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader
          title="Thông báo"
          rightActions={
            <>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Bell size={22} color="#E6EDF3" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Settings size={22} color="#E6EDF3" />
              </TouchableOpacity>
            </>
          }
        />

        {/* Filter Pills Row */}
        <View style={styles.filterRow}>
          <View style={styles.pillsGroup}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                filter === 'all' && styles.filterPillActive,
              ]}
              onPress={() => setFilter('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === 'all' && styles.filterPillTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filter === 'invites' && styles.filterPillActive,
                pendingWorkspaces.length > 0 && styles.filterPillBadge,
              ]}
              onPress={() => setFilter('invites')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === 'invites' && styles.filterPillTextActive,
                  pendingWorkspaces.length > 0 && styles.filterPillBadgeText,
                ]}
              >
                Lời mời ({pendingWorkspaces.length})
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={onRefresh}
          >
            <MoreVertical size={20} color="#8C9BAB" />
          </TouchableOpacity>
        </View>

        {/* Content */}
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
              <Text style={styles.loadingText}>Đang tải thông báo...</Text>
            </View>
          ) : pendingWorkspaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CheckCircle2 size={40} color="#579DFF" />
              </View>
              <Text style={styles.emptyTitle}>Không có lời mời nào</Text>
              <Text style={styles.emptySubtitle}>
                Bạn chưa có lời mời tham gia workspace nào mới. Lời mời từ trang web sẽ hiển thị ngay tại đây.
              </Text>
            </View>
          ) : (
            <View style={styles.invitationList}>
              <Text style={styles.sectionHeader}>
                Lời mời tham gia Workspace ({pendingWorkspaces.length})
              </Text>

              {pendingWorkspaces.map((ws) => {
                const isProcessing = processingId === ws.id;
                return (
                  <View key={ws.id} style={styles.inviteCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarWrap}>
                        <UserPlus size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.cardHeaderInfo}>
                        <Text style={styles.inviteCategory}>
                          LỜI MỜI THAM GIA WORKSPACE
                        </Text>
                        <Text style={styles.workspaceName}>{ws.name}</Text>
                      </View>
                    </View>

                    <Text style={styles.inviteDesc}>
                      {ws.description ||
                        'Bạn nhận được lời mời tham gia làm thành viên để cùng theo dõi và phát triển các không gian dự án.'}
                    </Text>

                    <Text style={styles.inviteTime}>
                      Nhận lời mời ngày: {new Date(ws.createdAt).toLocaleDateString('vi-VN')}
                    </Text>

                    {/* Actions */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.btnDecline, isProcessing && styles.btnDisabled]}
                        onPress={() => handleDecline(ws)}
                        disabled={isProcessing}
                        activeOpacity={0.8}
                      >
                        <X size={15} color="#F87171" style={{ marginRight: 4 }} />
                        <Text style={styles.btnDeclineText}>Từ chối</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnAccept, isProcessing && styles.btnDisabled]}
                        onPress={() => handleAccept(ws)}
                        disabled={isProcessing}
                        activeOpacity={0.8}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Check size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.btnAcceptText}>Chấp nhận</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
  iconBtn: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#1C2127',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  filterPillActive: {
    backgroundColor: '#22272B',
    borderColor: '#38414A',
  },
  filterPillBadge: {
    borderColor: '#1D3B6A',
  },
  filterPillBadgeText: {
    color: '#579DFF',
    fontWeight: '700',
  },
  filterPillText: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#E6EDF3',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    lineHeight: 19,
    maxWidth: 280,
  },
  invitationList: {
    marginTop: 6,
    gap: 12,
  },
  sectionHeader: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inviteCard: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1D3B6A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  inviteCategory: {
    color: '#579DFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  workspaceName: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  inviteDesc: {
    color: '#8C9BAB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  inviteTime: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#282E33',
    paddingTop: 12,
  },
  btnDecline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282E33',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnDeclineText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  btnAccept: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#137333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 100,
    justifyContent: 'center',
  },
  btnAcceptText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
