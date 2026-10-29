import { translate as tr, useTranslation as useSystemTranslation } from '../i18n';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Folder, Edit2, Trash2, ChevronRight } from 'lucide-react-native';
import { Workspace } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface WorkspaceCardProps {
  workspace: Workspace;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Folder size={20} color={colors.primary} />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 size={16} color={colors.subText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={16} color={colors.dangerText} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>{workspace.name}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {workspace.description || tr("Chưa có mô tả chi tiết cho workspace này.")}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.dateText}>
          {tr("Tạo:")}{' '}{new Date(workspace.createdAt).toLocaleDateString(locale)}
        </Text>
        <View style={styles.goBtn}>
          <Text style={styles.goText}>{tr("Vào Workspace")}</Text>
          <ChevronRight size={14} color={colors.text} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
    },
    actionBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.inputBg,
    },
    deleteBtn: {
      backgroundColor: colors.dangerBg,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 12,
      color: colors.subText,
      lineHeight: 18,
      marginBottom: 14,
    },
    footer: {
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateText: {
      fontSize: 10,
      color: colors.mutedText,
    },
    goBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    goText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
  });
