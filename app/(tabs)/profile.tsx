import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { User, LogOut, Server, Save, RefreshCw, ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { configService } from '../../services/config';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [apiUrl, setApiUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    configService.getApiUrl().then((url) => setApiUrl(url));
  }, []);

  const handleSaveApiUrl = async () => {
    if (!apiUrl.trim()) return;
    await configService.setApiUrl(apiUrl.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetApiUrl = async () => {
    const defaultUrl = await configService.resetApiUrl();
    setApiUrl(defaultUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#E6EDF3" />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Tài Khoản & Cài Đặt</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PROGA'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.username || 'User PROGA'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'developer@proga.vn'}</Text>

        <View style={styles.roleBadge}>
          <ShieldCheck size={14} color="#137333" />
          <Text style={styles.roleText}>{user?.isAdmin ? 'ADMINISTRATOR' : 'MEMBER / DEVELOPER'}</Text>
        </View>
      </View>

      {/* Backend API Configuration */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Server size={18} color="#111827" />
          <Text style={styles.cardTitle}>Cấu Hình Backend Gateway IP</Text>
        </View>
        <Text style={styles.cardDesc}>
          Để ứng dụng Expo Go trên điện thoại thực kết nối thành công với Backend cục bộ, hãy nhập địa chỉ IP LAN của máy tính bạn (ví dụ: http://192.168.1.10:8080/api/v1).
        </Text>

        {savedSuccess && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ Đã lưu cài đặt Server URL thành công!</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SERVER API GATEWAY URL</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.x:8080/api/v1"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            value={apiUrl}
            onChangeText={setApiUrl}
          />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetApiUrl}>
            <RefreshCw size={14} color="#4B5563" />
            <Text style={styles.resetBtnText}>Mặc định</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
            <Save size={14} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Lưu URL Server</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color="#D93025" />
        <Text style={styles.logoutBtnText}>ĐĂNG XUẤT TÀI KHOẢN</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderBottomColor: '#22272B',
  },
  backBtn: {
    padding: 6,
  },
  topNavTitle: {
    color: '#E6EDF3',
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#101214',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#1C2127',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22272B',
    padding: 20,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5E4DB2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E6EDF3',
  },
  userEmail: {
    fontSize: 12,
    color: '#8C9BAB',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1D3B6A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#579DFF',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E6EDF3',
  },
  cardDesc: {
    fontSize: 12,
    color: '#8C9BAB',
    lineHeight: 18,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  successBox: {
    backgroundColor: '#1C3829',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#22593D',
  },
  successText: {
    color: '#57D9A3',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C9BAB',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#161A1D',
    borderWidth: 1,
    borderColor: '#282E33',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#E6EDF3',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#161A1D',
    borderWidth: 1,
    borderColor: '#282E33',
    borderRadius: 12,
    paddingVertical: 10,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C9BAB',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1D3B6A',
    borderRadius: 12,
    paddingVertical: 10,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#579DFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDEDEC',
    borderWidth: 1,
    borderColor: '#FADBD8',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#D93025',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
