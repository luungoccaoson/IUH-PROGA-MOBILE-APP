import React, { useState } from 'react';
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
import { RotateCw, SquareCheck } from 'lucide-react-native';
import { JiraHeader } from '../../components/jira/JiraHeader';

interface ActivityItem {
  id: string;
  avatarText: string;
  avatarColor: string;
  message: string;
  issueKey?: string;
  date: string;
}

const ACTIVITIES_GROUP_1: ActivityItem[] = [
  {
    id: '1',
    avatarText: 'S',
    avatarColor: '#F59E0B',
    message: "Sonarro đã thay đổi Assignee thành ' Sonarro ' trên PROGA-66 - abc",
    issueKey: 'PROGA-66',
    date: '19 thg 10 2026',
  },
  {
    id: '2',
    avatarText: 'S',
    avatarColor: '#F59E0B',
    message: 'Sonarro đã thay đổi trạng thái thành In Progress vào ngày PROGA-66 - abc',
    issueKey: 'PROGA-66',
    date: '19 thg 10 2026',
  },
  {
    id: '3',
    avatarText: 'S',
    avatarColor: '#F59E0B',
    message: "Sonarro đã thay đổi Summary trong số PROGA-66 thành ' Logic phân chia task tự động '",
    issueKey: 'PROGA-66',
    date: '19 thg 10 2026',
  },
];

const ACTIVITIES_GROUP_2: ActivityItem[] = [
  {
    id: '4',
    avatarText: 'S',
    avatarColor: '#F59E0B',
    message: 'Sonarro đã tạo ra PROGA-66 - abc',
    issueKey: 'PROGA-66',
    date: '05 thg 10 2026',
  },
  {
    id: '5',
    avatarText: 'S',
    avatarColor: '#F59E0B',
    message:
      "Sonarro changed the status to Done on PROGA-61 - Cải thiện UI chat AI + giới hạn score, trang và size file with a resolution of 'Hoàn thành'",
    date: '05 thg 10 2026',
  },
];

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
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
              tintColor="#579DFF"
              colors={['#579DFF']}
            />
          }
        >
          {/* Card: Assigned to Me */}
          <View style={styles.assignedCard}>
            <Text style={styles.assignedTitle}>Assigned to Me</Text>
            <View style={styles.assignedContentRow}>
              <Text style={styles.assignedEmptyText}>
                Không tìm thấy hạng mục công việc phù hợp.
              </Text>
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.reloadBtn}
                activeOpacity={0.7}
              >
                <RotateCw size={18} color="#579DFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: Luồng hoạt động */}
          <View style={styles.activitySection}>
            <Text style={styles.activitySectionTitle}>Luồng hoạt động</Text>

            <View style={styles.activityBox}>
              {/* Group: 19 tháng 10 */}
              <Text style={styles.dateGroupHeader}>19 tháng 10</Text>

              {ACTIVITIES_GROUP_1.map((item, index) => (
                <View key={item.id} style={styles.activityItem}>
                  {/* Left Avatar */}
                  <View
                    style={[
                      styles.itemAvatar,
                      { backgroundColor: item.avatarColor },
                    ]}
                  >
                    <Text style={styles.itemAvatarText}>{item.avatarText}</Text>
                  </View>

                  {/* Right Details */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemMessage}>{item.message}</Text>

                    <View style={styles.itemMetaRow}>
                      {item.issueKey && (
                        <View style={styles.issueKeyBadge}>
                          <Text style={styles.issueKeyText}>{item.issueKey}</Text>
                        </View>
                      )}

                      <View style={styles.dateWrap}>
                        <SquareCheck size={14} color="#579DFF" style={{ marginRight: 4 }} />
                        <Text style={styles.itemDateText}>{item.date}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.groupDivider} />

              {/* Group: 05 tháng 10 */}
              <Text style={styles.dateGroupHeader}>05 tháng 10</Text>

              {ACTIVITIES_GROUP_2.map((item, index) => (
                <View key={item.id} style={styles.activityItem}>
                  {/* Left Avatar */}
                  <View
                    style={[
                      styles.itemAvatar,
                      { backgroundColor: item.avatarColor },
                    ]}
                  >
                    <Text style={styles.itemAvatarText}>{item.avatarText}</Text>
                  </View>

                  {/* Right Details */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemMessage}>{item.message}</Text>

                    <View style={styles.itemMetaRow}>
                      {item.issueKey && (
                        <View style={styles.issueKeyBadge}>
                          <Text style={styles.issueKeyText}>{item.issueKey}</Text>
                        </View>
                      )}

                      <View style={styles.dateWrap}>
                        <SquareCheck size={14} color="#579DFF" style={{ marginRight: 4 }} />
                        <Text style={styles.itemDateText}>{item.date}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  assignedCard: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22272B',
    marginBottom: 20,
  },
  assignedTitle: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  assignedContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignedEmptyText: {
    color: '#8C9BAB',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  reloadBtn: {
    padding: 6,
    marginLeft: 8,
  },
  activitySection: {
    marginBottom: 24,
  },
  activitySectionTitle: {
    color: '#E6EDF3',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  activityBox: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  dateGroupHeader: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 4,
  },
  groupDivider: {
    height: 1,
    backgroundColor: '#282E33',
    marginVertical: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  itemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  itemAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  itemDetails: {
    flex: 1,
  },
  itemMessage: {
    color: '#E6EDF3',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  issueKeyBadge: {
    backgroundColor: '#161A1D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  issueKeyText: {
    color: '#8C9BAB',
    fontSize: 12,
    fontWeight: '600',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDateText: {
    color: '#8C9BAB',
    fontSize: 12,
  },
});
