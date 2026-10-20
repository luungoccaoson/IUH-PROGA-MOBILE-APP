import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User, Calendar, Trash2 } from 'lucide-react-native';
import { Task, TaskStatus } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface TaskItemCardProps {
  task: Task;
  onStatusChange?: (newStatus: TaskStatus) => void;
  onDelete?: () => void;
}

export const TaskItemCard: React.FC<TaskItemCardProps> = ({
  task,
  onStatusChange,
  onDelete,
}) => {
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { bg: isDark ? '#42221F' : '#FDEDEC', text: '#FF5630' };
      case 'HIGH':
        return { bg: isDark ? '#332E1B' : '#FEF7E0', text: '#FFAB00' };
      case 'LOW':
        return { bg: isDark ? '#22272B' : '#F3F4F6', text: colors.subText };
      default:
        return { bg: isDark ? '#1C2B42' : '#DEEBFF', text: '#579DFF' }; // MEDIUM
    }
  };

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'DONE':
        return { bg: isDark ? '#1C3829' : '#E3FCEF', text: '#36B37E', label: 'DONE' };
      case 'IN_PROGRESS':
        return { bg: isDark ? '#1C2B42' : '#DEEBFF', text: '#579DFF', label: 'IN PROGRESS' };
      default:
        return { bg: isDark ? '#22272B' : '#F4F5F7', text: colors.subText, label: 'TODO' };
    }
  };

  const priorityStyle = getPriorityStyle(task.priority);
  const statusStyle = getStatusStyle(task.status);

  // Cycle status on tap: TODO -> IN_PROGRESS -> DONE -> TODO
  const handleNextStatus = () => {
    if (!onStatusChange) return;
    const statusMap: Record<TaskStatus, TaskStatus> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      REVIEW: 'DONE',
      DONE: 'TODO',
    };
    onStatusChange(statusMap[task.status]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.taskCode}>TASK-{task.id}</Text>

        <View style={styles.rightBadges}>
          <TouchableOpacity
            style={[styles.badge, { backgroundColor: statusStyle.bg }]}
            onPress={handleNextStatus}
          >
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </TouchableOpacity>

          <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[styles.badgeText, { color: priorityStyle.text }]}>
              {task.priority}
            </Text>
          </View>

          {onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Trash2 size={14} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.title}>{task.title}</Text>
      {!!task.description && (
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.assignee}>
          <View style={styles.avatar}>
            <User size={12} color={colors.subText} />
          </View>
          <Text style={styles.assigneeName} numberOfLines={1}>
            {task.ownerName || 'Chưa giao'}
          </Text>
        </View>

        {!!task.dueDate && (
          <View style={styles.dueDate}>
            <Calendar size={12} color={colors.subText} />
            <Text style={styles.dueText}>
              {new Date(task.dueDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    taskCode: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.mutedText,
    },
    rightBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    deleteBtn: {
      padding: 2,
      marginLeft: 4,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      lineHeight: 18,
    },
    description: {
      fontSize: 12,
      color: colors.subText,
      lineHeight: 16,
      marginBottom: 10,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    assignee: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    avatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assigneeName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.subText,
      maxWidth: 110,
    },
    dueDate: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dueText: {
      fontSize: 10,
      color: colors.subText,
      fontWeight: '500',
    },
  });
