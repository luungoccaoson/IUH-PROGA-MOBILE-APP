import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Globe, Check, X } from 'lucide-react-native';
import { languages, useLanguageStore } from '../stores/useLanguageStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useTranslation } from '../i18n';

export function LanguageSelector() {
  const [visible, setVisible] = useState(false);
  const { language, setLanguage } = useLanguageStore();
  const { colors } = useThemeStore();
  const { t } = useTranslation();
  return (
    <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Ngôn ngữ')}
        onPress={() => setVisible(true)}
        style={[styles.trigger, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Globe size={18} color={colors.primary} />
        <Text style={{ color: colors.text, flexShrink: 1 }}>{t('Ngôn ngữ')}: {languages.find(item => item.code === language)?.label}</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: colors.cardBg }]}>
            <View style={styles.heading}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', flex: 1 }}>{t('Ngôn ngữ')}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Đóng')} onPress={() => setVisible(false)} style={styles.close}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {languages.map(item => (
              <TouchableOpacity key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }}
                onPress={() => { void setLanguage(item.code); setVisible(false); }}
                style={[styles.option, { borderColor: colors.cardBorder }]}>
                <Text style={{ color: colors.text, flex: 1 }}>{item.label}</Text>
                {language === item.code && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, minHeight: 44 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 400, padding: 20, borderRadius: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  close: { padding: 10 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
