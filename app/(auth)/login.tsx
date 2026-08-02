import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Mail, Lock, LogIn, Server } from 'lucide-react-native';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { ServerConfigModal } from '../../components/ServerConfigModal';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập Email/Username và Mật khẩu.');
      setIsNetworkError(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setIsNetworkError(false);
      const data = await authService.login(email.trim(), password.trim());
      await setAuth(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Network Error' || !err.response) {
        setIsNetworkError(true);
        setErrorMsg('Không thể kết nối đến Backend Server (Lỗi Network Error). Vui lòng nhấn nút Cấu hình IP bên dưới để cập nhật lại IP máy tính.');
      } else {
        setIsNetworkError(false);
        setErrorMsg(
          err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Sparkles size={24} color="#111827" />
            </View>
            <Text style={styles.brandTitle}>PROGA</Text>
            <Text style={styles.title}>Đăng Nhập Hệ Thống</Text>
            <Text style={styles.subtitle}>
              Truy cập Workspace và làm việc cùng Bộ ba AI Agents trên Mobile
            </Text>
          </View>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
              {isNetworkError && (
                <TouchableOpacity
                  style={styles.configErrorBtn}
                  onPress={() => setConfigModalVisible(true)}
                >
                  <Server size={14} color="#FFFFFF" />
                  <Text style={styles.configErrorBtnText}>⚙️ Cấu Hình IP Server Ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL HOẶC USERNAME</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="developer@proga.vn hoặc pm_sonluu"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MẬT KHẨU</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.disabledBtn]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <LogIn size={18} color="#FFFFFF" />
                  <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerLink}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>

          {/* IP Config Trigger Button */}
          <TouchableOpacity
            style={styles.serverConfigTrigger}
            onPress={() => setConfigModalVisible(true)}
          >
            <Server size={14} color="#6B7280" />
            <Text style={styles.serverConfigTriggerText}>Cấu hình IP Backend Server</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Server Config Modal */}
      <ServerConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#F6F5EF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#FDEDEC',
    borderColor: '#FADBD8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#D93025',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  configErrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D93025',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  configErrorBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    textDecorationLine: 'underline',
  },
  serverConfigTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  serverConfigTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
});
