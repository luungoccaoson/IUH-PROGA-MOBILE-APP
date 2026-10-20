import { translate as tr, useTranslation as useSystemTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  AlertCircle,
  X,
} from 'lucide-react-native';
import { workspaceService } from '../../services/workspace.service';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { Workspace, Space } from '../../types';
import { SpaceModal } from '../../components/SpaceModal';
import { WorkspaceModal } from '../../components/WorkspaceModal';
import { AddWorkspaceMemberModal } from '../../components/AddWorkspaceMemberModal';
import { getProgressColor } from '../../utils/progress';

export interface SpaceBreakdownItem {
  spaceId: number;
  spaceName: string;
  total: number;
  done: number;
  percent: number;
}

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const workspaceId = parseInt(id as string, 10);
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, percent: 0 });
  const [spaceBreakdown, setSpaceBreakdown] = useState<SpaceBreakdownItem[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modals State
  const [spaceModalVisible, setSpaceModalVisible] = useState(false);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [editWsModalVisible, setEditWsModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [explainModalVisible, setExplainModalVisible] = useState(false);

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

        const breakdowns: SpaceBreakdownItem[] = spacesList.map((sp, idx) => {
          const tList = spaceTasksList[idx] || [];
          const spTotal = tList.length;
          const spDone = tList.filter((t) => t.status === 'DONE').length;
          const spPercent = spTotal > 0 ? Math.round((spDone / spTotal) * 100) : 0;
          return {
            spaceId: sp.id,
            spaceName: sp.name,
            total: spTotal,
            done: spDone,
            percent: spPercent,
          };
        });
        setSpaceBreakdown(breakdowns);
      } catch {
        setTaskStats({ total: 0, done: 0, percent: 0 });
        setSpaceBreakdown([]);
      }
    } catch (err: any) {
      console.error('Error loading workspace details:', err);
      setError("Không thể tải thông tin Workspace.");
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
      Alert.alert(tr("Thành công"), tr("Thông tin Workspace đã được cập nhật."));
    } catch (e: any) {
      Alert.alert(tr("Lỗi"), tr("Không thể cập nhật thông tin Workspace."));
    }
  };

  const handleDeleteWorkspace = () => {
    if (!workspace) return;
    Alert.alert(
      tr("Xác nhận xóa Workspace"),
      tr("Bạn có chắc chắn muốn xóa \"{0}\"? Toàn bộ các không gian và công việc bên trong sẽ bị xóa vĩnh viễn.", { 0: workspace.name }),
      [
        { text: tr("Hủy"), style: 'cancel' },
        {
          text: tr("Xóa vĩnh viễn"),
          style: 'destructive',
          onPress: async () => {
            try {
              await workspaceService.deleteWorkspace(workspace.id);
              Alert.alert(tr("Thành công"), tr("Đã xóa Workspace thành công."));
              router.back();
            } catch (e: any) {
              Alert.alert(tr("Lỗi"), tr("Không thể xóa Workspace này."));
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
          <Text style={styles.loadingText}>{tr("Đang tải chi tiết Workspace...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workspace) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#101214" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{tr(error || "Không tìm thấy Workspace.")}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{tr("Quay lại")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const overallProgressColor = getProgressColor(taskStats.percent);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} />
      <View style={styles.container}>
        {/* Custom Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workspace.name}
            </Text>
            <Text style={styles.headerSub}>{tr("Chi Tiết Workspace")}</Text>
          </View>

          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => setSettingsMenuVisible(true)}
          >
            <Settings size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
          {/* Workspace Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoTopRow}>
              <View style={styles.iconTag}>
                <Folder size={22} color="#579DFF" />
              </View>
              <View style={styles.infoTitleWrap}>
                <Text style={styles.wsName}>{workspace.name}</Text>
                <Text style={styles.wsDesc}>
                  {workspace.description || tr("Chưa có mô tả chi tiết cho Workspace này.")}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Calendar size={14} color="#8C9BAB" />
              <Text style={styles.metaText}>
                {tr("Tạo ngày:")}{' '}{new Date(workspace.createdAt).toLocaleDateString(locale)}
              </Text>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>{tr("TỔNG SPACES")}</Text>
                <Layers size={16} color="#8C9BAB" />
              </View>
              <Text style={styles.metricValue}>{spaces.length}</Text>
              <Text style={styles.metricSubText}>{tr("Không gian làm việc")}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>{tr("TIẾN ĐỘ CHUNG")}</Text>
                  <TouchableOpacity
                    onPress={() => setExplainModalVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    style={styles.infoBadgeBtn}
                  >
                    <AlertCircle size={14} color="#579DFF" />
                  </TouchableOpacity>
                </View>
                <CheckCircle2 size={16} color={overallProgressColor.main} />
              </View>
              <Text style={[styles.metricValue, { color: overallProgressColor.main }]}>
                {taskStats.percent}%
              </Text>
              <TouchableOpacity
                onPress={() => setExplainModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.metricSubText}>
                  {taskStats.total > 0
                    ? tr("{0}/{1} việc hoàn thành", { 0: taskStats.done, 1: taskStats.total })
                    : tr("Chưa có công việc")}{' '}
                  <Text style={{ color: overallProgressColor.main, fontWeight: '700' }}>(!)</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          {taskStats.total > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${taskStats.percent}%`,
                      backgroundColor: overallProgressColor.main,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Spaces Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Compass size={18} color="#579DFF" />
              <Text style={styles.sectionTitle}>{tr("Danh Sách Spaces (")}{spaces.length})</Text>
            </View>

            <TouchableOpacity
              style={styles.addSpaceBtn}
              onPress={() => setSpaceModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.addSpaceText}>{tr("Thêm Space")}</Text>
            </TouchableOpacity>
          </View>

          {/* Spaces List */}
          <View style={styles.spacesList}>
            {spaces.length === 0 ? (
              <View style={styles.emptySpaceBox}>
                <Compass size={32} color="#8C9BAB" style={{ marginBottom: 10 }} />
                <Text style={styles.emptySpaceTitle}>{tr("Chưa có Space nào")}</Text>
                <Text style={styles.emptySpaceText}>
                  {tr("Hãy nhấn nút \"Thêm Space\" để tạo không gian quản lý dự án cho Workspace này.")}</Text>
              </View>
            ) : (
              spaces.map((sp) => {
                const initials = sp.name.substring(0, 2).toUpperCase();
                const bInfo = spaceBreakdown.find((b) => b.spaceId === sp.id);
                const spColor = bInfo ? getProgressColor(bInfo.percent) : getProgressColor(0);

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
                          ? new Date(sp.startDate).toLocaleDateString(locale)
                          : tr("Chưa đặt")}{' '}
                        →{' '}
                        {sp.endDate
                          ? new Date(sp.endDate).toLocaleDateString(locale)
                          : tr("Không thời hạn")}
                      </Text>
                    </View>
                    {bInfo && bInfo.total > 0 && (
                      <View
                        style={[
                          styles.spacePercentBadge,
                          { backgroundColor: spColor.bg },
                        ]}
                      >
                        <Text style={[styles.spacePercentText, { color: spColor.main }]}>
                          {bInfo.percent}%
                        </Text>
                      </View>
                    )}
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
                <Text style={styles.actionSheetTitle}>{tr("Cài đặt Workspace")}</Text>
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
                  <Text style={styles.actionTitle}>{tr("Thêm thành viên")}</Text>
                  <Text style={styles.actionDesc}>
                    {tr("Mời người dùng khác tham gia vào Workspace này")}</Text>
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
                  <Text style={styles.actionTitle}>{tr("Chỉnh sửa Workspace")}</Text>
                  <Text style={styles.actionDesc}>
                    {tr("Thay đổi tên và mô tả của Workspace")}</Text>
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
                    {tr("Xóa Workspace")}</Text>
                  <Text style={styles.actionDesc}>
                    {tr("Xóa vĩnh viễn Workspace này và toàn bộ các Spaces bên trong")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={() => setSettingsMenuVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelActionBtnText}>{tr("Đóng")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Progress Explanation Modal */}
        <Modal
          visible={explainModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setExplainModalVisible(false)}
        >
          <View style={styles.explainOverlay}>
            <View style={styles.explainCard}>
              <View style={styles.explainHeader}>
                <View style={styles.explainTitleWrap}>
                  <View style={styles.explainIconCircle}>
                    <AlertCircle size={20} color="#579DFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.explainTitle}>{tr('Lý do tính ra {percent}%', { percent: taskStats.percent })}</Text>
                    <Text style={styles.explainSubTitle}>{tr("Cách tính tiến độ Workspace")}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setExplainModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#8C9BAB" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.explainBody} showsVerticalScrollIndicator={false}>
                {/* Summary Box */}
                <View style={styles.summaryBox}>
                  <Text style={[styles.summaryNumber, { color: overallProgressColor.main }]}>
                    {taskStats.percent}%
                  </Text>
                  <Text style={styles.summaryLabel}>
                    {tr('Đạt được {done} trên tổng số {total} công việc đã hoàn thành', { done: taskStats.done, total: taskStats.total })}</Text>
                </View>

                {/* Formula Box */}
                <View style={styles.formulaBox}>
                  <Text style={styles.formulaHeader}>{tr("CÔNG THỨC ÁP DỤNG")}</Text>
                  <Text style={styles.formulaEquation}>
                    {tr("Tiến độ = (Tổng task DONE ÷ Tổng tất cả task) × 100%")}</Text>
                  <Text style={styles.formulaNote}>
                    {tr("💡 Tiến độ tính theo trọng số công việc thực tế, không lấy trung bình cộng % của các Space. Space nào có nhiều việc hơn sẽ chiếm tỷ trọng lớn hơn trong toàn bộ Workspace.")}</Text>
                </View>

                {/* Breakdown per Space */}
                <Text style={styles.breakdownHeader}>
                  {tr("ĐÓNG GÓP CỦA TỪNG KHÔNG GIAN (")}{spaceBreakdown.length})
                </Text>
                <View style={styles.breakdownList}>
                  {spaceBreakdown.map((item) => {
                    const itemColor = getProgressColor(item.percent);
                    return (
                      <View key={item.spaceId} style={styles.breakdownItem}>
                        <View style={styles.breakdownLeft}>
                          <Text style={styles.breakdownSpaceName} numberOfLines={1}>
                            {item.spaceName}
                          </Text>
                          <Text style={styles.breakdownSpaceSub}>
                            {item.done}/{item.total} {tr("việc hoàn thành (")}{item.total} {tr("task)")}</Text>
                        </View>
                        <View style={styles.breakdownRight}>
                          <View
                            style={[
                              styles.breakdownPercentBadge,
                              { backgroundColor: itemColor.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.breakdownPercentText,
                                { color: itemColor.main },
                              ]}
                            >
                              {item.percent}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Color Legend Box */}
                <View style={styles.colorLegendBox}>
                  <Text style={styles.legendHeader}>{tr("QUY ĐỊNH MÀU SẮC TIẾN ĐỘ")}</Text>
                  <View style={styles.legendGrid}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.legendText}>
                        <Text style={{ color: '#EF4444', fontWeight: '700' }}>{tr("0% - &lt;30%")}</Text>{tr(": Màu đỏ (Cần đẩy nhanh)")}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.legendText}>
                        <Text style={{ color: '#F59E0B', fontWeight: '700' }}>{tr("30% - &lt;70%")}</Text>{tr(": Màu vàng (Đang tiến triển)")}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#579DFF' }]} />
                      <Text style={styles.legendText}>
                        <Text style={{ color: '#579DFF', fontWeight: '700' }}>{tr("70% - &lt;100%")}</Text>{tr(": Màu xanh dương (Khá tốt)")}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#57D9A3' }]} />
                      <Text style={styles.legendText}>
                        <Text style={{ color: '#57D9A3', fontWeight: '700' }}>100%</Text>{tr(": Màu xanh lá cây (Hoàn thành)")}</Text>
                    </View>
                  </View>
                </View>

                {/* Compare Note */}
                <View style={styles.compareNoteBox}>
                  <Text style={styles.compareNoteText}>
                    {tr("• Nếu lấy trung bình cộng: (")}{spaceBreakdown.map((s) => `${s.percent}%`).join(' + ')}{tr(") ÷")}{spaceBreakdown.length || 1} ={' '}
                    <Text style={{ fontWeight: '700', color: '#E6EDF3' }}>
                      {spaceBreakdown.length > 0
                        ? `${Math.round(
                            spaceBreakdown.reduce((acc, s) => acc + s.percent, 0) /
                              spaceBreakdown.length
                          )}%`
                        : '0%'}
                    </Text>
                    {'\n'}{tr("• Nhưng thực tế cả Workspace đã hoàn thành")}{' '}
                    <Text style={{ fontWeight: '700', color: overallProgressColor.main }}>
                      {taskStats.done}/{taskStats.total} {tr("task (")}{taskStats.percent}%)
                    </Text>
                    {tr(", nên hệ thống phản ánh đúng")}{taskStats.percent}{tr("% khối lượng công việc.")}</Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.understandBtn}
                onPress={() => setExplainModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.understandBtnText}>{tr("Đã hiểu")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    headerBar: {
      height: 56,
      backgroundColor: colors.headerBg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.headerBorder,
    },
    headerIconBtn: {
      padding: 6,
    },
    headerTitleWrap: {
      flex: 1,
      paddingHorizontal: 12,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    headerSub: {
      color: colors.subText,
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
      backgroundColor: colors.bg,
    },
    loadingText: {
      fontSize: 13,
      color: colors.subText,
      marginTop: 12,
    },
    errorText: {
      fontSize: 14,
      color: colors.dangerText,
      fontWeight: '700',
      marginBottom: 12,
    },
    backBtn: {
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    backBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    infoCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTitleWrap: {
      flex: 1,
    },
    wsName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    wsDesc: {
      fontSize: 13,
      color: colors.subText,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    metaText: {
      fontSize: 12,
      color: colors.subText,
      fontWeight: '500',
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      color: colors.subText,
      letterSpacing: 0.5,
    },
    metricValue: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.text,
      marginVertical: 4,
    },
    metricSubText: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: '500',
    },
    progressCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.cardInner,
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
      color: colors.text,
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
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    spaceBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    spaceBadgeText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    spaceInfo: {
      flex: 1,
    },
    spaceTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    spaceDate: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 3,
    },
    emptySpaceBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptySpaceTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptySpaceText: {
      color: colors.subText,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    actionSheetContainer: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    actionSheetHeader: {
      alignItems: 'center',
      marginBottom: 16,
    },
    actionSheetIndicator: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
      marginBottom: 12,
    },
    actionSheetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    actionSheetSub: {
      color: colors.subText,
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
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    actionDesc: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },
    actionDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 6,
    },
    cancelActionBtn: {
      marginTop: 14,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardInner,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cancelActionBtnText: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '700',
    },
    metricLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    infoBadgeBtn: {
      padding: 2,
    },
    explainOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    explainCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      width: '100%',
      maxHeight: '85%',
      padding: 20,
    },
    explainHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    explainTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    explainIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    explainTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    explainSubTitle: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    explainBody: {
      maxHeight: 450,
    },
    summaryBox: {
      backgroundColor: colors.cardInner,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      alignItems: 'center',
      marginBottom: 14,
    },
    summaryNumber: {
      color: '#57D9A3',
      fontSize: 34,
      fontWeight: '900',
    },
    summaryLabel: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
    formulaBox: {
      backgroundColor: colors.cardInner,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      marginBottom: 16,
    },
    formulaHeader: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    formulaEquation: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
    },
    formulaNote: {
      color: colors.subText,
      fontSize: 12,
      lineHeight: 18,
    },
    breakdownHeader: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    breakdownList: {
      backgroundColor: colors.cardInner,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      marginBottom: 14,
    },
    breakdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    breakdownLeft: {
      flex: 1,
      marginRight: 10,
    },
    breakdownSpaceName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    breakdownSpaceSub: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },
    breakdownRight: {
      alignItems: 'flex-end',
    },
    breakdownPercentBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    breakdownPercentText: {
      fontSize: 12,
      fontWeight: '700',
    },
    compareNoteBox: {
      backgroundColor: 'rgba(87, 157, 255, 0.08)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(87, 157, 255, 0.2)',
      padding: 12,
      marginBottom: 16,
    },
    compareNoteText: {
      color: colors.subText,
      fontSize: 12,
      lineHeight: 18,
    },
    understandBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    understandBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    spacePercentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginRight: 8,
    },
    spacePercentText: {
      fontSize: 11,
      fontWeight: '800',
    },
    colorLegendBox: {
      backgroundColor: colors.cardInner,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: 14,
    },
    legendHeader: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    legendGrid: {
      gap: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      color: colors.subText,
      fontSize: 11,
    },
  });
