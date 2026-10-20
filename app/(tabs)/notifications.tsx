import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Settings,
  MoreVertical,
  SquareCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { JiraHeader } from '../../components/jira/JiraHeader';

interface NotificationItem {
  id: string;
  isUnread: boolean;
  avatarText: string;
  avatarColor: string;
  hasCommentBadge?: boolean;
  actionTitle: string;
  timeAgo: string;
  issueKey: string;
  issueTitle: string;
  expandedCount?: number;
  subItems?: string[];
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    isUnread: true,
    avatarText: 'S',
    avatarColor: '#F59E0B',
    hasCommentBadge: true,
    actionTitle: 'Sonarro changed a task from In Progress to Done',
    timeAgo: '2 tuần',
    issueKey: 'PROGA-61',
    issueTitle: 'Cải thiện UI chat AI + gi...',
    expandedCount: 6,
    subItems: [
      'Thay đổi trạng thái thành Hoàn thành',
      'Cập nhật comment giải pháp tối ưu token',
      'Đính kèm kết quả benchmark hiệu năng',
      'Đánh dấu hoàn thành sprint milestone',
      'Gửi thông báo đến thành viên liên quan',
      'Đóng nhánh tính năng',
    ],
  },
  {
    id: '2',
    isUnread: true,
    avatarText: 'S',
    avatarColor: '#F59E0B',
    hasCommentBadge: true,
    actionTitle: 'Sonarro changed a task from In Progress to In Progress',
    timeAgo: '2 tuần',
    issueKey: 'PROGA-62',
    issueTitle: 'Chỉnh mindmap theo ch...',
    expandedCount: 2,
    subItems: [
      'Cập nhật nhánh UI mindmap tương tác',
      'Sửa lỗi hiển thị trên màn hình nhỏ',
    ],
  },
  {
    id: '3',
    isUnread: true,
    avatarText: 'S',
    avatarColor: '#F59E0B',
    actionTitle: 'Sonarro assigned a task to you',
    timeAgo: '2 tuần',
    issueKey: 'PROGA-65',
    issueTitle: 'Phân chia công việc tự ...',
  },
  {
    id: '4',
    isUnread: true,
    avatarText: 'S',
    avatarColor: '#F59E0B',
    actionTitle: 'Sonarro assigned a task to you',
    timeAgo: '2 tuần',
    issueKey: 'PROGA-64',
    issueTitle: 'Update AI phân rã cho s...',
  },
  {
    id: '5',
    isUnread: true,
    avatarText: 'S',
    avatarColor: '#F59E0B',
    actionTitle: 'Sonarro updated a task',
    timeAgo: '2 tuần',
    issueKey: 'PROGA-63',
    issueTitle: 'Chỉnh chức năng xóa m...',
    expandedCount: 1,
    subItems: ['Bổ sung confirm dialog trước khi xoá'],
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'direct' | 'unread'>('direct');
  const [expandedMap, setExpandedMap] = useState<{ [id: string]: boolean }>({});

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
                filter === 'direct' && styles.filterPillActive,
              ]}
              onPress={() => setFilter('direct')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === 'direct' && styles.filterPillTextActive,
                ]}
              >
                Trực tiếp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filter === 'unread' && styles.filterPillActive,
              ]}
              onPress={() => setFilter('unread')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === 'unread' && styles.filterPillTextActive,
                ]}
              >
                Chưa đọc
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <MoreVertical size={20} color="#8C9BAB" />
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.groupHeader}>Tháng này</Text>

          {NOTIFICATIONS.map((item) => {
            const isExpanded = !!expandedMap[item.id];

            return (
              <View key={item.id} style={styles.notifCard}>
                <View style={styles.cardHeaderRow}>
                  {/* Left: Unread Indicator & Avatar */}
                  <View style={styles.avatarWrap}>
                    {item.isUnread && <View style={styles.unreadDot} />}
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: item.avatarColor },
                      ]}
                    >
                      <Text style={styles.avatarText}>{item.avatarText}</Text>
                    </View>

                    {item.hasCommentBadge && (
                      <View style={styles.commentBadge}>
                        <MessageSquare size={10} color="#FFFFFF" fill="#1C2127" />
                      </View>
                    )}
                  </View>

                  {/* Right Header content */}
                  <View style={styles.headerInfo}>
                    <Text style={styles.actionTitle} numberOfLines={2}>
                      {item.actionTitle}
                    </Text>
                  </View>

                  <View style={styles.timeMoreWrap}>
                    <Text style={styles.timeAgoText}>{item.timeAgo}</Text>
                    <TouchableOpacity style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MoreVertical size={16} color="#8C9BAB" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Inner Issue Reference Card */}
                <View style={styles.innerIssueCard}>
                  <SquareCheck size={18} color="#579DFF" style={{ marginRight: 8 }} />
                  <Text style={styles.innerIssueText} numberOfLines={1}>
                    {item.issueKey} • {item.issueTitle}
                  </Text>
                </View>

                {/* Collapsible Subitems */}
                {isExpanded && item.subItems && (
                  <View style={styles.subItemsBox}>
                    {item.subItems.map((sub, i) => (
                      <View key={i} style={styles.subItemRow}>
                        <View style={styles.subItemBullet} />
                        <Text style={styles.subItemText}>{sub}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Expand / Collapse Pill */}
                {item.expandedCount !== undefined && (
                  <View style={styles.expandRow}>
                    <TouchableOpacity
                      style={styles.expandPill}
                      onPress={() => toggleExpand(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.expandPillText}>
                        {isExpanded ? 'Thu gọn' : `Xem +${item.expandedCount}`}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color="#579DFF" />
                      ) : (
                        <ChevronDown size={14} color="#579DFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

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
  groupHeader: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  notifCard: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    left: -14,
    top: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#579DFF',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  commentBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#282E33',
    borderRadius: 8,
    padding: 2,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  actionTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  timeMoreWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeAgoText: {
    color: '#8C9BAB',
    fontSize: 12,
  },
  moreBtn: {
    padding: 2,
    marginTop: 2,
  },
  innerIssueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A1D',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginLeft: 48,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  innerIssueText: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  subItemsBox: {
    marginLeft: 48,
    marginTop: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#282E33',
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  subItemBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#579DFF',
    marginRight: 8,
  },
  subItemText: {
    color: '#8C9BAB',
    fontSize: 12,
  },
  expandRow: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A1D',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  expandPillText: {
    color: '#579DFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
