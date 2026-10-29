import { LanguageSelector } from '../../components/LanguageSelector';
import { useTranslation } from '../../i18n';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Mail, Lock, LogIn, Server, Sun, Moon } from 'lucide-react-native';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { ServerConfigModal } from '../../components/ServerConfigModal';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { colors, isDark, toggleTheme } = useThemeStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<import('../../i18n').TranslationKey | ''>('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Vui lòng nhập Email/Username và Mật khẩu.");
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
        setErrorMsg("Không thể kết nối đến Backend Server (Lỗi Network Error). Vui lòng nhấn nút Cấu hình IP bên dưới để cập nhật lại IP máy tính.");
      } else {
        setIsNetworkError(false);
        setErrorMsg(
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Action Bar with Theme Toggle */}
        <LanguageSelector />
        <View style={styles.topActionRow}>
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.75}
          >
            {isDark ? (
              <>
                <Sun size={15} color="#FBBF24" />
                <Text style={[styles.themeToggleText, { color: colors.text }]}>{t("Giao diện Sáng")}</Text>
              </>
            ) : (
              <>
                <Moon size={15} color="#6366F1" />
                <Text style={[styles.themeToggleText, { color: colors.text }]}>{t("Giao diện Tối")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* Logo & Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoBox,
                {
                  backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
                  borderColor: isDark ? '#282E33' : '#B3D4FF',
                },
              ]}
            >
              <Sparkles size={24} color={isDark ? '#579DFF' : '#0052CC'} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>PROGA</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t("Đăng Nhập Hệ Thống")}</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>{t("Truy cập Workspace và làm việc cùng Bộ ba AI Agents trên Mobile")}</Text>
          </View>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg ? t(errorMsg) : ''}</Text>
              {isNetworkError && (
                <TouchableOpacity
                  style={styles.configErrorBtn}
                  onPress={() => setConfigModalVisible(true)}
                >
                  <Server size={14} color="#FFFFFF" />
                  <Text style={styles.configErrorBtnText}>{t("⚙️ Cấu Hình IP Server Ngay")}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subText }]}>{t("EMAIL HOẶC USERNAME")}</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                ]}
              >
                <Mail size={18} color={colors.subText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("developer@proga.vn hoặc pm_sonluu")}
                  placeholderTextColor={colors.mutedText}
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subText }]}>{t("MẬT KHẨU")}</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                ]}
              >
                <Lock size={18} color={colors.subText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginBtn,
                { backgroundColor: colors.primary },
                loading && styles.disabledBtn,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <LogIn size={18} color="#FFFFFF" />
                  <Text style={styles.loginBtnText}>{t("ĐĂNG NHẬP")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerLink}>
            <Text style={[styles.footerText, { color: colors.subText }]}>{t("Chưa có tài khoản? ")}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t("Đăng ký ngay")}</Text>
            </TouchableOpacity>
          </View>

          {/* IP Config Trigger Button */}
          <TouchableOpacity
            style={[
              styles.serverConfigTrigger,
              {
                backgroundColor: isDark ? '#161A1D' : '#FAFBFC',
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => setConfigModalVisible(true)}
          >
            <Server size={14} color={colors.subText} />
            <Text style={[styles.serverConfigTriggerText, { color: colors.subText }]}>{t("Cấu hình IP Backend Server")}</Text>
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
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  loginBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: '#579DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  serverConfigTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  serverConfigTriggerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
