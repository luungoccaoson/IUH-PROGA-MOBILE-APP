import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  User,
  ChevronDown,
  List,
  LayoutGrid,
  SquareCheck,
  CheckSquare,
  Square,
  Check,
} from 'lucide-react-native';
import { JiraHeader } from '../../components/jira/JiraHeader';
import { CreateTaskModal } from '../../components/CreateTaskModal';

interface IssueItem {
  id: string;
  code: string;
  title: string;
  completedDate: string;
  isDone: boolean;
  hasStrikeThrough: boolean;
}

const INITIAL_ISSUES: IssueItem[] = [
  {
    id: '1',
    code: 'PROGA-34',
    title: 'Cấu hình AI-Service',
    completedDate: 'Đã xong 11 thg 8, 2026',
    isDone: true,
    hasStrikeThrough: false,
  },
  {
    id: '2',
    code: 'PROGA-42',
    title: 'Feedback – Thầy Trung',
    completedDate: 'Đã xong 11 thg 8, 2026',
    isDone: true,
    hasStrikeThrough: true,
  },
  {
    id: '3',
    code: 'PROGA-33',
    title: 'Lên giao diện cho mobile',
    completedDate: 'Đã xong 2 thg 8, 2026',
    isDone: true,
    hasStrikeThrough: false,
  },
  {
    id: '4',
    code: 'PROGA-14',
    title: 'Code Repository + Service cho notification-service',
    completedDate: 'Đã xong 31 thg 7, 2026',
    isDone: true,
    hasStrikeThrough: true,
  },
  {
    id: '5',
    code: 'PROGA-16',
    title: 'Code Repository cho ai-service',
    completedDate: 'Đã xong 31 thg 7, 2026',
    isDone: true,
    hasStrikeThrough: true,
  },
  {
    id: '6',
    code: 'PROGA-19',
    title: 'Service cho ai-service',
    completedDate: 'Đã xong 31 thg 7, 2026',
    isDone: true,
    hasStrikeThrough: true,
  },
  {
    id: '7',
    code: 'PROGA-9',
    title: 'Code Model Entity',
    completedDate: 'Đã xong 21 thg 7, 2026',
    isDone: true,
    hasStrikeThrough: true,
  },
];

export default function TasksScreen() {
  const router = useRouter();
  const [issues, setIssues] = useState<IssueItem[]>(INITIAL_ISSUES);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Các mục công việc m...');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const filterOptions = [
    'Các mục công việc của tôi',
    'Các mục công việc mở',
    'Đã xong gần đây',
    'Tất cả công việc',
  ];

  const toggleIssueCheck = (id: string) => {
    setIssues((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isDone: !item.isDone,
              hasStrikeThrough: !item.isDone,
            }
          : item
      )
    );
  };

  const handleCreateTask = async (data: any) => {
    const newItem: IssueItem = {
      id: Date.now().toString(),
      code: `PROGA-${issues.length + 50}`,
      title: data.title,
      completedDate: 'Vừa tạo',
      isDone: data.status === 'DONE',
      hasStrikeThrough: data.status === 'DONE',
    };
    setIssues([newItem, ...issues]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Header */}
        <JiraHeader
          title="Tất cả công việc"
          rightActions={
            <>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Search size={22} color="#E6EDF3" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={() => setCreateModalVisible(true)}
              >
                <Plus size={24} color="#E6EDF3" />
              </TouchableOpacity>
            </>
          }
        />

        {/* Filter and View Mode Toolbar */}
        <View style={styles.toolbarRow}>
          {/* Filter Dropdown Pill */}
          <TouchableOpacity
            style={styles.filterPill}
            activeOpacity={0.75}
            onPress={() => setFilterDropdownVisible(true)}
          >
            <User size={15} color="#8C9BAB" style={{ marginRight: 6 }} />
            <Text style={styles.filterPillText} numberOfLines={1}>
              {selectedFilter}
            </Text>
            <ChevronDown size={16} color="#8C9BAB" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* View Mode Toggle Buttons */}
          <View style={styles.viewModeGroup}>
            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'list' && styles.viewModeBtnActive,
              ]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <List
                size={18}
                color={viewMode === 'list' ? '#579DFF' : '#8C9BAB'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'board' && styles.viewModeBtnActive,
              ]}
              onPress={() => setViewMode('board')}
              activeOpacity={0.8}
            >
              <LayoutGrid
                size={18}
                color={viewMode === 'board' ? '#579DFF' : '#8C9BAB'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Issues List */}
        <ScrollView style={styles.listContent} showsVerticalScrollIndicator={false}>
          {issues.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.issueCard}
              activeOpacity={0.7}
              onPress={() => toggleIssueCheck(item.id)}
            >
              {/* Checkbox Icon */}
              <TouchableOpacity
                style={styles.checkboxTouch}
                onPress={() => toggleIssueCheck(item.id)}
              >
                <SquareCheck
                  size={20}
                  color={item.isDone ? '#579DFF' : '#8C9BAB'}
                />
              </TouchableOpacity>

              {/* Title & Subtitle */}
              <View style={styles.issueTextWrap}>
                <Text
                  style={[
                    styles.issueTitle,
                    item.hasStrikeThrough && styles.strikeThroughText,
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={styles.issueSubtitle}>
                  {item.code} - {item.completedDate}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Filter Selection Modal */}
        <Modal
          visible={filterDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFilterDropdownVisible(false)}
          >
            <View style={styles.dropdownMenu}>
              <Text style={styles.dropdownTitle}>Bộ lọc công việc</Text>
              {filterOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedFilter(opt);
                    setFilterDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedFilter === opt && styles.dropdownItemTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <CreateTaskModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSubmit={handleCreateTask}
        />
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
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#282E33',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
  },
  filterPillText: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  viewModeGroup: {
    flexDirection: 'row',
    backgroundColor: '#161A1D',
    borderRadius: 10,
    padding: 2,
    gap: 4,
  },
  viewModeBtn: {
    padding: 8,
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#1D3B6A',
  },
  listContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#22272B',
  },
  checkboxTouch: {
    marginRight: 14,
    padding: 2,
  },
  issueTextWrap: {
    flex: 1,
  },
  issueTitle: {
    color: '#E6EDF3',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  strikeThroughText: {
    textDecorationLine: 'line-through',
    color: '#8C9BAB',
  },
  issueSubtitle: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownMenu: {
    backgroundColor: '#1C2127',
    borderRadius: 16,
    width: '85%',
    maxWidth: 320,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  dropdownTitle: {
    color: '#8C9BAB',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemText: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#579DFF',
    fontWeight: '700',
  },
});
