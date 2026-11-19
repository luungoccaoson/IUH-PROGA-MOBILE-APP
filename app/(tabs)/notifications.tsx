import { translate as tr, useTranslation as useSystemTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CheckCircle2,
  UserPlus,
  Check,
  X,
  CheckCheck,
  Sparkles,
  Clock,
  AlertTriangle,
  ClipboardList,
  Eye,
  CheckSquare,
  ArrowUpCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { notificationService } from '../../services/notification.service';
import { appUpdateService } from '../../services/appUpdate.service';
import { systemNotificationService } from '../../services/systemNotification.service';
import { Workspace, NotificationItem, AppVersionInfo } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { AppUpdateModal } from '../../components/AppUpdateModal';

type NotificationFilter = 'all' | 'tasks' | 'invites' | 'unread';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingWorkspaces, setPendingWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  // App Update State
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Load all notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [notifs, classified] = await Promise.all([
        notificationService.getUserNotifications(user.id),
        workspaceService.getClassifiedWorkspaces(user.id).catch(() => ({ pendingWorkspaces: [] })),
      ]);
      setNotifications(notifs || []);
      setPendingWorkspaces(classified.pendingWorkspaces || []);
    } catch (err) {
      console.log('Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();

    // Auto check for app version updates silently
    appUpdateService.checkUpdate().then(({ hasUpdate, updateInfo }) => {
      if (hasUpdate && updateInfo) {
        setUpdateInfo(updateInfo);
        setUpdateModalVisible(true);
      }
    });
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // Test trigger system notification banner
  const handleTestSystemNotification = async () => {
    const granted = await systemNotificationService.init();
    if (!granted) {
      Alert.alert(
        tr("Cần cấp quyền"),
        tr("Vui lòng cho phép quyền thông báo trong cài đặt để nhận thông báo đẩy.")
      );
      return;
    }
    await systemNotificationService.sendSystemNotification(
      tr("🔔 PROGA: Có lời mời tham gia dự án mới!"),
      tr("Bạn vừa nhận được một lời mời tham gia Workspace mới trên hệ thống.")
    );
  };

  // Check app version manually from button
  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const { hasUpdate, updateInfo } = await appUpdateService.checkUpdate(true);
      if (hasUpdate && updateInfo) {
        setUpdateInfo(updateInfo);
        setUpdateModalVisible(true);
      } else {
        const curVer = appUpdateService.getCurrentVersion();
        Alert.alert(
          tr("Ứng dụng đã là bản mới nhất"),
          tr("Bạn đang sử dụng phiên bản PROGA Mobile v{0}. Hệ thống chưa có bản cập nhật nào mới hơn.", { 0: curVer })
        );
      }
    } catch (err) {
      Alert.alert(tr("Lỗi"), tr("Không thể kiểm tra bản cập nhật. Vui lòng kiểm tra lại kết nối mạng."));
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    try {
      await notificationService.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.log('Error marking as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      Alert.alert(tr("Thành công"), tr("Đã đánh dấu tất cả thông báo là đã đọc."));
    } catch (err) {
      Alert.alert(tr("Lỗi"), tr("Không thể đánh dấu đã đọc tất cả thông báo."));
    }
  };

  // Accept workspace invite
  const handleAccept = async (ws: Workspace) => {
    if (!user?.id) return;
    try {
      setProcessingId(ws.id);
      await workspaceService.acceptInvitation(ws.id, user.id);
      Alert.alert(
        tr("Thành công"),
        tr("Bạn đã chấp nhận lời mời tham gia workspace \"{0}\". Workspace này đã xuất hiện trong danh sách \"Đang tham gia\" ở trang chủ.", { 0: ws.name })
      );
      setPendingWorkspaces((prev) => prev.filter((item) => item.id !== ws.id));
    } catch (err: any) {
      Alert.alert(tr("Lỗi"), tr("Không thể chấp nhận lời mời. Vui lòng thử lại sau."));
    } finally {
      setProcessingId(null);
    }
  };

  // Decline workspace invite
  const handleDecline = async (ws: Workspace) => {
    if (!user?.id) return;
    Alert.alert(
      tr("Xác nhận từ chối"),
      tr("Bạn có chắc chắn muốn từ chối lời mời tham gia workspace \"{0}\"?", { 0: ws.name }),
      [
        { text: tr("Hủy"), style: 'cancel' },
        {
          text: tr("Từ chối"),
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(ws.id);
              await workspaceService.declineInvitation(ws.id, user.id);
              setPendingWorkspaces((prev) => prev.filter((item) => item.id !== ws.id));
            } catch (err) {
              Alert.alert(tr("Lỗi"), tr("Không thể từ chối lời mời."));
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'tasks') {
      return notifications.filter((n) => n.typeCode !== 'WORKSPACE_INVITE');
    }
    if (filter === 'invites') {
      return []; // Only pending workspaces are shown in this tab
    }
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length + pendingWorkspaces.length;
  }, [notifications, pendingWorkspaces]);

  // Helper to render icon by notification type
  const renderNotifIcon = (typeCode?: string) => {
    switch (typeCode) {
      case 'TASK_ASSIGNED':
        return <ClipboardList size={18} color="#0052CC" />;
      case 'TASK_IN_REVIEW':
        return <Eye size={18} color="#D97706" />;
      case 'TASK_APPROVED_DONE':
        return <CheckSquare size={18} color="#16A34A" />;
      case 'DEADLINE_WARNING':
        return <AlertTriangle size={18} color="#DC2626" />;
      default:
        return <Bell size={18} color={colors.primary} />;
    }
  };

  const getNotifColor = (typeCode?: string) => {
    switch (typeCode) {
      case 'TASK_ASSIGNED':
        return { bg: isDark ? '#1E3A8A' : '#DEEBFF', text: '#0052CC' };
      case 'TASK_IN_REVIEW':
        return { bg: isDark ? '#78350F' : '#FEF3C7', text: '#D97706' };
      case 'TASK_APPROVED_DONE':
        return { bg: isDark ? '#14532D' : '#DCFCE7', text: '#16A34A' };
      case 'DEADLINE_WARNING':
        return { bg: isDark ? '#7F1D1D' : '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: colors.primaryBg, text: colors.primary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader
          title={tr("Thông báo")}
          rightActions={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Test System Notification Banner */}
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={handleTestSystemNotification}
              >
                <Bell size={22} color={colors.primary} />
              </TouchableOpacity>

              {/* Check App Version Update Button */}
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={handleManualCheckUpdate}
                disabled={checkingUpdate}
                  >
                    {checkingUpdate ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <ArrowUpCircle size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Mark all as read */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    activeOpacity={0.7}
                    onPress={handleMarkAllAsRead}
                  >
                    <CheckCheck size={22} color={colors.text} />
                  </TouchableOpacity>

                  {/* Settings / Profile */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    activeOpacity={0.7}
                    onPress={() => router.push('/(tabs)/profile')}
                  >
                    <Settings size={22} color={colors.text} />
                  </TouchableOpacity>
              </View>
          }
        />

              {/* Filter Pills Row */}
              <View style={styles.filterRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsGroup}>
                    <TouchableOpacity
                      style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
                      onPress={() => setFilter('all')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
                        {tr("Tất cả")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.filterPill, filter === 'tasks' && styles.filterPillActive]}
                      onPress={() => setFilter('tasks')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterPillText, filter === 'tasks' && styles.filterPillTextActive]}>
                        {tr("Công việc")}
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
                        {tr("Lời mời")} ({pendingWorkspaces.length})
                      </Text>
                    </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, filter === 'unread' && styles.filterPillActive]}
                  onPress={() => setFilter('unread')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, filter === 'unread' && styles.filterPillTextActive]}>
                    {tr("Chưa đọc")} ({unreadCount})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

          {/* Content */}
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
                <Text style={styles.loadingText}>{tr("Đang tải thông báo...")}</Text>
              </View>
            ) : (
                <>
                  {/* 1. SECTION: WORKSPACE INVITATIONS (Shown in 'all' or 'invites' filter) */}
                  {(filter === 'all' || filter === 'invites') && pendingWorkspaces.length > 0 && (
                    <View style={styles.sectionWrap}>
                      <Text style={styles.sectionHeader}>
                        {tr("Lời mời tham gia Workspace")} ({pendingWorkspaces.length})
                      </Text>
                      {pendingWorkspaces.map((ws) => {
                        const isProcessing = processingId === ws.id;
                        return (
                          <View key={`ws-${ws.id}`} style={styles.inviteCard}>
                            <View style={styles.cardHeader}>
                              <View style={styles.avatarWrap}>
                                <UserPlus size={20} color="#FFFFFF" />
                              </View>
                              <View style={styles.cardHeaderInfo}>
                                <Text style={styles.inviteCategory}>
                                  {tr("LỜI MỜI THAM GIA WORKSPACE")}
                                </Text>
                                <Text style={styles.workspaceName}>{ws.name}</Text>
                              </View>
                            </View>

                                  <Text style={styles.inviteDesc}>
                                    {ws.description ||
                                      tr("Bạn nhận được lời mời tham gia làm thành viên để cùng theo dõi và phát triển các không gian dự án.")}
                                  </Text>

                                  <Text style={styles.inviteTime}>
                                    {tr("Nhận ngày:")} {new Date(ws.createdAt).toLocaleDateString(locale)}
                                  </Text>

                                  <View style={styles.actionRow}>
                                    <TouchableOpacity
                                      style={[styles.btnDecline, isProcessing && styles.btnDisabled]}
                                      onPress={() => handleDecline(ws)}
                                      disabled={isProcessing}
                                      activeOpacity={0.8}
                                    >
                                      <X size={15} color="#F87171" style={{ marginRight: 4 }} />
                                      <Text style={styles.btnDeclineText}>{tr("Từ chối")}</Text>
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
                                            <Text style={styles.btnAcceptText}>{tr("Chấp nhận")}</Text>
                                          </>
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                  );
                  })}
                                </View>
                              )
                            }

              {/* 2. SECTION: SYSTEM & TASK UPDATE NOTIFICATIONS */ }
              { filter !== 'invites' && filteredNotifications.length > 0 && (
                                <View style={styles.sectionWrap}>
                                  <Text style={styles.sectionHeader}>
                                    {tr("Thông báo cập nhật")} ({filteredNotifications.length})
                                  </Text>
                                  {filteredNotifications.map((item) => {
                                    const theme = getNotifColor(item.typeCode);
                                    return (
                                      <TouchableOpacity
                                        key={`notif-${item.id}`}
                                        style={[
                                          styles.notifCard,
                                          !item.isRead && styles.notifCardUnread,
                                        ]}
                                        activeOpacity={0.7}
                                        onPress={() => handleMarkAsRead(item)}
                                      >
                                        <View style={styles.notifRow}>
                                          <View style={[styles.notifIconCircle, { backgroundColor: theme.bg }]}>
                                            {renderNotifIcon(item.typeCode)}
                                          </View>
                                          <View style={styles.notifBody}>
                                            <View style={styles.notifMetaRow}>
                                              <Text style={[styles.notifTypeLabel, { color: theme.text }]}>
                                                {item.typeLabel || item.typeCode || tr("THÔNG BÁO")}
                                              </Text>
                                              {!item.isRead && <View style={styles.unreadDot} />}
                                            </View>
                                            <Text style={styles.notifTitle}>{item.title}</Text>
                                            <Text style={styles.notifContent}>{item.content}</Text>
                                            <Text style={styles.notifDate}>
                                              {item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : ''}
                                            </Text>
                                          </View>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              )}

              {/* Empty state when no notifications */ }
                        {
                          ((filter === 'invites' && pendingWorkspaces.length === 0) ||
                            (filter !== 'invites' && filteredNotifications.length === 0 && pendingWorkspaces.length === 0)) && (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <CheckCircle2 size={40} color={colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>{tr("Không có thông báo mới")}</Text>
                  <Text style={styles.emptySubtitle}>
                    {tr("Tất cả các thông báo cập nhật công việc, phân công và lời mời tham gia dự án sẽ hiển thị tại đây.")}
                  </Text>
                </View>
                  )}
                </>
          )}

                <View style={{ height: 40 }} />
              </ScrollView>
      </View>

          {/* App Update Popup Modal */}
          <AppUpdateModal
            visible={updateModalVisible}
            updateInfo={updateInfo}
            onClose={() => setUpdateModalVisible(false)}
          />
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
        iconBtn: {
          padding: 6,
    },
        filterRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
        pillsGroup: {
          flexDirection: 'row',
        gap: 8,
    },
        filterPill: {
          backgroundColor: colors.cardBg,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
        filterPillActive: {
          backgroundColor: colors.segmentActiveBg,
        borderColor: colors.primary,
    },
        filterPillBadge: {
          borderColor: colors.primary,
    },
        filterPillBadgeText: {
          color: colors.primary,
        fontWeight: '700',
    },
        filterPillText: {
          color: colors.subText,
        fontSize: 13,
        fontWeight: '600',
    },
        filterPillTextActive: {
          color: colors.primary,
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
          color: colors.subText,
        fontSize: 13,
        marginTop: 10,
    },
          sectionWrap: {
          marginTop: 6,
        marginBottom: 12,
        gap: 10,
    },
        sectionHeader: {
          color: colors.subText,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
        inviteCard: {
          backgroundColor: colors.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
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
        backgroundColor: colors.primaryBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
        cardHeaderInfo: {
          flex: 1,
    },
        inviteCategory: {
          color: colors.primary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
        workspaceName: {
          color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
    },
        inviteDesc: {
          color: colors.subText,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
        inviteTime: {
          color: colors.mutedText,
        fontSize: 11,
        marginBottom: 14,
    },
        actionRow: {
          flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 12,
    },
        btnDecline: {
          flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.dangerBg,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
        btnDeclineText: {
          color: colors.dangerText,
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
        // System notification card
        notifCard: {
          backgroundColor: colors.cardBg,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
        notifCardUnread: {
          borderColor: colors.primary,
        backgroundColor: isDark ? '#111B27' : '#F4F8FF',
    },
        notifRow: {
          flexDirection: 'row',
        alignItems: 'flex-start',
    },
        notifIconCircle: {
          width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
        notifBody: {
          flex: 1,
    },
        notifMetaRow: {
          flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
        notifTypeLabel: {
          fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
        unreadDot: {
          width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
        notifTitle: {
          color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 19,
    },
        notifContent: {
          color: colors.subText,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 6,
    },
        notifDate: {
          color: colors.mutedText,
        fontSize: 11,
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
        lineHeight: 19,
        maxWidth: 280,
    },
  });
