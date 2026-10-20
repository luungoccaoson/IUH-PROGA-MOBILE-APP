import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X, Server, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { configService, getDefaultApiUrl } from '../services/config';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [apiUrl, setApiUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [detectedIp, setDetectedIp] = useState('');

  useEffect(() => {
    if (visible) {
      configService.getApiUrl().then((url) => setApiUrl(url));
      setDetectedIp(getDefaultApiUrl());
    }
  }, [visible]);

  const handleSave = async () => {
    if (!apiUrl.trim()) return;
    await configService.setApiUrl(apiUrl.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = async () => {
    const defaultUrl = await configService.resetApiUrl();
    setApiUrl(defaultUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Server size={20} color={colors.primary} />
              <Text style={styles.title}>Cấu Hình Server Backend IP</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            Khi chạy Expo Go trên điện thoại di động, bạn cần kết nối đến IP máy tính chạy Backend (ví dụ:{' '}
            <Text style={styles.boldText}>http://192.168.1.X:8080/api/v1</Text>).
          </Text>

          {!!detectedIp && (
            <TouchableOpacity
              style={styles.detectedBox}
              onPress={() => setApiUrl(detectedIp)}
            >
              <Text style={styles.detectedTitle}>📍 Đã phát hiện IP từ Expo Go:</Text>
              <Text style={styles.detectedUrl}>{detectedIp}</Text>
              <Text style={styles.detectedHint}>(Nhấp vào đây để áp dụng URL này)</Text>
            </TouchableOpacity>
          )}

          {savedSuccess && (
            <View style={styles.successBox}>
              <CheckCircle2 size={16} color={colors.successText} />
              <Text style={styles.successText}>Đã lưu URL Server thành công!</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SERVER URL GATEWAY</Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.1.x:8080/api/v1"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <RefreshCw size={14} color={colors.subText} />
              <Text style={styles.resetText}>Mặc định</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>LƯU CẤU HÌNH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    closeBtn: {
      padding: 4,
    },
    desc: {
      fontSize: 12,
      color: colors.subText,
      lineHeight: 18,
      marginBottom: 12,
    },
    boldText: {
      fontWeight: '700',
      color: colors.text,
    },
    detectedBox: {
      backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? '#282E33' : '#B3D4FF',
    },
    detectedTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#579DFF' : '#0052CC',
      marginBottom: 2,
    },
    detectedUrl: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      fontFamily: 'monospace',
    },
    detectedHint: {
      fontSize: 10,
      color: colors.subText,
      marginTop: 2,
    },
    successBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.successBg,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
    successText: {
      color: colors.successText,
      fontSize: 12,
      fontWeight: '700',
    },
    inputGroup: {
      marginBottom: 14,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.subText,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.text,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    resetBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingVertical: 12,
    },
    resetText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.subText,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
