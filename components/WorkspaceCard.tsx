import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Folder, Edit2, Trash2, ChevronRight } from 'lucide-react-native';
import { Workspace } from '../types';

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
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Folder size={20} color="#111827" />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={16} color="#D93025" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>{workspace.name}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {workspace.description || 'Chưa có mô tả chi tiết cho workspace này.'}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.dateText}>
          Tạo: {new Date(workspace.createdAt).toLocaleDateString('vi-VN')}
        </Text>
        <View style={styles.goBtn}>
          <Text style={styles.goText}>Vào Workspace</Text>
          <ChevronRight size={14} color="#111827" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    backgroundColor: '#F6F5EF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#F6F5EF',
  },
  deleteBtn: {
    backgroundColor: '#FDEDEC',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F6F5EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Platform',
    color: '#9CA3AF',
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  goText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
});
