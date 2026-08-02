import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User, Calendar, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react-native';
import { Task, TaskStatus } from '../types';

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
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { bg: '#FDEDEC', text: '#D93025' };
      case 'HIGH':
        return { bg: '#FEF7E0', text: '#B06000' };
      case 'LOW':
        return { bg: '#F3F4F6', text: '#4B5563' };
      default:
        return { bg: '#E8F0FE', text: '#1A73E8' }; // MEDIUM
    }
  };

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'DONE':
        return { bg: '#E6F4EA', text: '#137333', label: 'DONE' };
      case 'IN_PROGRESS':
        return { bg: '#E8F0FE', text: '#1A73E8', label: 'IN PROGRESS' };
      case 'REVIEW':
        return { bg: '#FEF7E0', text: '#B06000', label: 'REVIEW' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', label: 'TODO' };
    }
  };

  const priorityStyle = getPriorityStyle(task.priority);
  const statusStyle = getStatusStyle(task.status);

  // Cycle status on tap: TODO -> IN_PROGRESS -> REVIEW -> DONE -> TODO
  const handleNextStatus = () => {
    if (!onStatusChange) return;
    const statusMap: Record<TaskStatus, TaskStatus> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'REVIEW',
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
              <Trash2 size={14} color="#9CA3AF" />
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
            <User size={12} color="#4B5563" />
          </View>
          <Text style={styles.assigneeName} numberOfLines={1}>
            {task.ownerName || 'Chưa giao'}
          </Text>
        </View>

        {!!task.dueDate && (
          <View style={styles.dueDate}>
            <Calendar size={12} color="#6B7280" />
            <Text style={styles.dueText}>
              {new Date(task.dueDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    color: '#9CA3AF',
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
    color: '#111827',
    marginBottom: 4,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    maxWidth: 110,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
});
