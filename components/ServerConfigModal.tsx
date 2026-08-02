import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { X, Server, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { configService, getDefaultApiUrl } from '../services/config';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ visible, onClose }) => {
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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Server size={20} color="#111827" />
              <Text style={styles.title}>Cấu Hình Server Backend IP</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            Khi chạy Expo Go trên điện thoại di động, bạn cần kết nối đến IP máy tính chạy Backend (ví dụ: <Text style={styles.boldText}>http://192.168.1.X:8080/api/v1</Text>).
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
              <CheckCircle2 size={16} color="#137333" />
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
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <RefreshCw size={14} color="#4B5563" />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#F6F5EF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  desc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  detectedBox: {
    backgroundColor: '#E8F0FE',
    borderColor: '#D2E3FC',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  detectedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A73E8',
  },
  detectedUrl: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  detectedHint: {
    fontSize: 10,
    color: '#1A73E8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  successText: {
    color: '#137333',
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4B5563',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#111827',
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
