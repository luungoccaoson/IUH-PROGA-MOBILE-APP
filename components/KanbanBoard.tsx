import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { ListTodo, Clock, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { Task, TaskStatus } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: number, newStatus: TaskStatus) => Promise<void>;
  onAddTask?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLUMNS: {
  key: TaskStatus;
  title: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
}[] = [
  {
    key: 'TODO',
    title: 'CẦN LÀM',
    sub: 'To Do',
    icon: ListTodo,
    color: '#8C9BAB',
    bgLight: 'rgba(140, 155, 171, 0.12)',
  },
  {
    key: 'IN_PROGRESS',
    title: 'ĐANG LÀM',
    sub: 'In Progress',
    icon: Clock,
    color: '#579DFF',
    bgLight: 'rgba(87, 157, 255, 0.15)',
  },
  {
    key: 'DONE',
    title: 'ĐÃ XONG',
    sub: 'Done',
    icon: CheckCircle2,
    color: '#57D9A3',
    bgLight: 'rgba(87, 217, 163, 0.15)',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateStatus,
}) => {
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<TaskStatus | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;

  // Calculate target column based on X coordinate
  const getStatusFromX = (x: number): TaskStatus => {
    const third = SCREEN_WIDTH / 3;
    if (x < third) return 'TODO';
    if (x < third * 2) return 'IN_PROGRESS';
    return 'DONE';
  };

  // PanResponder to track dragging across the entire screen
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.moveX - 110, y: gestureState.moveY - 45 });
        const target = getStatusFromX(gestureState.moveX);
        setHoveredStatus(target);
      },
      onPanResponderRelease: async (evt, gestureState) => {
        const target = getStatusFromX(gestureState.moveX);
        const currentTask = draggingTask;
        setDraggingTask(null);
        setHoveredStatus(null);

        if (currentTask && target && currentTask.status !== target) {
          await onUpdateStatus(currentTask.id, target);
        }
      },
      onPanResponderTerminate: () => {
        setDraggingTask(null);
        setHoveredStatus(null);
      },
    })
  ).current;

  const handleStartDrag = (task: Task, startX: number, startY: number) => {
    setDraggingTask(task);
    setHoveredStatus(task.status);
    pan.setValue({ x: startX - 110, y: startY - 45 });
  };

  const handleCycleStatus = async (task: Task) => {
    let next: TaskStatus = 'TODO';
    if (task.status === 'TODO') next = 'IN_PROGRESS';
    else if (task.status === 'IN_PROGRESS') next = 'DONE';
    else next = 'TODO';

    await onUpdateStatus(task.id, next);
  };

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'URGENT':
        return '#EF4444';
      case 'HIGH':
        return '#F59E0B';
      case 'LOW':
        return '#8C9BAB';
      default:
        return '#579DFF';
    }
  };

  return (
    <View style={styles.boardContainer}>
      {/* Kanban Columns (Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsScrollContent}
      >
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const colTasks = tasks.filter((t) => t.status === col.key);
          const isTargeted = draggingTask && hoveredStatus === col.key;

          return (
            <View
              key={col.key}
              style={[
                styles.column,
                isTargeted && {
                  borderColor: col.color,
                  borderWidth: 2,
                  backgroundColor: col.bgLight,
                },
              ]}
            >
              {/* Column Header */}
              <View style={[styles.columnHeader, { borderTopColor: col.color }]}>
                <View style={styles.columnTitleWrap}>
                  <Icon size={16} color={col.color} />
                  <Text style={styles.columnTitle}>{col.title}</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: col.bgLight }]}>
                  <Text style={[styles.countBadgeText, { color: col.color }]}>
                    {colTasks.length}
                  </Text>
                </View>
              </View>

              {/* Tasks List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.tasksScroll}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {colTasks.length === 0 ? (
                  <View style={styles.emptyColumn}>
                    <Text style={styles.emptyColumnText}>
                      {isTargeted ? 'Thả task vào đây' : 'Trống'}
                    </Text>
                  </View>
                ) : (
                  colTasks.map((t) => {
                    const isBeingDragged = draggingTask?.id === t.id;
                    const priorityColor = getPriorityColor(t.priority);

                    return (
                      <TouchableOpacity
                        key={t.id}
                        activeOpacity={0.8}
                        delayLongPress={220}
                        onLongPress={(e) => {
                          const { pageX, pageY } = e.nativeEvent;
                          handleStartDrag(t, pageX, pageY);
                        }}
                        onPress={() => handleCycleStatus(t)}
                        style={[
                          styles.taskCard,
                          isBeingDragged && styles.taskCardHidden,
                        ]}
                      >
                        {/* Task Top: Tag & Priority */}
                        <View style={styles.cardTopRow}>
                          <Text style={styles.taskKey}>TASK-{t.id}</Text>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: `${priorityColor}22` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.priorityText,
                                { color: priorityColor },
                              ]}
                            >
                              {t.priority || 'MEDIUM'}
                            </Text>
                          </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {t.title}
                        </Text>

                        {/* Footer: Quick status hint */}
                        <View style={styles.cardFooter}>
                          <Text style={styles.dragHintText}>Giữ để kéo thả</Text>
                          <View style={styles.statusNextRow}>
                            <Text style={styles.tapToCycleText}>
                              {t.status === 'TODO'
                                ? '→ Đang làm'
                                : t.status === 'IN_PROGRESS'
                                ? '→ Đã xong'
                                : '→ Cần làm'}
                            </Text>
                            <ArrowRight size={11} color={colors.subText} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* FULLSCREEN DRAG OVERLAY WHEN DRAGGING */}
      {draggingTask && (
        <View style={styles.dragOverlay} pointerEvents="box-none" {...panResponder.panHandlers}>
          {/* Top Drop Targets Bar */}
          <View style={styles.dropZoneBar}>
            {COLUMNS.map((col) => {
              const isHovered = hoveredStatus === col.key;
              const Icon = col.icon;
              return (
                <View
                  key={`drop-${col.key}`}
                  style={[
                    styles.dropZoneTarget,
                    isHovered && {
                      borderColor: col.color,
                      backgroundColor: col.bgLight,
                      transform: [{ scale: 1.05 }],
                    },
                  ]}
                >
                  <Icon size={14} color={col.color} />
                  <Text
                    style={[
                      styles.dropZoneTargetText,
                      isHovered && { color: col.color, fontWeight: '800' },
                    ]}
                  >
                    {col.title}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Floating Dragged Card Following Touch */}
          <Animated.View
            style={[
              styles.floatingCard,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.taskKey}>TASK-{draggingTask.id}</Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: `${getPriorityColor(draggingTask.priority)}22` },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(draggingTask.priority) },
                  ]}
                >
                  {draggingTask.priority || 'MEDIUM'}
                </Text>
              </View>
            </View>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {draggingTask.title}
            </Text>
            <Text style={styles.floatingTargetStatus}>
              Thả vào: {hoveredStatus || draggingTask.status}
            </Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    boardContainer: {
      flex: 1,
    },
    columnsScrollContent: {
      gap: 12,
      paddingRight: 16,
    },
    column: {
      width: 250,
      backgroundColor: isDark ? '#161A1D' : '#F4F5F7',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      maxHeight: 520,
      overflow: 'hidden',
    },
    columnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 3,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.cardBg,
    },
    columnTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    columnTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    tasksScroll: {
      padding: 10,
    },
    emptyColumn: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyColumnText: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
    },
    taskCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    taskCardHidden: {
      opacity: 0.25,
      borderStyle: 'dashed',
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    taskKey: {
      color: colors.mutedText,
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'monospace',
    },
    priorityBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    priorityText: {
      fontSize: 9,
      fontWeight: '800',
    },
    taskTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
      marginBottom: 8,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 6,
      marginTop: 2,
    },
    dragHintText: {
      color: colors.mutedText,
      fontSize: 10,
    },
    statusNextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    tapToCycleText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '600',
    },
    dragOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    dropZoneBar: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.headerBg,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 6,
      elevation: 8,
    },
    dropZoneTarget: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.cardBg,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    dropZoneTargetText: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '700',
    },
    floatingCard: {
      position: 'absolute',
      width: 220,
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 12,
    },
    floatingTargetStatus: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
  });
