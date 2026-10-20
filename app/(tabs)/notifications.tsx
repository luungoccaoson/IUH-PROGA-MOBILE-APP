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
  MoreVertical,
  CheckCircle2,
  UserPlus,
  Check,
  X,
  Building,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader
          title={tr("Thông báo")}
          rightActions={
            <>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Bell size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Settings size={22} color={colors.text} />
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
                {tr("Tất cả")}</Text>
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
                {tr("Lời mời (")}{pendingWorkspaces.length})
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={onRefresh}
          >
            <MoreVertical size={20} color={colors.subText} />
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
          ) : pendingWorkspaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CheckCircle2 size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{tr("Không có lời mời nào")}</Text>
              <Text style={styles.emptySubtitle}>
                {tr("Bạn chưa có lời mời tham gia workspace nào mới. Lời mời từ trang web sẽ hiển thị ngay tại đây.")}</Text>
            </View>
          ) : (
            <View style={styles.invitationList}>
              <Text style={styles.sectionHeader}>
                {tr("Lời mời tham gia Workspace (")}{pendingWorkspaces.length})
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
                          {tr("LỜI MỜI THAM GIA WORKSPACE")}</Text>
                        <Text style={styles.workspaceName}>{ws.name}</Text>
                      </View>
                    </View>

                    <Text style={styles.inviteDesc}>
                      {ws.description ||
                        tr("Bạn nhận được lời mời tham gia làm thành viên để cùng theo dõi và phát triển các không gian dự án.")}
                    </Text>

                    <Text style={styles.inviteTime}>
                      {tr("Nhận lời mời ngày:")}{' '}{new Date(ws.createdAt).toLocaleDateString(locale)}
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
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    iconBtn: {
      padding: 6,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    invitationList: {
      marginTop: 6,
      gap: 12,
    },
    sectionHeader: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
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
  });
