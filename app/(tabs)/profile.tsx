import { LanguageSelector } from '../../components/LanguageSelector';
import { useTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Settings,
  Mail,
  LogOut,
  Server,
  Save,
  RotateCw,
  X,
  Sun,
  Moon,
  User as UserIcon,
  Phone,
  Briefcase,
  Shield,
  Calendar,
  Hash,
  AtSign,
  Folder,
  Layers,
  CheckSquare,
  FileText,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { configService } from '../../services/config';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';
import { workspaceService } from '../../services/workspace.service';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuthStore();
  const { colors, isDark, toggleTheme } = useThemeStore();
  const { t, locale } = useTranslation();

  const [apiUrl, setApiUrl] = useState('');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    workspaces: 0,
    spaces: 0,
    tasks: 0,
  });

  const loadProfileData = useCallback(async () => {
    try {
      const url = await configService.getApiUrl();
      setApiUrl(url);
    } catch (e) {
      // Ignore config read error
    }

    if (!user?.id) return;

    try {
      // Fetch latest user details from backend (/auth/me or /users/:id)
      const freshUser = await authService
        .getProfile()
        .catch(() => userService.getUserById(user.id));
      if (freshUser && freshUser.id) {
        await updateUser(freshUser);
      }
    } catch (e) {
      // Keep cached user from store if offline
    }

    try {
      const [classified, allSpaces, allTasks] = await Promise.all([
        workspaceService.getClassifiedWorkspaces(user.id).catch(async () => {
          const fallback = await workspaceService.getWorkspacesByOwner(user.id);
          return {
            ownedWorkspaces: fallback,
            joinedWorkspaces: [],
            pendingWorkspaces: [],
          };
        }),
        workspaceService.getAllUserSpaces(user.id).catch(() => []),
        workspaceService.getAllUserTasks(user.id).catch(() => []),
      ]);

      const wsCount =
        (classified.ownedWorkspaces?.length || 0) +
        (classified.joinedWorkspaces?.length || 0);
      const spCount = allSpaces.reduce(
        (acc, item) => acc + (item.spaces?.length || 0),
        0
      );
      const taskCount = allTasks.length;

      setStats({
        workspaces: wsCount,
        spaces: spCount,
        tasks: taskCount,
      });
    } catch (e) {
      // Keep default stats if error
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, updateUser]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleSaveApiUrl = async () => {
    if (!apiUrl.trim()) return;
    await configService.setApiUrl(apiUrl.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setSettingsModalVisible(false);
    }, 1200);
  };

  const handleResetApiUrl = async () => {
    const defaultUrl = await configService.resetApiUrl();
    setApiUrl(defaultUrl);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1500);
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await authService.logout();
      await logout();
      setLogoutModalVisible(false);
      router.replace('/(auth)/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const fullNameDisplay =
    user?.fullName || user?.displayName || user?.username || t("Chưa cập nhật");
  const usernameDisplay = user?.username || 'user';
  const emailDisplay = user?.email || t("Chưa cập nhật");
  const phoneDisplay = user?.phoneNumber || t("Chưa cập nhật");
  const jobTitleDisplay = user?.jobTitle || t("Thành viên dự án");
  const roleDisplay = user?.isAdmin
    ? t("Quản trị viên (Admin)")
    : t("Thành viên (Member)");
  const joinedDateDisplay = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale)
    : t("Chưa cập nhật");

  const initials = (user?.fullName || user?.displayName || user?.username || 'US')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const basicInfoRows = [
    {
      key: 'fullName',
      icon: <UserIcon size={16} color={colors.primary} />,
      label: t("Họ và tên"),
      value: fullNameDisplay,
    },
    {
      key: 'username',
      icon: <AtSign size={16} color="#8B5CF6" />,
      label: t("Tên đăng nhập"),
      value: `@${usernameDisplay}`,
    },
    {
      key: 'email',
      icon: <Mail size={16} color="#10B981" />,
      label: t("Email liên hệ"),
      value: emailDisplay,
    },
    {
      key: 'phone',
      icon: <Phone size={16} color="#F59E0B" />,
      label: t("Số điện thoại"),
      value: phoneDisplay,
    },
    {
      key: 'jobTitle',
      icon: <Briefcase size={16} color="#3B82F6" />,
      label: t("Chức danh / Vị trí"),
      value: jobTitleDisplay,
    },
    {
      key: 'role',
      icon: <Shield size={16} color={user?.isAdmin ? '#EF4444' : '#06B6D4'} />,
      label: t("Vai trò hệ thống"),
      value: roleDisplay,
    },
    {
      key: 'userId',
      icon: <Hash size={16} color={colors.subText} />,
      label: t("Mã người dùng"),
      value: `#${user?.id ?? 1}`,
    },
    {
      key: 'joinedAt',
      icon: <Calendar size={16} color="#EC4899" />,
      label: t("Ngày tham gia"),
      value: joinedDateDisplay,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header Bar */}
        <View
          style={[
            styles.topNav,
            { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topNavTitle, { color: colors.text }]}>
            {t("Hồ sơ cá nhân")}
          </Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <RotateCw size={18} color={colors.subText} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
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
          {/* Main Profile Header Card */}
          <View
            style={[
              styles.userCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.userCardTopRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View
                  style={[
                    styles.onlineDot,
                    { borderColor: colors.cardBg },
                  ]}
                />
              </View>

              <View style={styles.userInfoWrap}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {fullNameDisplay}
                </Text>
                <Text style={[styles.userHandle, { color: colors.primary }]} numberOfLines={1}>
                  @{usernameDisplay}
                </Text>
                <Text style={[styles.userEmail, { color: colors.subText }]} numberOfLines={1}>
                  {emailDisplay}
                </Text>
              </View>
            </View>

            {/* Role & Status Badges */}
            <View style={styles.badgesWrap}>
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: user?.isAdmin
                      ? isDark
                        ? '#3B2225'
                        : '#FEE2E2'
                      : isDark
                      ? '#1D3B6A'
                      : '#DEEBFF',
                  },
                ]}
              >
                <Shield
                  size={12}
                  color={
                    user?.isAdmin
                      ? '#EF4444'
                      : isDark
                      ? '#579DFF'
                      : '#0052CC'
                  }
                />
                <Text
                  style={[
                    styles.badgePillText,
                    {
                      color: user?.isAdmin
                        ? '#EF4444'
                        : isDark
                        ? '#579DFF'
                        : '#0052CC',
                    },
                  ]}
                >
                  {roleDisplay}
                </Text>
              </View>

              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                ]}
              >
                <Briefcase size={12} color={colors.subText} />
                <Text style={[styles.badgePillText, { color: colors.text }]}>
                  {jobTitleDisplay}
                </Text>
              </View>

              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: isDark ? '#0D3823' : '#E3FCEF' },
                ]}
              >
                <View style={styles.statusDotSmall} />
                <Text
                  style={[
                    styles.badgePillText,
                    { color: isDark ? '#57D9A3' : '#006644' },
                  ]}
                >
                  {t("Đang hoạt động")}
                </Text>
              </View>
            </View>

            {/* Bio box if available */}
            {!!user?.bio && (
              <View
                style={[
                  styles.bioBox,
                  {
                    backgroundColor: isDark ? '#161A1D' : '#FAFBFC',
                    borderColor: colors.divider,
                  },
                ]}
              >
                <View style={styles.bioHeaderRow}>
                  <FileText size={13} color={colors.subText} />
                  <Text style={[styles.bioLabel, { color: colors.subText }]}>
                    {t("Giới thiệu bản thân")}
                  </Text>
                </View>
                <Text style={[styles.bioText, { color: colors.text }]}>
                  {user.bio}
                </Text>
              </View>
            )}
          </View>

          {/* Activity Stats Card */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.subText }]}>
              {t("Tổng quan hoạt động")}
            </Text>
            <View
              style={[
                styles.statsGrid,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.75}
                onPress={() => router.push('/(tabs)')}
              >
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
                  ]}
                >
                  <Folder size={18} color={isDark ? '#579DFF' : '#0052CC'} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.workspaces}
                </Text>
                <Text style={[styles.statLabel, { color: colors.subText }]}>
                  {t("Workspaces")}
                </Text>
              </TouchableOpacity>

              <View
                style={[styles.statVerticalDivider, { backgroundColor: colors.divider }]}
              />

              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.75}
                onPress={() => router.push('/(tabs)/spaces')}
              >
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: isDark ? '#3B2314' : '#FFF0E6' },
                  ]}
                >
                  <Layers size={18} color="#E65100" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.spaces}
                </Text>
                <Text style={[styles.statLabel, { color: colors.subText }]}>
                  {t("Spaces")}
                </Text>
              </TouchableOpacity>

              <View
                style={[styles.statVerticalDivider, { backgroundColor: colors.divider }]}
              />

              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.75}
                onPress={() => router.push('/(tabs)/tasks')}
              >
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: isDark ? '#0D3823' : '#E3FCEF' },
                  ]}
                >
                  <CheckSquare size={18} color={isDark ? '#57D9A3' : '#006644'} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.tasks}
                </Text>
                <Text style={[styles.statLabel, { color: colors.subText }]}>
                  {t("Công việc")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Basic Information Card */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.subText }]}>
              {t("Thông tin cơ bản")}
            </Text>
            <View
              style={[
                styles.cardGroup,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              {basicInfoRows.map((row, idx) => (
                <React.Fragment key={row.key}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.groupDivider,
                        { backgroundColor: colors.divider },
                      ]}
                    />
                  )}
                  <View style={styles.infoRow}>
                    <View
                      style={[
                        styles.itemIconWrap,
                        { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                      ]}
                    >
                      {row.icon}
                    </View>
                    <View style={styles.infoContentWrap}>
                      <Text style={[styles.infoLabel, { color: colors.subText }]}>
                        {row.label}
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {row.value}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Preferences & App Settings */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.subText }]}>
              {t("Tùy chỉnh & Cài đặt")}
            </Text>

            <LanguageSelector />

            <View
              style={[
                styles.cardGroup,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              {/* Tùy chỉnh Sáng / Tối */}
              <TouchableOpacity
                style={styles.groupItem}
                onPress={toggleTheme}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.itemIconWrap,
                    { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
                  ]}
                >
                  {isDark ? (
                    <Moon size={18} color="#579DFF" />
                  ) : (
                    <Sun size={18} color="#0052CC" />
                  )}
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.itemTextActive, { color: colors.text }]}>
                    {t('Giao diện: ')}
                    {isDark ? t("Chế độ Tối (Dark)") : t("Chế độ Sáng (Light)")}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.subText, marginTop: 2 }}>
                    {t('Nhấn để chuyển sang giao diện ')}
                    {isDark ? t("Sáng") : t("Tối")}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 14,
                    backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
                    borderWidth: 1,
                    borderColor: isDark ? '#282E33' : '#B3D4FF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isDark ? '#579DFF' : '#0052CC',
                    }}
                  >
                    {isDark ? t("🌙 Tối") : t("☀️ Sáng")}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.groupDivider, { backgroundColor: colors.divider }]} />

              {/* Cài đặt kết nối máy chủ */}
              <TouchableOpacity
                style={styles.groupItem}
                onPress={() => setSettingsModalVisible(true)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.itemIconWrap,
                    { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                  ]}
                >
                  <Settings size={18} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTextActive, { color: colors.text }]}>
                    {t("Cài đặt kết nối máy chủ")}
                  </Text>
                  {!!apiUrl && (
                    <Text
                      style={{ fontSize: 11, color: colors.subText, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {apiUrl}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logout Action Button */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              {
                backgroundColor: isDark ? '#2A1619' : '#FEF2F2',
                borderColor: isDark ? '#5C232A' : '#FECACA',
              },
            ]}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#EF4444" style={{ marginRight: 10 }} />
            <Text style={styles.logoutBtnText}>{t("Đăng xuất tài khoản")}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal: Xác nhận Đăng xuất */}
        <Modal
          visible={logoutModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalBox,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.logoutModalHeader}>
                <View style={styles.logoutIconCircle}>
                  <LogOut size={22} color="#EF4444" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginTop: 10 }]}>
                  {t("Xác nhận đăng xuất")}
                </Text>
                <Text
                  style={[
                    styles.modalDesc,
                    { color: colors.subText, textAlign: 'center', marginTop: 6 },
                  ]}
                >
                  {t("Bạn có chắc chắn muốn đăng xuất tài khoản?")}
                </Text>
                <Text
                  style={[
                    styles.helperText,
                    { color: colors.mutedText, textAlign: 'center', marginTop: 2 },
                  ]}
                >
                  {t("Phiên đăng nhập hiện tại sẽ kết thúc và bạn sẽ quay về màn hình đăng nhập.")}
                </Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.resetBtn,
                    {
                      backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => setLogoutModalVisible(false)}
                  disabled={loggingOut}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.resetBtnText, { color: colors.text }]}>
                    {t("Hủy")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#EF4444' }]}
                  onPress={confirmLogout}
                  disabled={loggingOut}
                  activeOpacity={0.8}
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LogOut size={14} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>{t("Đăng xuất")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Cài đặt Server IP Gateway */}
        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalBox,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Server size={20} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {t("Cài Đặt Backend Gateway")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSettingsModalVisible(false)}
                  style={{ padding: 4 }}
                >
                  <X size={20} color={colors.subText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalDesc, { color: colors.subText }]}>
                {t("Cấu hình địa chỉ IP máy chủ Backend Gateway để ứng dụng kết nối trực tiếp với API cục bộ.")}
              </Text>

              {savedSuccess && (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>
                    {t("✓ Đã lưu cấu hình IP thành công!")}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>
                  {t("ĐỊA CHỈ API GATEWAY")}
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="http://192.168.1.10:8080/api/v1"
                    placeholderTextColor={colors.mutedText}
                    value={apiUrl}
                    onChangeText={setApiUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={[styles.helperText, { color: colors.mutedText }]}>
                  {t("Ví dụ: http://192.168.1.5:8080/api/v1 (Thay bằng IP máy tính chạy backend của bạn)")}
                </Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.resetBtn,
                    {
                      backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={handleResetApiUrl}
                  activeOpacity={0.8}
                >
                  <RotateCw size={14} color={colors.subText} />
                  <Text style={[styles.resetBtnText, { color: colors.subText }]}>
                    {t("Mặc định")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveApiUrl}
                  activeOpacity={0.8}
                >
                  <Save size={14} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{t("Lưu IP mới")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topNav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBtn: {
    padding: 6,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 18,
  },
  userCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  userCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5E4DB2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  userInfoWrap: {
    flex: 1,
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
  },
  userHandle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  bioBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statVerticalDivider: {
    width: 1,
    height: 44,
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoContentWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemTextActive: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupDivider: {
    height: 1,
    marginLeft: 66,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutModalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoutIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  successBanner: {
    backgroundColor: '#0D3823',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#137333',
  },
  successBannerText: {
    color: '#57D9A3',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
