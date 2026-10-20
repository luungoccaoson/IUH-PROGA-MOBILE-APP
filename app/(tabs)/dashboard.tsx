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
import { useRouter } from 'expo-router';
import { RotateCw, SquareCheck, Activity } from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { Task } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [assignedTasks, setAssignedTasks] = useState<
    { task: Task; spaceName: string; workspaceName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const allTasks = await workspaceService.getAllUserTasks(user.id);
      // Filter tasks assigned to current user, or user's active tasks
      const myTasks = allTasks.filter(
        (item) => !item.task.ownerId || item.task.ownerId === user.id
      );
      setAssignedTasks(myTasks);
    } catch (err) {
      console.log('Error loading dashboard data:', err);
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

  const userInitial = user?.username
    ? user.username.substring(0, 1).toUpperCase()
    : 'U';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader title="Bảng thông tin" />

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
          {/* Card: Assigned to Me */}
          <View style={styles.assignedCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.assignedTitle}>Assigned to Me</Text>
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.reloadBtn}
                activeOpacity={0.7}
              >
                <RotateCw size={16} color="#579DFF" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator
                size="small"
                color="#579DFF"
                style={{ marginVertical: 12 }}
              />
            ) : assignedTasks.length === 0 ? (
              <View style={styles.assignedEmptyBox}>
                <Text style={styles.assignedEmptyText}>
                  Không tìm thấy hạng mục công việc phù hợp.
                </Text>
              </View>
            ) : (
              <View style={styles.tasksList}>
                {assignedTasks.slice(0, 5).map(({ task, spaceName }) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    activeOpacity={0.75}
                    onPress={() => router.push('/(tabs)/tasks')}
                  >
                    <SquareCheck
                      size={18}
                      color={task.status === 'DONE' ? '#579DFF' : '#8C9BAB'}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.taskTitle,
                          task.status === 'DONE' && styles.strikeThrough,
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      <Text style={styles.taskMeta}>
                        #{task.id} • {spaceName} • {task.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Section: Luồng hoạt động */}
          <View style={styles.activitySection}>
            <Text style={styles.activitySectionTitle}>Luồng hoạt động</Text>

            <View style={styles.activityBox}>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#579DFF"
                  style={{ marginVertical: 20 }}
                />
              ) : assignedTasks.length === 0 ? (
                <View style={styles.emptyActivityBox}>
                  <Activity size={32} color="#8C9BAB" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyActivityTitle}>
                    Chưa có hoạt động nào được ghi nhận
                  </Text>
                  <Text style={styles.emptyActivitySub}>
                    Các cập nhật trạng thái và thay đổi công việc sẽ tự động hiển thị tại đây khi dự án hoạt động.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.dateGroupHeader}>Hoạt động gần đây</Text>
                  {assignedTasks.map(({ task, spaceName }) => (
                    <View key={task.id} style={styles.activityItem}>
                      <View style={styles.itemAvatar}>
                        <Text style={styles.itemAvatarText}>{userInitial}</Text>
                      </View>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemMessage}>
                          Đang xử lý nhiệm vụ "{task.title}" tại {spaceName}
                        </Text>
                        <View style={styles.itemMetaRow}>
                          <View style={styles.issueKeyBadge}>
                            <Text style={styles.issueKeyText}>#{task.id}</Text>
                          </View>
                          <View style={styles.dateWrap}>
                            <SquareCheck
                              size={13}
                              color="#579DFF"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.itemDateText}>
                              {task.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

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
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    assignedCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 20,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    assignedTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    reloadBtn: {
      padding: 4,
    },
    assignedEmptyBox: {
      paddingVertical: 10,
    },
    assignedEmptyText: {
      color: colors.subText,
      fontSize: 13,
      lineHeight: 18,
    },
    tasksList: {
      gap: 10,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    taskTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    strikeThrough: {
      textDecorationLine: 'line-through',
      color: colors.mutedText,
    },
    taskMeta: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },
    activitySection: {
      marginBottom: 24,
    },
    activitySectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
    },
    activityBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyActivityBox: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 12,
    },
    emptyActivityTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyActivitySub: {
      color: colors.subText,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 17,
    },
    dateGroupHeader: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 14,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    itemAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    itemAvatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    itemDetails: {
      flex: 1,
    },
    itemMessage: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '500',
    },
    itemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 12,
    },
    issueKeyBadge: {
      backgroundColor: colors.cardInner,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    issueKeyText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },
    dateWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemDateText: {
      color: colors.subText,
      fontSize: 12,
    },
  });
