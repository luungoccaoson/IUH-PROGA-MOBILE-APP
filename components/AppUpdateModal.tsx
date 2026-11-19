import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Sparkles,
  Download,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import { AppVersionInfo } from '../types';
import { appUpdateService } from '../services/appUpdate.service';
import { useThemeStore } from '../stores/useThemeStore';
import { translate as tr } from '../i18n';

interface AppUpdateModalProps {
  visible: boolean;
  updateInfo: AppVersionInfo | null;
  onClose: () => void;
  onDismissForever?: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  updateInfo,
  onClose,
  onDismissForever,
}) => {
  const { colors, isDark } = useThemeStore();
  if (!updateInfo) return null;

  const currentVersion = appUpdateService.getCurrentVersion();
  const isForce = updateInfo.forceUpdate;

  const handleUpdate = () => {
    if (updateInfo.downloadUrl) {
      appUpdateService.openDownloadUrl(updateInfo.downloadUrl);
    }
  };

  const handleDismiss = () => {
    if (onDismissForever) {
      onDismissForever();
    } else {
      appUpdateService.dismissUpdate(updateInfo.latestVersion);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForce) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* Top Banner decoration */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: isDark ? '#1E3A8A' : '#E0EDFF' },
              ]}
            >
              <Sparkles size={26} color={colors.primary} />
            </View>

            <View style={styles.headerText}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: isForce
                        ? isDark ? '#7F1D1D' : '#FEE2E2'
                        : isDark ? '#14532D' : '#DCFCE7',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: isForce ? '#EF4444' : '#16A34A' },
                    ]}
                  >
                    {isForce ? tr("Bắt buộc cập nhật") : tr("Bản cập nhật mới")}
                  </Text>
                </View>
                {updateInfo.releaseDate && (
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={colors.subText} />
                    <Text style={[styles.dateText, { color: colors.subText }]}>
                      {updateInfo.releaseDate}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {tr("Phiên bản {0} đã sẵn sàng!", { 0: updateInfo.latestVersion })}
              </Text>
            </View>

            {!isForce && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Version comparison card */}
          <View
            style={[
              styles.versionBox,
              { backgroundColor: colors.cardInner, borderColor: colors.divider },
            ]}
          >
            <View style={styles.versionCol}>
              <Text style={[styles.versionLabel, { color: colors.subText }]}>
                {tr("Hiện tại")}
              </Text>
              <Text style={[styles.versionValue, { color: colors.text }]}>
                v{currentVersion}
              </Text>
            </View>

            <View style={styles.versionArrow}>
              <ArrowRight size={18} color={colors.primary} />
            </View>

            <View style={styles.versionCol}>
              <Text style={[styles.versionLabel, { color: colors.primary }]}>
                {tr("Mới nhất")}
              </Text>
              <Text style={[styles.versionValue, { color: colors.primary, fontWeight: '800' }]}>
                v{updateInfo.latestVersion}
              </Text>
            </View>
          </View>

          {/* Release Notes */}
          <View style={styles.notesSection}>
            <Text style={[styles.notesSectionTitle, { color: colors.text }]}>
              {tr("Có gì mới trong bản này?")}
            </Text>
            <ScrollView
              style={[
                styles.notesScroll,
                { backgroundColor: colors.cardInner, borderColor: colors.cardBorder },
              ]}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.notesContent, { color: colors.subText }]}>
                {updateInfo.releaseNotes ||
                  tr("Bản cập nhật bao gồm các cải tiến hiệu năng và sửa lỗi trải nghiệm người dùng.")}
              </Text>
            </ScrollView>
          </View>

          {/* Warning if Force Update */}
          {isForce && (
            <View style={styles.forceWarning}>
              <AlertTriangle size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.forceWarningText}>
                {tr("Bạn cần nâng cấp lên phiên bản này để tiếp tục sử dụng ứng dụng PROGA.")}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {!isForce && (
              <TouchableOpacity
                style={[
                  styles.btnSecondary,
                  { borderColor: colors.cardBorder, backgroundColor: colors.cardInner },
                ]}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.subText }]}>
                  {tr("Để sau")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { backgroundColor: colors.primary },
                isForce && { flex: 1 },
              ]}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnPrimaryText}>
                {tr("Cập nhật ngay")}
              </Text>
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
    backgroundColor: 'rgba(9, 30, 66, 0.54)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  closeBtn: {
    padding: 6,
  },
  versionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  versionCol: {
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  versionValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  versionArrow: {
    paddingHorizontal: 12,
  },
  notesSection: {
    marginBottom: 18,
  },
  notesSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  notesContent: {
    fontSize: 13,
    lineHeight: 20,
  },
  forceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  forceWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btnSecondary: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
