import { systemLabel, translate as tr } from '../i18n';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Compass,
  GitBranch,
  FileText,
  CheckCircle2,
  Clock,
  CircleDot,
  AlertTriangle,
  Layers,
  Database,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
import { Space, Task, Sprint, User } from '../types';
import { useThemeStore } from '../stores/useThemeStore';
import {
  normalizeTaskStatus,
  parseTaskDescriptionWithChecklist,
} from '../utils/taskRules';

interface SpaceMindmapViewProps {
  space?: Space | null;
  tasks: Task[];
  sprints?: Sprint[];
  members?: User[];
  currentUser?: User | null;
  onSelectTask?: (task: Task) => void;
}

type MindmapSubView = 'mindmap' | 'journey' | 'srs';

export const SpaceMindmapView: React.FC<SpaceMindmapViewProps> = ({
  space,
  tasks,
  sprints = [],
  members = [],
  currentUser,
  onSelectTask,
}) => {
  const { colors, isDark } = useThemeStore();
  const [subView, setSubView] = useState<MindmapSubView>('mindmap');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  // Determine the current active Sprint (or first Sprint, or Backlog)
  const defaultFocusGroupKey = useMemo(() => {
    const activeSp = sprints.find((s) => s.status === 'ACTIVE') || sprints[0];
    if (activeSp) return `sprint-${activeSp.id}`;
    return 'backlog';
  }, [sprints]);

  // By default, ONLY expand the current active Sprint and temporarily collapse other Sprints
  useEffect(() => {
    setExpandedGroups((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return { [defaultFocusGroupKey]: true };
    });
  }, [defaultFocusGroupKey]);

  const currentUserId = currentUser?.id;

  const myTasks = useMemo(() => {
    if (!currentUserId) return [];
    return tasks.filter(
      (t) =>
        !t.isDeleted &&
        (t.ownerId === currentUserId || t.assignee?.id === currentUserId)
    );
  }, [tasks, currentUserId]);

  const myDoneTasks = myTasks.filter(
    (t) => normalizeTaskStatus(t.status) === 'DONE'
  );
  const myActiveTasks = myTasks.filter((t) => {
    const st = normalizeTaskStatus(t.status);
    return st === 'IN_PROGRESS' || st === 'IN_REVIEW';
  });
  const myTodoTasks = myTasks.filter(
    (t) => normalizeTaskStatus(t.status) === 'TODO'
  );

  const otherMembersRadar = useMemo(() => {
    return members
      .filter((m) => m.id !== currentUserId)
      .map((m) => {
        const mTasks = tasks.filter(
          (t) =>
            !t.isDeleted && (t.ownerId === m.id || t.assignee?.id === m.id)
        );
        const active = mTasks.filter((t) => {
          const st = normalizeTaskStatus(t.status);
          return st === 'IN_PROGRESS' || st === 'IN_REVIEW';
        });
        const done = mTasks.filter(
          (t) => normalizeTaskStatus(t.status) === 'DONE'
        );
        return {
          member: m,
          activeTasks: active,
          doneCount: done.length,
          totalCount: mTasks.length,
        };
      });
  }, [members, tasks, currentUserId]);

  const totalTasks = tasks.length;
  const doneCount = tasks.filter(
    (t) => normalizeTaskStatus(t.status) === 'DONE'
  ).length;
  const overallPercent =
    totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const riskyTasks = tasks.filter((t) => {
    const st = normalizeTaskStatus(t.status);
    if (st === 'DONE') return false;
    const isOverdue = Boolean(t.dueDate && t.dueDate.substring(0, 10) < today);
    const isUrgent = t.priority === 'URGENT';
    return isOverdue || isUrgent || Boolean(t.riskWarning);
  });

  // Group tasks by Sprint + Backlog for WBS Mindmap tree (Natural order: Sprint 1 -> Sprint 2 -> ... -> Backlog)
  const sprintGroups = useMemo(() => {
    const groups: {
      key: string;
      sprint: Sprint | null;
      title: string;
      tasks: Task[];
    }[] = [];

    const sprintIdSet = new Set(sprints.map((s) => s.id));
    const sortedSprints = [...sprints].sort((a, b) => {
      const numA = a.name.match(/\d+/);
      const numB = b.name.match(/\d+/);
      if (numA && numB) {
        const diff = parseInt(numA[0], 10) - parseInt(numB[0], 10);
        if (diff !== 0) return diff;
      }
      return a.id - b.id;
    });

    sortedSprints.forEach((sp) => {
      groups.push({
        key: `sprint-${sp.id}`,
        sprint: sp,
        title: sp.name,
        tasks: tasks.filter((t) => t.sprintId === sp.id),
      });
    });

    const backlogTasks = tasks.filter(
      (t) => !t.sprintId || !sprintIdSet.has(t.sprintId)
    );
    if (backlogTasks.length > 0 || groups.length === 0) {
      groups.push({
        key: 'backlog',
        sprint: null,
        title: 'Backlog',
        tasks: backlogTasks,
      });
    }

    return groups;
  }, [sprints, tasks]);

  const isGroupExpanded = (key: string) => {
    if (expandedGroups[key] !== undefined) {
      return expandedGroups[key];
    }
    return key === defaultFocusGroupKey;
  };

  const toggleGroup = (key: string) => {
    const current = isGroupExpanded(key);
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !current,
    }));
  };

  const getAssigneeName = (task: Task) => {
    const oid = task.ownerId || task.assignee?.id;
    if (!oid) return null;
    const found = members.find((m) => m.id === oid);
    return (
      found?.fullName ||
      found?.displayName ||
      found?.username ||
      task.ownerName ||
      task.assignee?.fullName ||
      `User #${oid}`
    );
  };

  const getInitials = (name?: string) => {
    const clean = (name || 'U').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const getPriorityBadgeStyle = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return { bg: '#EF444422', text: '#EF4444' };
      case 'HIGH':
        return { bg: '#F59E0B22', text: '#F59E0B' };
      case 'LOW':
        return { bg: isDark ? '#22272B' : '#F3F4F6', text: colors.subText };
      default:
        return { bg: '#3B82F622', text: '#3B82F6' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Mindmap Header Banner */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View
            style={[
              styles.headerIconBox,
              { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
            ]}
          >
            <GitBranch size={20} color={isDark ? '#579DFF' : '#0052CC'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {tr("Sơ đồ Mindmap & Toàn cảnh Space")}
            </Text>
            <Text style={[styles.headerSub, { color: colors.subText }]}>
              {tr("Cây phân rã WBS (Space ➔ Sprint ➔ Task), vị trí cá nhân & đặc tả SRS")}
            </Text>
          </View>
        </View>

        {/* Sub-view Switcher */}
        <View
          style={[
            styles.switcherBar,
            { backgroundColor: isDark ? '#161A1D' : '#F3F4F6' },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.switcherBtn,
              subView === 'mindmap' && {
                backgroundColor: colors.cardBg,
              },
            ]}
            onPress={() => setSubView('mindmap')}
          >
            <GitBranch
              size={14}
              color={subView === 'mindmap' ? colors.primary : colors.subText}
            />
            <Text
              style={[
                styles.switcherText,
                {
                  color:
                    subView === 'mindmap' ? colors.primary : colors.subText,
                },
              ]}
            >
              {tr("Sơ đồ Mindmap")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switcherBtn,
              subView === 'journey' && {
                backgroundColor: colors.cardBg,
              },
            ]}
            onPress={() => setSubView('journey')}
          >
            <Compass
              size={14}
              color={subView === 'journey' ? colors.primary : colors.subText}
            />
            <Text
              style={[
                styles.switcherText,
                {
                  color:
                    subView === 'journey' ? colors.primary : colors.subText,
                },
              ]}
            >
              {tr("Vị trí & Nhóm")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switcherBtn,
              subView === 'srs' && {
                backgroundColor: colors.cardBg,
              },
            ]}
            onPress={() => setSubView('srs')}
          >
            <FileText
              size={14}
              color={subView === 'srs' ? colors.primary : colors.subText}
            />
            <Text
              style={[
                styles.switcherText,
                {
                  color: subView === 'srs' ? colors.primary : colors.subText,
                },
              ]}
            >
              {tr("SRS Mini")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================================== */}
      {/* VIEW 1: SƠ ĐỒ MINDMAP WBS (FOCUSED ON CURRENT SPRINT BY DEFAULT) */}
      {/* =================================================================== */}
      {subView === 'mindmap' && (
        <View
          style={[
            styles.mindmapCanvas,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          {/* ROOT NODE: SPACE */}
          <View style={styles.rootNodeContainer}>
            <View style={styles.rootNode}>
              <Sparkles size={16} color="#FDE047" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rootNodeLabel}>{tr("GỐC KHÔNG GIAN (ROOT)")}</Text>
                <Text style={styles.rootNodeTitle} numberOfLines={2}>
                  {space?.name || 'Space'}
                </Text>
              </View>
              <View style={styles.rootNodeBadge}>
                <Text style={styles.rootNodeBadgeText}>
                  {overallPercent}% ({doneCount}/{totalTasks})
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.trunkVerticalLine,
                { backgroundColor: colors.primary },
              ]}
            />
          </View>

          {/* LEVEL 1 NODES: SPRINTS & BACKLOG */}
          <View style={styles.treeBranchesWrap}>
            {sprintGroups.map((group) => {
              const isExpanded = isGroupExpanded(group.key);
              const gTotal = group.tasks.length;
              const gDone = group.tasks.filter(
                (t) => normalizeTaskStatus(t.status) === 'DONE'
              ).length;
              const gPercent =
                gTotal > 0 ? Math.round((gDone / gTotal) * 100) : 0;
              const isActiveSprint = group.sprint?.status === 'ACTIVE';

              return (
                <View key={group.key} style={styles.branchGroup}>
                  <View style={styles.branchConnectorRow}>
                    <View
                      style={[
                        styles.branchArmLine,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sprintNodeCard,
                        {
                          backgroundColor: isActiveSprint
                            ? isDark
                              ? '#172336'
                              : '#EFF6FF'
                            : isDark
                            ? '#161A1D'
                            : '#F8FAFC',
                          borderColor: isActiveSprint
                            ? '#3B82F6'
                            : colors.cardBorder,
                          borderLeftColor: isActiveSprint
                            ? '#2563EB'
                            : group.sprint
                            ? '#64748B'
                            : '#8B5CF6',
                        },
                      ]}
                      onPress={() => toggleGroup(group.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.sprintNodeLeft}>
                        {isExpanded ? (
                          <ChevronDown size={16} color={colors.primary} />
                        ) : (
                          <ChevronRight size={16} color={colors.subText} />
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={styles.sprintNodeTitleRow}>
                            <Text
                              style={[
                                styles.sprintNodeTitle,
                                { color: colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {group.title}
                            </Text>
                            {group.sprint && (
                              <View
                                style={[
                                  styles.sprintStatusBadge,
                                  {
                                    backgroundColor:
                                      group.sprint.status === 'ACTIVE'
                                        ? '#10B98122'
                                        : group.sprint.status === 'CLOSED'
                                        ? '#6B728022'
                                        : '#3B82F622',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.sprintStatusText,
                                    {
                                      color:
                                        group.sprint.status === 'ACTIVE'
                                          ? '#10B981'
                                          : group.sprint.status === 'CLOSED'
                                          ? colors.subText
                                          : '#3B82F6',
                                    },
                                  ]}
                                >
                                  {systemLabel(group.sprint.status)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.subText,
                              marginTop: 2,
                            }}
                          >
                            {gDone}/{gTotal} {tr("hoàn thành")} ({gPercent}%)
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* LEVEL 2 NODES: TASKS UNDER THIS SPRINT */}
                  {isExpanded && (
                    <View
                      style={[
                        styles.leafListContainer,
                        { borderLeftColor: colors.cardBorder },
                      ]}
                    >
                      {group.tasks.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyLeafText,
                            { color: colors.mutedText },
                          ]}
                        >
                          {tr("Chưa có công việc trong nhánh này")}
                        </Text>
                      ) : (
                        group.tasks.map((t) => {
                          const st = normalizeTaskStatus(t.status);
                          const oid = t.ownerId || t.assignee?.id;
                          const isMine = Boolean(
                            currentUserId && oid === currentUserId
                          );
                          const assigneeName = getAssigneeName(t);
                          const pBadge = getPriorityBadgeStyle(t.priority);
                          const parsed = parseTaskDescriptionWithChecklist(
                            t.description
                          );

                          const nodeAccent =
                            st === 'DONE'
                              ? '#10B981'
                              : st === 'IN_REVIEW'
                              ? '#F59E0B'
                              : st === 'IN_PROGRESS'
                              ? '#3B82F6'
                              : '#8C9BAB';

                          return (
                            <View key={t.id} style={styles.leafRow}>
                              <View
                                style={[
                                  styles.leafConnectorArm,
                                  { backgroundColor: nodeAccent },
                                ]}
                              />
                              <TouchableOpacity
                                style={[
                                  styles.leafTaskNode,
                                  {
                                    backgroundColor: isMine
                                      ? isDark
                                        ? '#172336'
                                        : '#EFF6FF'
                                      : isDark
                                      ? '#1C2127'
                                      : '#FFFFFF',
                                    borderColor: isMine
                                      ? '#3B82F6'
                                      : colors.cardBorder,
                                    borderLeftColor: nodeAccent,
                                  },
                                ]}
                                onPress={() => onSelectTask && onSelectTask(t)}
                                activeOpacity={0.75}
                              >
                                <View style={styles.leafTopRow}>
                                  <View style={styles.leafCodeGroup}>
                                    <Text
                                      style={[
                                        styles.leafTaskCode,
                                        { color: colors.subText },
                                      ]}
                                    >
                                      TASK-{t.id}
                                    </Text>
                                    {isMine && (
                                      <View style={styles.mineMiniPill}>
                                        <Text style={styles.mineMiniPillText}>
                                          👤 {tr("CỦA TÔI")}
                                        </Text>
                                      </View>
                                    )}
                                    {parsed.assistantVerified && (
                                      <View style={styles.verifiedMiniPill}>
                                        <Text
                                          style={styles.verifiedMiniPillText}
                                        >
                                          ✓ {tr("Đạt")}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  <View
                                    style={[
                                      styles.leafPriorityBadge,
                                      { backgroundColor: pBadge.bg },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.leafPriorityText,
                                        { color: pBadge.text },
                                      ]}
                                    >
                                      {systemLabel(t.priority || 'MEDIUM')}
                                    </Text>
                                  </View>
                                </View>

                                <Text
                                  style={[
                                    styles.leafTaskTitle,
                                    {
                                      color: colors.text,
                                      fontWeight: isMine ? '800' : '600',
                                    },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {t.title}
                                </Text>

                                <View style={styles.leafBottomRow}>
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      color: nodeAccent,
                                    }}
                                  >
                                    ● {systemLabel(st)}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: isMine ? '800' : '600',
                                      color: isMine
                                        ? '#3B82F6'
                                        : assigneeName
                                        ? colors.text
                                        : '#F59E0B',
                                    }}
                                    numberOfLines={1}
                                  >
                                    {assigneeName
                                      ? `👤 ${assigneeName}`
                                      : tr("Chưa giao")}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: VỊ TRÍ CỦA TÔI & ĐỒNG ĐỘI */}
      {/* =================================================================== */}
      {subView === 'journey' && (
        <View style={styles.journeyWrap}>
          <View
            style={[
              styles.sectionBox,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionBoxTitle, { color: colors.text }]}>
              {tr("Vị trí công việc của bạn (")}
              {myTasks.length})
            </Text>

            <View
              style={[
                styles.stageCard,
                {
                  backgroundColor: isDark ? '#172336' : '#EFF6FF',
                  borderColor: '#3B82F6',
                  borderWidth: 1.5,
                },
              ]}
            >
              <View style={styles.stageHeader}>
                <CircleDot size={15} color="#3B82F6" />
                <Text style={[styles.stageTitle, { color: '#3B82F6' }]}>
                  {tr("Đang làm & Chờ duyệt (")}
                  {myActiveTasks.length})
                </Text>
              </View>
              {myActiveTasks.length === 0 ? (
                <Text style={[styles.stageEmpty, { color: colors.subText }]}>
                  {tr("Hiện chưa có công việc nào đang làm.")}
                </Text>
              ) : (
                myActiveTasks.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.stageTaskItem,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => onSelectTask && onSelectTask(t)}
                  >
                    <Text
                      style={[styles.stageTaskTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      TASK-{t.id}: {t.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '700' }}>
                      {systemLabel(normalizeTaskStatus(t.status))} •{' '}
                      {t.sprintName || tr("Backlog")}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View
              style={[
                styles.stageCard,
                {
                  backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.stageHeader}>
                <Clock size={15} color="#8B5CF6" />
                <Text style={[styles.stageTitle, { color: '#8B5CF6' }]}>
                  {tr("Sẽ làm tiếp theo (")}
                  {myTodoTasks.length})
                </Text>
              </View>
              {myTodoTasks.length === 0 ? (
                <Text style={[styles.stageEmpty, { color: colors.subText }]}>
                  {tr("Không có công việc tồn đọng.")}
                </Text>
              ) : (
                myTodoTasks.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.stageTaskItem,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => onSelectTask && onSelectTask(t)}
                  >
                    <Text
                      style={[styles.stageTaskTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      TASK-{t.id}: {t.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View
              style={[
                styles.stageCard,
                {
                  backgroundColor: isDark ? '#0D2618' : '#F0FDF4',
                  borderColor: '#10B98144',
                },
              ]}
            >
              <View style={styles.stageHeader}>
                <CheckCircle2 size={15} color="#10B981" />
                <Text style={[styles.stageTitle, { color: '#10B981' }]}>
                  {tr("Đã hoàn thành (")}
                  {myDoneTasks.length})
                </Text>
              </View>
              {myDoneTasks.length === 0 ? (
                <Text style={[styles.stageEmpty, { color: colors.subText }]}>
                  {tr("Chưa hoàn thành công việc nào.")}
                </Text>
              ) : (
                myDoneTasks.slice(0, 4).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.stageTaskItem,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => onSelectTask && onSelectTask(t)}
                  >
                    <Text
                      style={[styles.stageTaskTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      ✓ TASK-{t.id}: {t.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          <View
            style={[
              styles.sectionBox,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionBoxTitle, { color: colors.text }]}>
              {tr("Đồng đội đang làm việc gì? (")}
              {otherMembersRadar.length})
            </Text>
            {otherMembersRadar.length === 0 ? (
              <Text style={[styles.stageEmpty, { color: colors.subText }]}>
                {tr("Chưa có thành viên nào khác trong Space.")}
              </Text>
            ) : (
              otherMembersRadar.map((item) => {
                const mName =
                  item.member.fullName ||
                  item.member.displayName ||
                  item.member.username;
                const currentActive = item.activeTasks[0];
                return (
                  <View
                    key={item.member.id}
                    style={[
                      styles.radarRow,
                      {
                        backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.radarAvatar}>
                      <Text style={styles.radarAvatarText}>
                        {getInitials(mName)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.radarTopLine}>
                        <Text
                          style={[styles.radarName, { color: colors.text }]}
                        >
                          {mName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: colors.subText,
                          }}
                        >
                          {item.doneCount}/{item.totalCount} {tr("xong")}
                        </Text>
                      </View>
                      {currentActive ? (
                        <TouchableOpacity
                          onPress={() =>
                            onSelectTask && onSelectTask(currentActive)
                          }
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.primary,
                              fontWeight: '700',
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            ▶ TASK-{currentActive.id}: {currentActive.title}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.mutedText,
                            marginTop: 2,
                          }}
                        >
                          {tr("Hiện chưa có việc ở trạng thái Đang làm")}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View
            style={[
              styles.sectionBox,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.stageHeader}>
              <ShieldAlert size={16} color="#EF4444" />
              <Text style={[styles.sectionBoxTitle, { color: colors.text }]}>
                {tr("Cảnh báo rủi ro & Trễ hạn (")}
                {riskyTasks.length})
              </Text>
            </View>
            {riskyTasks.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>
                ✓ {tr("Dự án an toàn, không có công việc trễ hạn.")}
              </Text>
            ) : (
              riskyTasks.map((rt) => (
                <TouchableOpacity
                  key={rt.id}
                  style={styles.riskItem}
                  onPress={() => onSelectTask && onSelectTask(rt)}
                >
                  <AlertTriangle size={14} color="#EF4444" />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#EF4444',
                    }}
                    numberOfLines={1}
                  >
                    TASK-{rt.id}: {rt.title}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: TÀI LIỆU SRS MINI & MA TRẬN CHỨC NĂNG */}
      {/* =================================================================== */}
      {subView === 'srs' && (
        <View style={styles.journeyWrap}>
          <View
            style={[
              styles.sectionBox,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.stageHeader}>
              <Database size={16} color="#10B981" />
              <Text style={[styles.sectionBoxTitle, { color: colors.text }]}>
                {tr("1. Thực thể Dữ liệu Cốt lõi (Master Data)")}
              </Text>
            </View>
            <View style={styles.srsStatsRow}>
              <View
                style={[
                  styles.srsStatBox,
                  { backgroundColor: isDark ? '#161A1D' : '#F8FAFC' },
                ]}
              >
                <Text style={[styles.srsStatNum, { color: colors.primary }]}>
                  {sprints.length}
                </Text>
                <Text style={[styles.srsStatLabel, { color: colors.subText }]}>
                  Sprints
                </Text>
              </View>
              <View
                style={[
                  styles.srsStatBox,
                  { backgroundColor: isDark ? '#161A1D' : '#F8FAFC' },
                ]}
              >
                <Text style={[styles.srsStatNum, { color: '#10B981' }]}>
                  {tasks.length}
                </Text>
                <Text style={[styles.srsStatLabel, { color: colors.subText }]}>
                  Tasks (WBS)
                </Text>
              </View>
              <View
                style={[
                  styles.srsStatBox,
                  { backgroundColor: isDark ? '#161A1D' : '#F8FAFC' },
                ]}
              >
                <Text style={[styles.srsStatNum, { color: '#F59E0B' }]}>
                  {members.length}
                </Text>
                <Text style={[styles.srsStatLabel, { color: colors.subText }]}>
                  {tr("Thành viên")}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.sectionBox,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.stageHeader}>
              <Layers size={16} color="#8B5CF6" />
              <Text style={[styles.sectionBoxTitle, { color: colors.text }]}>
                {tr("2. Ma trận Yêu cầu Chức năng (FR Matrix)")}
              </Text>
            </View>
            {tasks.map((t, index) => {
              const assignee = getAssigneeName(t);
              const st = normalizeTaskStatus(t.status);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.frRow,
                    { borderBottomColor: colors.divider },
                  ]}
                  onPress={() => onSelectTask && onSelectTask(t)}
                >
                  <Text style={[styles.frCode, { color: colors.primary }]}>
                    FR-{index + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.frTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {t.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.subText }}>
                      {assignee ? `👤 ${assignee}` : tr("Chưa giao")} •{' '}
                      {systemLabel(st)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  headerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  switcherBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  switcherText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mindmapCanvas: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  rootNodeContainer: {
    alignItems: 'center',
  },
  rootNode: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A73E8',
    padding: 14,
    borderRadius: 16,
  },
  rootNodeLabel: {
    color: '#BFDBFE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rootNodeTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  rootNodeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rootNodeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  trunkVerticalLine: {
    width: 2.5,
    height: 18,
  },
  treeBranchesWrap: {
    gap: 14,
  },
  branchGroup: {
    gap: 8,
  },
  branchConnectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchArmLine: {
    width: 14,
    height: 2.5,
  },
  sprintNodeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  sprintNodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sprintNodeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sprintNodeTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  sprintStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sprintStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  leafListContainer: {
    marginLeft: 24,
    paddingLeft: 12,
    borderLeftWidth: 2,
    gap: 8,
  },
  emptyLeafText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  leafRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leafConnectorArm: {
    width: 12,
    height: 2,
    marginLeft: -12,
    marginRight: 6,
  },
  leafTaskNode: {
    flex: 1,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 5,
  },
  leafTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leafCodeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leafTaskCode: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  mineMiniPill: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  mineMiniPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  verifiedMiniPill: {
    backgroundColor: '#10B98122',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  verifiedMiniPillText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  leafPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  leafPriorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  leafTaskTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  leafBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  journeyWrap: {
    gap: 14,
  },
  sectionBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  stageCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  stageEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  stageTaskItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  stageTaskTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  radarAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  radarTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarName: {
    fontSize: 13,
    fontWeight: '700',
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444415',
    padding: 10,
    borderRadius: 10,
  },
  srsStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  srsStatBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  srsStatNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  srsStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  frRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  frCode: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    width: 44,
  },
  frTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
});
