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
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { configService } from '../../services/config';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101214" />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#E6EDF3" />
          </TouchableOpacity>
          <Text style={styles.topNavTitle}>Tài khoản</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* User Info Card (Khớp ảnh 2) */}
          <View style={styles.userCard}>
            <View style={styles.userCardTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.userInfoWrap}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userEmail}>{displayEmail}</Text>
              </View>
            </View>

            <View style={styles.userCardBottomRow}>
              <Text style={styles.domainText} numberOfLines={1}>
                {displayDomain}
              </Text>

              <View style={styles.addSiteWrap}>
                <Text style={styles.addSiteLink}>Thêm trang web</Text>
                <View style={styles.badgeOrange}>
                  <Text style={styles.badgeOrangeText}>7</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Group 1: Settings Card */}
          <View style={styles.cardGroup}>
            {/* Cài đặt thông báo (Chưa có tính năng -> không tương tác) */}
            <View style={styles.groupItemDisabled}>
              <View style={styles.itemIconWrap}>
                <Bell size={18} color="#8C9BAB" />
              </View>
              <Text style={styles.itemText}>Cài đặt thông báo</Text>
            </View>

            <View style={styles.groupDivider} />

            {/* Cài đặt (ĐÃ CÓ -> tương tác mở cấu hình Server IP Gateway) */}
            <TouchableOpacity
              style={styles.groupItem}
              onPress={() => setSettingsModalVisible(true)}
              activeOpacity={0.75}
            >
              <View style={styles.itemIconWrap}>
                <Settings size={18} color="#E6EDF3" />
              </View>
              <Text style={styles.itemTextActive}>Cài đặt kết nối máy chủ</Text>
            </TouchableOpacity>
          </View>

          {/* Group 2: Actions Card */}
          <View style={styles.cardGroup}>
            {/* Mời mọi người vào trang (Chưa có -> không tương tác) */}
            <View style={styles.groupItemDisabled}>
              <View style={styles.itemIconWrap}>
                <UserPlus size={18} color="#8C9BAB" />
              </View>
              <Text style={styles.itemText}>Mời mọi người vào trang</Text>
            </View>

            <View style={styles.groupDivider} />

            {/* Gửi ý kiến phản hồi (Chưa có -> không tương tác) */}
            <View style={styles.groupItemDisabled}>
              <View style={styles.itemIconWrap}>
                <Mail size={18} color="#8C9BAB" />
              </View>
              <Text style={styles.itemText}>Gửi ý kiến phản hồi</Text>
            </View>

            <View style={styles.groupDivider} />

            {/* Đánh giá ứng dụng của chúng tôi (Chưa có -> không tương tác) */}
            <View style={styles.groupItemDisabled}>
              <View style={styles.itemIconWrap}>
                <Star size={18} color="#8C9BAB" />
              </View>
              <Text style={styles.itemText}>Đánh giá ứng dụng của chúng tôi</Text>
            </View>

            <View style={styles.groupDivider} />

            {/* Xem thêm ứng dụng Atlassian (Chưa có -> không tương tác) */}
            <View style={styles.groupItemDisabled}>
              <View style={styles.itemIconWrap}>
                <LayoutGrid size={18} color="#8C9BAB" />
              </View>
              <Text style={styles.itemText}>Xem thêm ứng dụng Atlassian</Text>
            </View>
          </View>

          {/* Group 3: Logout Action (ĐÃ CÓ -> tương tác) */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <LogOut size={18} color="#F87171" style={{ marginRight: 10 }} />
            <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal: Cài đặt Server IP Gateway (Tính năng đã có hoạt động) */}
        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Server size={20} color="#579DFF" />
                  <Text style={styles.modalTitle}>Cài Đặt Backend Gateway</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSettingsModalVisible(false)}
                  style={{ padding: 4 }}
                >
                  <X size={20} color="#8C9BAB" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDesc}>
                Cấu hình địa chỉ IP máy chủ Backend Gateway để ứng dụng kết nối trực tiếp với API cục bộ.
              </Text>

              {savedSuccess && (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>
                    ✓ Đã lưu cấu hình IP thành công!
                  </Text>
                </View>
              )}

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>SERVER API GATEWAY URL</Text>
                <TextInput
                  style={styles.modalInput}
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  placeholder="http://192.168.1.18:8080/api/v1"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalResetBtn}
                  onPress={handleResetApiUrl}
                  activeOpacity={0.8}
                >
                  <RotateCw size={14} color="#8C9BAB" style={{ marginRight: 6 }} />
                  <Text style={styles.modalResetText}>Đặt lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveApiUrl}
                  activeOpacity={0.8}
                >
                  <Save size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalSaveText}>Lưu cài đặt</Text>
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
    backgroundColor: '#101214',
  },
  container: {
    flex: 1,
    backgroundColor: '#101214',
  },
  topNav: {
    height: 56,
    backgroundColor: '#101214',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2127',
  },
  backBtn: {
    padding: 6,
  },
  topNavTitle: {
    color: '#E6EDF3',
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
    backgroundColor: '#1C2127',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#22272B',
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
    color: '#E6EDF3',
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    color: '#8C9BAB',
    fontSize: 13,
    marginTop: 2,
  },
  userCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#282E33',
  },
  domainText: {
    color: '#8C9BAB',
    fontSize: 13,
    maxWidth: 160,
  },
  addSiteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSiteLink: {
    color: '#579DFF',
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
    backgroundColor: '#1C2127',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22272B',
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
    backgroundColor: '#161A1D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemText: {
    color: '#8C9BAB',
    fontSize: 14,
    fontWeight: '500',
  },
  itemTextActive: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },
  groupDivider: {
    height: 1,
    backgroundColor: '#22272B',
    marginLeft: 66,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2127',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#3B2225',
  },
  logoutBtnText: {
    color: '#F87171',
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
    backgroundColor: '#1C2127',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
  },
  modalDesc: {
    color: '#8C9BAB',
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
  inputWrap: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#8C9BAB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#161A1D',
    borderWidth: 1,
    borderColor: '#282E33',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E6EDF3',
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161A1D',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#282E33',
  },
  modalResetText: {
    color: '#8C9BAB',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D3B6A',
    borderRadius: 10,
    paddingVertical: 10,
  },
  modalSaveText: {
    color: '#579DFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
