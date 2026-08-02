import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { User, LogOut, Server, Save, RefreshCw, ShieldCheck } from 'lucide-react-native';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5EF',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
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
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#137333',
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
    color: '#111827',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  successBox: {
    backgroundColor: '#E6F4EA',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 10,
  },
  successText: {
    color: '#137333',
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
    color: '#4B5563',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F6F5EF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
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
    backgroundColor: '#F6F5EF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 10,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
