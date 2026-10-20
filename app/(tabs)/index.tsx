import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Search,
  Sliders,
  Kanban,
  SquareCheck,
  Filter,
  Layers,
  ChevronDown,
  Globe,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { workspaceService } from '../../services/workspace.service';
import { Workspace } from '../../types';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { JiraSlidersIcon } from '../../components/jira/JiraIcons';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'viewed' | 'active'>('viewed');
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const list = await workspaceService.getWorkspacesByOwner(user.id);
      setWorkspaces(list);
    } catch (e) {
      console.log('Error fetching workspaces:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const currentWorkspaceName =
    workspaces.length > 0 ? workspaces[0].name : 'PROGA Workspace';
  const workspaceDomain = user?.username
    ? `${user.username}-workspace`
    : 'luungoccaoson0401-178333502102';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Jira Top Header */}
        <JiraHeader
          renderCenter={() => (
            <TouchableOpacity
              style={styles.workspacePill}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/spaces')}
            >
              <View style={styles.workspaceIconBadge}>
                <Globe size={13} color="#579DFF" />
              </View>
              <Text style={styles.workspacePillText} numberOfLines={1}>
                {workspaceDomain}
              </Text>
            </TouchableOpacity>
          )}
          rightActions={
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/(tabs)/spaces')}
              activeOpacity={0.7}
            >
              <Plus size={22} color="#E6EDF3" />
            </TouchableOpacity>
          }
        />

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
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#8C9BAB" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm"
              placeholderTextColor="#8C9BAB"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Quick Access Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessScroll}
          >
            {/* Card 1: SCRUM board */}
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <View style={[styles.quickCardIconWrap, { backgroundColor: '#6554C0' }]}>
                <Kanban size={18} color="#FFFFFF" />
              </View>
              <View style={styles.quickCardTextWrap}>
                <Text style={styles.quickCardTitle} numberOfLines={1}>
                  SCRUM board
                </Text>
                <Text style={styles.quickCardSub}>{currentWorkspaceName}</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: PROGA Space */}
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/spaces')}
            >
              <View style={[styles.quickCardIconWrap, { backgroundColor: '#E65100' }]}>
                <JiraSlidersIcon size={18} color="#FFFFFF" />
              </View>
              <View style={styles.quickCardTextWrap}>
                <Text style={styles.quickCardTitle} numberOfLines={1}>
                  {currentWorkspaceName}
                </Text>
                <Text style={styles.quickCardSub}>Không gian</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Segment Filter (Đã xem / Hoạt động) */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'viewed' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('viewed')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'viewed' && styles.segmentTextActive,
                ]}
              >
                Đã xem
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'active' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab('active')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'active' && styles.segmentTextActive,
                ]}
              >
                Hoạt động
              </Text>
            </TouchableOpacity>
          </View>

          {/* Group 1: Tháng này */}
          <View style={styles.groupContainer}>
            <Text style={styles.groupHeader}>Tháng này</Text>

            {/* Item 1 */}
            <TouchableOpacity
              style={styles.issueItemCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <View style={styles.issueIconWrap}>
                <SquareCheck size={20} color="#579DFF" />
              </View>
              <View style={styles.issueInfo}>
                <Text style={styles.issueTitle}>Chỉnh chức năng xóa mềm</Text>
                <Text style={styles.issueSubtitle}>PROGA-63 • PROGA</Text>
              </View>
            </TouchableOpacity>

            {/* Item 2 */}
            <TouchableOpacity
              style={styles.issueItemCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <View style={[styles.issueIconWrap, { backgroundColor: '#E65100', borderRadius: 8, padding: 4 }]}>
                <JiraSlidersIcon size={16} color="#FFFFFF" />
              </View>
              <View style={styles.issueInfo}>
                <Text style={styles.issueTitle}>SCRUM board</Text>
                <Text style={styles.issueSubtitle}>Bảng thông tin • in PROGA</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Group 2: tháng 9 */}
          <View style={styles.groupContainer}>
            <Text style={styles.groupHeader}>tháng 9</Text>

            {/* Filter item */}
            <TouchableOpacity
              style={styles.issueItemCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <View style={[styles.issueIconWrap, { backgroundColor: '#1D3B6A', borderRadius: 8, padding: 4 }]}>
                <Filter size={16} color="#579DFF" />
              </View>
              <View style={styles.issueInfo}>
                <Text style={styles.issueTitle}>My open issues</Text>
                <Text style={styles.issueSubtitle}>Bộ lọc • Đã xem</Text>
              </View>
            </TouchableOpacity>

            {/* Item 2 */}
            <TouchableOpacity
              style={styles.issueItemCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <View style={styles.issueIconWrap}>
                <SquareCheck size={20} color="#579DFF" />
              </View>
              <View style={styles.issueInfo}>
                <Text style={styles.issueTitle}>
                  AI tự thêm thời gian cho sprint và task
                </Text>
                <Text style={styles.issueSubtitle}>PROGA-59 • PROGA</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Group 3: tháng 8 */}
          <View style={styles.groupContainer}>
            <Text style={styles.groupHeader}>tháng 8</Text>

            <TouchableOpacity
              style={styles.issueItemCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <View style={styles.issueIconWrap}>
                <SquareCheck size={20} color="#579DFF" />
              </View>
              <View style={styles.issueInfo}>
                <Text style={styles.issueTitle}>Feedback - Thầy Trung</Text>
                <Text style={styles.issueSubtitle}>PROGA-42 • PROGA</Text>
              </View>
            </TouchableOpacity>
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
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderWidth: 1,
    borderColor: '#282E33',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 240,
    gap: 8,
  },
  workspaceIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1D3B6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspacePillText: {
    color: '#E6EDF3',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerIconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#282E33',
    paddingHorizontal: 16,
    height: 44,
    marginTop: 14,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#E6EDF3',
    fontSize: 15,
  },
  quickAccessScroll: {
    gap: 12,
    paddingBottom: 16,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#282E33',
    minWidth: 170,
    gap: 12,
  },
  quickCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTextWrap: {
    flex: 1,
  },
  quickCardTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardSub: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#161A1D',
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  segmentButton: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 17,
  },
  segmentButtonActive: {
    backgroundColor: '#1D3B6A',
  },
  segmentText: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#579DFF',
    fontWeight: '700',
  },
  groupContainer: {
    marginBottom: 18,
  },
  groupHeader: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  issueItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  issueIconWrap: {
    marginRight: 14,
  },
  issueInfo: {
    flex: 1,
  },
  issueTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },
  issueSubtitle: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 4,
  },
});
