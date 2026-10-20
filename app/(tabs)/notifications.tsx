import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Settings,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react-native';
import { JiraHeader } from '../../components/jira/JiraHeader';

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'direct' | 'unread'>('direct');

  // Real notifications list: currently empty until backend emits real alerts
  const notifications: any[] = [];

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

        {/* Notifications List or Empty State */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CheckCircle2 size={40} color="#579DFF" />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo mới</Text>
              <Text style={styles.emptySubtitle}>
                Bạn đã cập nhật và xem hết tất cả các thông báo trong các Không gian làm việc.
              </Text>
            </View>
          ) : null}

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
});
