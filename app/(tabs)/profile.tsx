import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Settings,
  UserPlus,
  Mail,
  Star,
  LayoutGrid,
  LogOut,
  Server,
  Save,
  RotateCw,
  X,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { configService } from '../../services/config';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors, isDark, toggleTheme } = useThemeStore();

  const [apiUrl, setApiUrl] = useState('');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    configService.getApiUrl().then((url) => setApiUrl(url));
  }, []);

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

  const handleLogout = async () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'TK';

  const displayName = user?.username || 'Trần Đỗ Đăng Khánh';
  const displayEmail = user?.email || 'dktran004@gmail.com';
  const displayDomain = user?.username
    ? `${user.username.toLowerCase()}0...`
    : 'luungoccaoson0...';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header Bar */}
        <View
          style={[
            styles.topNav,
            { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topNavTitle, { color: colors.text }]}>Tài khoản</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* User Info Card */}
          <View
            style={[
              styles.userCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.userCardTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.userInfoWrap}>
                <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
                <Text style={[styles.userEmail, { color: colors.subText }]}>{displayEmail}</Text>
              </View>
            </View>

            <View style={[styles.userCardBottomRow, { borderTopColor: colors.divider }]}>
              <Text style={[styles.domainText, { color: colors.subText }]} numberOfLines={1}>
                {displayDomain}
              </Text>

              <View style={styles.addSiteWrap}>
                <Text style={[styles.addSiteLink, { color: colors.primary }]}>Thêm trang web</Text>
                <View style={styles.badgeOrange}>
                  <Text style={styles.badgeOrangeText}>7</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Group 1: Settings & Appearance Card */}
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {/* Tùy chỉnh Sáng / Tối (Thao tác ngay tại đây) */}
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
                  Giao diện: {isDark ? 'Chế độ Tối (Dark)' : 'Chế độ Sáng (Light)'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.subText, marginTop: 2 }}>
                  Nhấn để chuyển sang giao diện {isDark ? 'Sáng' : 'Tối'}
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
                  {isDark ? '🌙 Tối' : '☀️ Sáng'}
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
              <Text style={[styles.itemTextActive, { color: colors.text }]}>
                Cài đặt kết nối máy chủ
              </Text>
            </TouchableOpacity>

            <View style={[styles.groupDivider, { backgroundColor: colors.divider }]} />

            {/* Cài đặt thông báo (Chưa có tính năng -> không tương tác) */}
            <View style={styles.groupItemDisabled}>
              <View
                style={[
                  styles.itemIconWrap,
                  { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                ]}
              >
                <Bell size={18} color={colors.subText} />
              </View>
              <Text style={[styles.itemText, { color: colors.subText }]}>Cài đặt thông báo</Text>
            </View>
          </View>

          {/* Group 2: Actions Card */}
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {/* Mời mọi người vào trang */}
            <View style={styles.groupItemDisabled}>
              <View
                style={[
                  styles.itemIconWrap,
                  { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                ]}
              >
                <UserPlus size={18} color={colors.subText} />
              </View>
              <Text style={[styles.itemText, { color: colors.subText }]}>Mời mọi người vào trang</Text>
            </View>

            <View style={[styles.groupDivider, { backgroundColor: colors.divider }]} />

            {/* Gửi ý kiến phản hồi */}
            <View style={styles.groupItemDisabled}>
              <View
                style={[
                  styles.itemIconWrap,
                  { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                ]}
              >
                <Mail size={18} color={colors.subText} />
              </View>
              <Text style={[styles.itemText, { color: colors.subText }]}>Gửi ý kiến phản hồi</Text>
            </View>

            <View style={[styles.groupDivider, { backgroundColor: colors.divider }]} />

            {/* Đánh giá ứng dụng */}
            <View style={styles.groupItemDisabled}>
              <View
                style={[
                  styles.itemIconWrap,
                  { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                ]}
              >
                <Star size={18} color={colors.subText} />
              </View>
              <Text style={[styles.itemText, { color: colors.subText }]}>Đánh giá ứng dụng của chúng tôi</Text>
            </View>

            <View style={[styles.groupDivider, { backgroundColor: colors.divider }]} />

            {/* Xem thêm ứng dụng Atlassian */}
            <View style={styles.groupItemDisabled}>
              <View
                style={[
                  styles.itemIconWrap,
                  { backgroundColor: isDark ? '#161A1D' : '#F4F5F7' },
                ]}
              >
                <LayoutGrid size={18} color={colors.subText} />
              </View>
              <Text style={[styles.itemText, { color: colors.subText }]}>Xem thêm ứng dụng Atlassian</Text>
            </View>
          </View>

          {/* Group 3: Logout Action */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? '#3B2225' : '#FEE2E2',
              },
            ]}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <LogOut size={18} color="#EF4444" style={{ marginRight: 10 }} />
            <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

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
                    Cài Đặt Backend Gateway
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
                Cấu hình địa chỉ IP máy chủ Backend Gateway để ứng dụng kết nối trực tiếp với API cục bộ.
              </Text>

              {savedSuccess && (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>
                    ✓ Đã lưu cấu hình IP thành công!
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>ĐỊA CHỈ API GATEWAY</Text>
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
                  Ví dụ: http://192.168.1.5:8080/api/v1 (Thay bằng IP máy tính chạy backend của bạn)
                </Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.resetBtn,
                    { backgroundColor: isDark ? '#161A1D' : '#F4F5F7', borderColor: colors.cardBorder },
                  ]}
                  onPress={handleResetApiUrl}
                  activeOpacity={0.8}
                >
                  <RotateCw size={14} color={colors.subText} />
                  <Text style={[styles.resetBtnText, { color: colors.subText }]}>Mặc định</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveApiUrl}
                  activeOpacity={0.8}
                >
                  <Save size={14} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu IP mới</Text>
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
  backBtn: {
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
    gap: 16,
  },
  userCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  userCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5E4DB2', // Jira purple
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfoWrap: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  userCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  domainText: {
    fontSize: 13,
    maxWidth: 160,
  },
  addSiteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSiteLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeOrange: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E65100',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOrangeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  groupItemDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    opacity: 0.85,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
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
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
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
