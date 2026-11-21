import { systemLabel, translate as tr, useTranslation as useSystemTranslation } from '../../i18n';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Settings,
  Plus,
  ListTodo,
  KanbanSquare,
  BarChart2,
  Users,
  Calendar,
  SquareCheck,
  Building,
  Crown,
  Shield,
  UserPlus,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Play,
  ShieldCheck,
  Search,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore, ThemeColors } from '../../stores/useThemeStore';
import { workspaceService } from '../../services/workspace.service';
import { userService } from '../../services/user.service';
import { configService } from '../../services/config';
import {
  Space,
  Sprint,
  Task,
  TaskStatus,
  TaskPriority,
  Workspace,
  User,
  SpaceRoleType,
} from '../../types';
import { CreateTaskModal } from '../../components/CreateTaskModal';
import { SpaceModal } from '../../components/SpaceModal';
import { AddSpaceMemberModal } from '../../components/AddSpaceMemberModal';
import { KanbanBoard } from '../../components/KanbanBoard';
import { TaskDetailModal } from '../../components/TaskDetailModal';
import { StatusConfirmModal } from '../../components/StatusConfirmModal';
import { TaskAssignModal } from '../../components/TaskAssignModal';
import { SpaceMindmapView } from '../../components/SpaceMindmapView';
import { PersistentTabBar } from '../../components/PersistentTabBar';
import { recentSpacesService } from '../../services/recentSpaces.service';
import { getProgressColor } from '../../utils/progress';
import {
  normalizeTaskStatus,
  getUserSpaceRole,
  checkStatusTransitionPermission,
  parseTaskDescriptionWithChecklist,
  serializeTaskDescriptionWithChecklist,
} from '../../utils/taskRules';

// Tab Order: 1. Tổng quan (with Mindmap inside) -> 2. Công việc -> 3. Bảng Kanban -> 4. Thành viên
type SubTabType = 'overview' | 'tasks' | 'kanban' | 'members';

export interface SpaceMemberDetail {
  id: number;
  username: string;
  fullName: string;
  email: string;
  jobTitle?: string;
  bio?: string;
  avatarUrl?: string;
  roleId: number;
  spaceRole: SpaceRoleType;
  status: string;
  joinedAt?: string;
  assignedTasksCount: number;
  completedTasksCount: number;
  isOwner: boolean;
}

const AVATAR_COLORS = [
  '#5E4DB2',
  '#0052CC',
  '#00875A',
  '#E65100',
  '#C2185B',
  '#0284C7',
];

export default function SpaceDetailScreen() {
  const { spaceId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { locale } = useSystemTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuthStore();
  const idNum = parseInt(spaceId as string, 10);

  // Tab 1 by default is 'overview' (Tổng quan & Mindmap)
  const [activeTab, setActiveTab] = useState<SubTabType>('overview');
  const [space, setSpace] = useState<Space | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<SpaceMemberDetail[]>([]);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters for Tasks List Tab (Sprint bottom sheet + Assignee bottom sheet + Search)
  const [tasksSearchOpen, setTasksSearchOpen] = useState(false);
  const [tasksSearchQuery, setTasksSearchQuery] = useState('');
  const [tasksSprintFilter, setTasksSprintFilter] = useState<number | 'ALL' | 'BACKLOG'>('ALL');
  const [tasksSprintSheetOpen, setTasksSprintSheetOpen] = useState(false);
  const [tasksSprintSearchQuery, setTasksSprintSearchQuery] = useState('');
  const [taskOwnerFilter, setTaskOwnerFilter] = useState<'ALL' | 'MINE' | 'UNASSIGNED' | number>('ALL');
  const [tasksAssigneeSheetOpen, setTasksAssigneeSheetOpen] = useState(false);

  // Kanban selected Sprint (Defaults to Active Sprint, no "All Sprints"!)
  const [kanbanSprintId, setKanbanSprintId] = useState<number | 'BACKLOG' | undefined>(undefined);
  const [collapsedSprints, setCollapsedSprints] = useState<Record<string, boolean>>({});
  const initializedCollapseRef = useRef<boolean>(false);
  const [isKanbanDragging, setIsKanbanDragging] = useState<boolean>(false);

  // Modals state
  const [createTaskVisible, setCreateTaskVisible] = useState(false);
  const [createTaskDefaultSprintId, setCreateTaskDefaultSprintId] = useState<number | null>(null);
  const [editSpaceVisible, setEditSpaceVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Create Sprint Modal state
  const [createSprintVisible, setCreateSprintVisible] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');
  const [creatingSprint, setCreatingSprint] = useState(false);

  // Status Confirmation Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    visible: boolean;
    task: Task | null;
    targetStatus: TaskStatus | null;
    isRevert: boolean;
  }>({
    visible: false,
    task: null,
    targetStatus: null,
    isRevert: false,
  });

  // Self-Assign Confirmation Modal state
  const [selfAssignTask, setSelfAssignTask] = useState<Task | null>(null);

  const getInitials = (name?: string, email?: string) => {
    const text = name || email || 'User';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const loadData = useCallback(
    async (silent = false) => {
      if (!idNum) return;
      try {
        const [spaceData, taskList, sprintList] = await Promise.all([
          workspaceService.getSpaceById(idNum).catch(async () => {
            if (!user?.id) return null;
            const userSpaces = await workspaceService.getAllUserSpaces(user.id);
            for (const item of userSpaces) {
              const found = item.spaces.find((s) => s.id === idNum);
              if (found) return found;
            }
            return null;
          }),
          workspaceService.getTasksBySpace(idNum).catch(() => []),
          workspaceService.getSprintsBySpace(idNum).catch(() => []),
        ]);

        let wsData: Workspace | null = null;
        let rawSpaceMembers: any[] = [];
        let rawWsMembers: any[] = [];

        if (spaceData) {
          setSpace(spaceData);
          if (!silent) {
            recentSpacesService.addRecentSpaceId(idNum);
          }
          if (spaceData.workspaceId) {
            wsData = await workspaceService
              .getWorkspaceById(spaceData.workspaceId)
              .catch(() => null);
            setWorkspace(wsData);
            rawWsMembers = await workspaceService
              .getWorkspaceMembers(spaceData.workspaceId)
              .catch(() => []);
          }
          rawSpaceMembers = await workspaceService
            .getSpaceMembers(idNum)
            .catch(() => []);
        }

        const rawMembers =
          rawSpaceMembers.length > 0 ? rawSpaceMembers : rawWsMembers;
        const memberMetaMap = new Map<
          number,
          { roleId: number; status: string; joinedAt?: string }
        >();

        (rawMembers || []).forEach((m: any) => {
          const uid =
            m.id?.userId ??
            m.userId ??
            (typeof m.id === 'number' ? m.id : null);
          if (uid) {
            memberMetaMap.set(uid, {
              roleId: m.roleId ?? 3,
              status: m.status || 'ACCEPTED',
              joinedAt: m.joinedAt,
            });
          }
        });

        if (wsData?.ownerId && !memberMetaMap.has(wsData.ownerId)) {
          memberMetaMap.set(wsData.ownerId, {
            roleId: 2,
            status: 'ACCEPTED',
          });
        }

        if (user?.id && !memberMetaMap.has(user.id)) {
          memberMetaMap.set(user.id, {
            roleId: wsData?.ownerId === user.id ? 2 : 3,
            status: 'ACCEPTED',
          });
        }

        const userIds = Array.from(memberMetaMap.keys());
        const userProfiles = await Promise.all(
          userIds.map(async (uid) => {
            if (user && user.id === uid) return user;
            try {
              return await userService.getUserById(uid);
            } catch {
              return null;
            }
          })
        );

        const sprintNameMap = new Map<number, string>();
        (sprintList || []).forEach((sp) => sprintNameMap.set(sp.id, sp.name));

        const validProfiles: User[] = [];
        const parsedMembers: SpaceMemberDetail[] = userIds.map((uid, idx) => {
          const profile = userProfiles[idx];
          const meta = memberMetaMap.get(uid);
          const isOwner =
            wsData?.ownerId === uid ||
            meta?.roleId === 1 ||
            meta?.roleId === 2;
          const spaceRole = getUserSpaceRole(uid, wsData?.ownerId, meta?.roleId);

          const assignedTasks = taskList.filter(
            (t: any) => t.assignee?.id === uid || t.ownerId === uid
          );
          const completedTasks = assignedTasks.filter(
            (t) => normalizeTaskStatus(t.status) === 'DONE'
          );

          const fullName =
            profile?.fullName ||
            profile?.displayName ||
            profile?.username ||
            `User #${uid}`;
          const username = profile?.username || `user_${uid}`;
          const email = profile?.email || '';
          const avatarUrl = profile?.avatarUrl;

          validProfiles.push({
            id: uid,
            username,
            email,
            fullName,
            displayName: profile?.displayName || fullName,
            jobTitle: profile?.jobTitle,
            bio: profile?.bio,
            avatarUrl,
            isAdmin: Boolean(profile?.isAdmin),
            createdAt: profile?.createdAt || new Date().toISOString(),
          });

          return {
            id: uid,
            username,
            fullName,
            email,
            jobTitle: profile?.jobTitle,
            bio: profile?.bio,
            avatarUrl,
            roleId: meta?.roleId || (isOwner ? 2 : 3),
            spaceRole,
            status: meta?.status || 'ACCEPTED',
            joinedAt: meta?.joinedAt,
            assignedTasksCount: assignedTasks.length,
            completedTasksCount: completedTasks.length,
            isOwner,
          };
        });

        const userNameMap = new Map<number, string>();
        parsedMembers.forEach((m) => userNameMap.set(m.id, m.fullName));

        const enrichedTasks: Task[] = taskList.map((t) => {
          const oid = t.ownerId || t.assignee?.id;
          return {
            ...t,
            sprintName: t.sprintId ? sprintNameMap.get(t.sprintId) : undefined,
            ownerName: oid ? userNameMap.get(oid) || t.ownerName : undefined,
          };
        });

        setSprints(sprintList || []);
        setMembers(parsedMembers);
        setMemberUsers(validProfiles);
        setTasks(enrichedTasks);

        // Sort sprints naturally: Sprint 1 -> Sprint 2 -> ...
        const extractNum = (name: string, fallbackId: number) => {
          const m = name.match(/(\d+)/);
          return m ? parseInt(m[1], 10) : fallbackId;
        };
        const orderedSpList = [...(sprintList || [])].sort(
          (a, b) =>
            extractNum(a.name, a.id) - extractNum(b.name, b.id) || a.id - b.id
        );
        const activeSp =
          orderedSpList.find((s) => s.status === 'ACTIVE') || orderedSpList[0];

        // On initial open, collapse all Sprints & Backlog EXCEPT the current active Sprint!
        if (!initializedCollapseRef.current && orderedSpList.length > 0) {
          initializedCollapseRef.current = true;
          const initMap: Record<string, boolean> = { backlog: true };
          orderedSpList.forEach((sp) => {
            initMap[`sprint-${sp.id}`] = activeSp ? sp.id !== activeSp.id : false;
          });
          setCollapsedSprints(initMap);
        }

        // Set default Kanban Sprint to Active Sprint (or first Sprint, or BACKLOG)
        setKanbanSprintId((prev) => {
          if (prev !== undefined) return prev;
          return activeSp ? activeSp.id : 'BACKLOG';
        });

        setSelectedTask((prev) =>
          prev ? enrichedTasks.find((t) => t.id === prev.id) || null : null
        );
      } catch (err) {
        if (!silent) {
          console.log('Error loading space detail:', err);
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [idNum, user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // REALTIME SYNC: STOMP WebSocket + Silent Background Polling every 4s
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!idNum) return;

    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        loadData(true);
      }
    }, 4000);

    // Also attempt WebSocket connection to workspace-service STOMP endpoint
    configService
      .getApiUrl()
      .then((apiUrl) => {
        if (!isMounted) return;
        try {
          const hostMatch = apiUrl.match(/^https?:\/\/([^:/]+)/i);
          const host = hostMatch ? hostMatch[1] : 'localhost';
          const wsUrl = `ws://${host}:8082/ws-proga/websocket`;
          const socket = new WebSocket(wsUrl);
          socket.onopen = () => {
            socket.send(
              'CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n\n\0'
            );
            socket.send(
              `SUBSCRIBE\nid:sub-0\ndestination:/topic/space/${idNum}/tasks\n\n\0`
            );
          };
          socket.onmessage = (event) => {
            if (
              typeof event.data === 'string' &&
              event.data.includes('MESSAGE')
            ) {
              loadData(true);
            }
          };
          wsRef.current = socket;
        } catch {
          // Ignore ws fallback to 4s interval polling
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [idNum, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const currentUserRole: SpaceRoleType = useMemo(() => {
    if (!user?.id) return 'MEMBER';
    const me = members.find((m) => m.id === user.id);
    return getUserSpaceRole(user.id, workspace?.ownerId, me?.roleId);
  }, [user?.id, members, workspace?.ownerId]);

  const isPM = currentUserRole === 'PM';
  const isAssistant = currentUserRole === 'ASSISTANT';
  const isCoordinator = isPM || isAssistant;

  const handleRequestStatusChange = (
    task: Task,
    targetStatus: TaskStatus,
    isRevert = false
  ) => {
    const check = checkStatusTransitionPermission(
      task,
      targetStatus,
      currentUserRole,
      user?.id
    );
    if (!check.allowed) {
      Alert.alert(
        tr("Phân quyền thao tác"),
        check.reasonKey ? tr(check.reasonKey) : tr("Thao tác không được phép.")
      );
      return;
    }

    setConfirmModalState({
      visible: true,
      task,
      targetStatus,
      isRevert:
        isRevert ||
        (normalizeTaskStatus(task.status) === 'IN_REVIEW' &&
          normalizeTaskStatus(targetStatus) === 'IN_PROGRESS'),
    });
  };

  const handleExecuteConfirmedStatusChange = async (reason?: string) => {
    const { task, targetStatus, isRevert } = confirmModalState;
    if (!task || !targetStatus) return;

    const parsed = parseTaskDescriptionWithChecklist(task.description);
    let updatedBase = parsed.baseDescription;
    let nextVerified = parsed.assistantVerified;

    if (isRevert) {
      nextVerified = false;
      if (reason) {
        const roleTag = isPM ? 'PM' : 'Assistant';
        const note = `\n\n> ⚠️ Yêu cầu chỉnh sửa (${roleTag}): ${reason}`;
        updatedBase = updatedBase ? `${updatedBase}${note}` : note.trim();
      }
    }

    const updatedDescription = serializeTaskDescriptionWithChecklist(
      updatedBase,
      parsed.checklist,
      parsed.aiRationale,
      {
        assistantVerified: nextVerified,
        createdByUserId: parsed.createdByUserId,
      }
    );

    await workspaceService.updateTask(task.id, {
      spaceId: task.spaceId,
      sprintId: task.sprintId ?? null,
      title: task.title,
      description: updatedDescription,
      status: targetStatus,
      priority: task.priority,
      ownerId: task.ownerId ?? null,
      startDate: task.startDate,
      dueDate: task.dueDate,
    });
    await loadData(true);
  };

  const handleDirectUpdateStatus = async (taskId: number, newStatus: TaskStatus) => {
    const found = tasks.find((t) => t.id === taskId);
    if (found) {
      handleRequestStatusChange(found, newStatus);
    }
  };

  const handleAssistantVerifyTask = async (task: Task, verified: boolean) => {
    try {
      const parsed = parseTaskDescriptionWithChecklist(task.description);
      const updatedDescription = serializeTaskDescriptionWithChecklist(
        parsed.baseDescription,
        parsed.checklist,
        parsed.aiRationale,
        {
          assistantVerified: verified,
          createdByUserId: parsed.createdByUserId,
        }
      );
      await workspaceService.updateTask(task.id, {
        spaceId: task.spaceId,
        sprintId: task.sprintId ?? null,
        title: task.title,
        description: updatedDescription,
        status: task.status,
        priority: task.priority,
        ownerId: task.ownerId ?? null,
        startDate: task.startDate,
        dueDate: task.dueDate,
      });
      await loadData(true);
    } catch {
      Alert.alert(tr("Lỗi"), tr("Không thể cập nhật trạng thái xác nhận Đạt yêu cầu."));
    }
  };

  const handleConfirmSelfAssign = async () => {
    if (!selfAssignTask || !user?.id) return;
    try {
      await workspaceService.updateTask(selfAssignTask.id, {
        spaceId: selfAssignTask.spaceId,
        sprintId: selfAssignTask.sprintId ?? null,
        title: selfAssignTask.title,
        description: selfAssignTask.description,
        status: selfAssignTask.status,
        priority: selfAssignTask.priority,
        ownerId: user.id,
        startDate: selfAssignTask.startDate,
        dueDate: selfAssignTask.dueDate,
      });
      setSelfAssignTask(null);
      await loadData(true);
    } catch {
      Alert.alert(tr("Lỗi"), tr("Không thể nhận công việc này."));
    }
  };

  const handleUpdateTaskFull = async (
    taskId: number,
    data: {
      spaceId: number;
      sprintId?: number | null;
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      ownerId?: number | null;
      startDate?: string;
      dueDate?: string;
    }
  ) => {
    await workspaceService.updateTask(taskId, data);
    await loadData(true);
  };

  const handleDeleteTask = async (taskId: number) => {
    await workspaceService.deleteTask(taskId);
    await loadData(true);
  };

  const handleAssignBatch = async (
    assignments: { taskId: number; ownerId: number }[]
  ) => {
    try {
      await workspaceService.assignTasksBatch(assignments);
    } catch {
      await Promise.all(
        assignments.map(async (a) => {
          const t = tasks.find((item) => item.id === a.taskId);
          if (t) {
            await workspaceService.updateTask(t.id, {
              spaceId: t.spaceId,
              sprintId: t.sprintId ?? null,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              ownerId: a.ownerId,
              startDate: t.startDate,
              dueDate: t.dueDate,
            });
          }
        })
      );
    }
    await loadData(true);
  };

  const handleAssignSingle = async (taskId: number, ownerId: number | null) => {
    const t = tasks.find((item) => item.id === taskId);
    if (!t) return;
    await workspaceService.updateTask(t.id, {
      spaceId: t.spaceId,
      sprintId: t.sprintId ?? null,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      ownerId,
      startDate: t.startDate,
      dueDate: t.dueDate,
    });
    await loadData(true);
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    sprintId?: number | null;
    ownerId?: number | null;
    dueDate?: string;
  }) => {
    await workspaceService.createTask({
      spaceId: idNum,
      ...data,
    });
    await loadData(true);
  };

  const handleCreateSprint = async () => {
    const cleanName =
      newSprintName.trim() || `Sprint ${sprints.length + 1}`;
    try {
      setCreatingSprint(true);
      const created = await workspaceService.createSprint({
        spaceId: idNum,
        name: cleanName,
        goal: newSprintGoal.trim() || undefined,
        status: sprints.some((s) => s.status === 'ACTIVE') ? 'FUTURE' : 'ACTIVE',
      });
      setNewSprintName('');
      setNewSprintGoal('');
      setCreateSprintVisible(false);
      if (created && created.status === 'ACTIVE') {
        setKanbanSprintId(created.id);
      }
      await loadData(true);
    } catch {
      Alert.alert(tr("Lỗi"), tr("Không thể tạo Sprint mới."));
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleToggleSprintStatus = async (sprint: Sprint) => {
    const nextStatus = sprint.status === 'FUTURE' ? 'ACTIVE' : 'CLOSED';
    try {
      await workspaceService.updateSprintStatus(sprint.id, nextStatus);
      if (nextStatus === 'ACTIVE') {
        setKanbanSprintId(sprint.id);
      }
      await loadData(true);
    } catch {
      Alert.alert(tr("Lỗi"), tr("Không thể cập nhật trạng thái Sprint."));
    }
  };

  const handleChangeMemberRole = async (member: SpaceMemberDetail) => {
    if (!isPM || member.isOwner) return;
    const nextRoleId = member.spaceRole === 'ASSISTANT' ? 3 : 4;
    try {
      await workspaceService.updateSpaceMemberRole(idNum, member.id, nextRoleId);
      await loadData(true);
    } catch {
      try {
        await workspaceService.addMemberToSpace(idNum, member.id, nextRoleId);
        await loadData(true);
      } catch {
        Alert.alert(tr("Lỗi"), tr("Không thể thay đổi vai trò thành viên."));
      }
    }
  };

  const handleEditSpace = async (name: string, startDate?: string, endDate?: string) => {
    if (!space) return;
    const updated = await workspaceService.updateSpace(space.id, {
      workspaceId: space.workspaceId,
      name,
      startDate,
      endDate,
    });
    setSpace(updated);
  };

  const handleDeleteSpace = async () => {
    if (!space) return;
    Alert.alert(
      tr("Xác nhận xóa"),
      tr("Bạn có chắc muốn xóa không gian \"{0}\"?", { 0: space.name }),
      [
        { text: tr("Hủy"), style: 'cancel' },
        {
          text: tr("Xóa"),
          style: 'destructive',
          onPress: async () => {
            try {
              await workspaceService.deleteSpace(space.id);
              router.replace('/(tabs)/spaces');
            } catch {
              Alert.alert(tr("Lỗi"), tr("Không thể xóa Không gian này."));
            }
          },
        },
      ]
    );
  };

  // Metrics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => normalizeTaskStatus(t.status) === 'DONE').length;
  const inReviewTasks = tasks.filter((t) => normalizeTaskStatus(t.status) === 'IN_REVIEW').length;
  const inProgressTasks = tasks.filter((t) => normalizeTaskStatus(t.status) === 'IN_PROGRESS').length;
  const todoTasks = tasks.filter((t) => normalizeTaskStatus(t.status) === 'TODO').length;

  const percentComplete =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const progressColor = getProgressColor(percentComplete);

  const filteredTasks = useMemo(() => {
    const cleanQ = tasksSearchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      const oid = t.ownerId || t.assignee?.id;
      if (taskOwnerFilter === 'MINE') {
        if (!user?.id || oid !== user.id) return false;
      } else if (taskOwnerFilter === 'UNASSIGNED') {
        if (oid) return false;
      } else if (typeof taskOwnerFilter === 'number') {
        if (oid !== taskOwnerFilter) return false;
      }

      if (cleanQ) {
        const matchTitle = t.title.toLowerCase().includes(cleanQ);
        const matchCode = `task-${t.id}`.includes(cleanQ);
        if (!matchTitle && !matchCode) return false;
      }
      return true;
    });
  }, [tasks, taskOwnerFilter, user?.id, tasksSearchQuery]);

  // Sort sprints naturally in sequential order: Sprint 1 -> Sprint 2 -> ...
  const orderedSprints = useMemo(() => {
    const extractOrder = (name: string, fallbackId: number) => {
      const m = name.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : fallbackId;
    };
    return [...sprints].sort(
      (a, b) =>
        extractOrder(a.name, a.id) - extractOrder(b.name, b.id) || a.id - b.id
    );
  }, [sprints]);

  // Group filteredTasks by Sprints (in natural sequential order) + Backlog (filtered by tasksSprintFilter)
  const sprintSections = useMemo(() => {
    const sections: {
      key: string;
      sprint: Sprint | null;
      title: string;
      tasks: Task[];
      totalInSprint: number;
      todoInSprint: number;
      inProgInSprint: number;
      inRevInSprint: number;
      doneInSprint: number;
    }[] = [];

    const sprintIdSet = new Set(orderedSprints.map((s) => s.id));

    orderedSprints.forEach((sp) => {
      if (
        tasksSprintFilter !== 'ALL' &&
        tasksSprintFilter !== sp.id
      ) {
        return;
      }
      const allInSp = tasks.filter((t) => t.sprintId === sp.id);
      const todoInSp = allInSp.filter((t) => normalizeTaskStatus(t.status) === 'TODO').length;
      const inProgInSp = allInSp.filter((t) => normalizeTaskStatus(t.status) === 'IN_PROGRESS').length;
      const inRevInSp = allInSp.filter((t) => normalizeTaskStatus(t.status) === 'IN_REVIEW').length;
      const doneInSp = allInSp.filter((t) => normalizeTaskStatus(t.status) === 'DONE').length;
      const visibleInSp = filteredTasks.filter((t) => t.sprintId === sp.id);

      sections.push({
        key: `sprint-${sp.id}`,
        sprint: sp,
        title: sp.name,
        tasks: visibleInSp,
        totalInSprint: allInSp.length,
        todoInSprint: todoInSp,
        inProgInSprint: inProgInSp,
        inRevInSprint: inRevInSp,
        doneInSprint: doneInSp,
      });
    });

    if (tasksSprintFilter === 'ALL' || tasksSprintFilter === 'BACKLOG') {
      const allBacklog = tasks.filter(
        (t) => !t.sprintId || !sprintIdSet.has(t.sprintId)
      );
      const todoBacklog = allBacklog.filter((t) => normalizeTaskStatus(t.status) === 'TODO').length;
      const inProgBacklog = allBacklog.filter((t) => normalizeTaskStatus(t.status) === 'IN_PROGRESS').length;
      const inRevBacklog = allBacklog.filter((t) => normalizeTaskStatus(t.status) === 'IN_REVIEW').length;
      const doneBacklog = allBacklog.filter((t) => normalizeTaskStatus(t.status) === 'DONE').length;
      const visibleBacklog = filteredTasks.filter(
        (t) => !t.sprintId || !sprintIdSet.has(t.sprintId)
      );

      sections.push({
        key: 'backlog',
        sprint: null,
        title: tr("Backlog"),
        tasks: visibleBacklog,
        totalInSprint: allBacklog.length,
        todoInSprint: todoBacklog,
        inProgInSprint: inProgBacklog,
        inRevInSprint: inRevBacklog,
        doneInSprint: doneBacklog,
      });
    }

    return sections;
  }, [orderedSprints, tasks, filteredTasks, tasksSprintFilter]);

  const tasksSprintPillLabel = useMemo(() => {
    if (tasksSprintFilter === 'ALL') return tr("Sprint");
    if (tasksSprintFilter === 'BACKLOG') return tr("Backlog");
    const found = orderedSprints.find((s) => s.id === tasksSprintFilter);
    return found ? found.name : tr("Sprint");
  }, [tasksSprintFilter, orderedSprints]);

  const tasksAssigneePillLabel = useMemo(() => {
    if (taskOwnerFilter === 'ALL') return tr("Người được chỉ định");
    if (taskOwnerFilter === 'MINE') return `👤 ${tr("Của tôi")}`;
    if (taskOwnerFilter === 'UNASSIGNED') return tr("Chưa giao");
    const found = memberUsers.find((m) => m.id === taskOwnerFilter);
    return found
      ? found.fullName || found.displayName || found.username
      : tr("Người được chỉ định");
  }, [taskOwnerFilter, memberUsers]);

  const searchedSprintsForSheet = useMemo(() => {
    const q = tasksSprintSearchQuery.trim().toLowerCase();
    if (!q) return orderedSprints;
    return orderedSprints.filter((s) => s.name.toLowerCase().includes(q));
  }, [orderedSprints, tasksSprintSearchQuery]);

  const toggleSprintCollapse = (key: string) => {
    setCollapsedSprints((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBar} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {tr("Đang tải chi tiết Không gian...")}
          </Text>
        </View>
        <PersistentTabBar activeTab="spaces" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/spaces');
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {space?.name || `Space #${idNum}`}
              </Text>
              <View
                style={[
                  styles.roleHeaderPill,
                  {
                    backgroundColor: isPM
                      ? '#F59E0B22'
                      : isAssistant
                      ? '#10B98122'
                      : '#3B82F622',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleHeaderText,
                    {
                      color: isPM
                        ? '#F59E0B'
                        : isAssistant
                        ? '#10B981'
                        : '#3B82F6',
                    },
                  ]}
                >
                  {isPM
                    ? '👑 PM'
                    : isAssistant
                    ? `🛡️ ${tr("Trợ lý")}`
                    : `👤 ${tr("Thành viên")}`}
                </Text>
              </View>
            </View>
            {workspace && (
              <Text style={styles.headerSub} numberOfLines={1}>
                {workspace.name}
              </Text>
            )}
          </View>

          {isCoordinator && (
            <TouchableOpacity
              style={[
                styles.assignHeaderBtn,
                { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
              onPress={() => setAssignModalVisible(true)}
              activeOpacity={0.8}
            >
              <Sparkles size={15} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              setCreateTaskDefaultSprintId(
                typeof kanbanSprintId === 'number'
                  ? kanbanSprintId
                  : sprints.find((s) => s.status === 'ACTIVE')?.id ?? null
              );
              setCreateTaskVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Plus size={22} color={colors.text} />
          </TouchableOpacity>

          {isPM && (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => setEditSpaceVisible(true)}
              activeOpacity={0.7}
            >
              <Settings size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-tabs Bar (1. Tổng quan -> 2. Công việc -> 3. Bảng Kanban -> 4. Thành viên) */}
        <View style={styles.subTabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subTabBarContainer}
          >
            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'overview' && styles.subTabActive]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.8}
            >
              <BarChart2
                size={15}
                color={activeTab === 'overview' ? colors.primary : colors.subText}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'overview' && styles.subTabTextActive,
                ]}
              >
                {tr("Tổng quan")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'tasks' && styles.subTabActive]}
              onPress={() => setActiveTab('tasks')}
              activeOpacity={0.8}
            >
              <ListTodo
                size={15}
                color={activeTab === 'tasks' ? colors.primary : colors.subText}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'tasks' && styles.subTabTextActive,
                ]}
              >
                {tr("Công việc")}
              </Text>
              <View style={[styles.tabBadge, activeTab === 'tasks' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'tasks' && styles.tabBadgeTextActive]}>
                  {totalTasks}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'kanban' && styles.subTabActive]}
              onPress={() => setActiveTab('kanban')}
              activeOpacity={0.8}
            >
              <KanbanSquare
                size={15}
                color={activeTab === 'kanban' ? colors.primary : colors.subText}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'kanban' && styles.subTabTextActive,
                ]}
              >
                {tr("Bảng Kanban")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, activeTab === 'members' && styles.subTabActive]}
              onPress={() => setActiveTab('members')}
              activeOpacity={0.8}
            >
              <Users
                size={15}
                color={activeTab === 'members' ? colors.primary : colors.subText}
              />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'members' && styles.subTabTextActive,
                ]}
              >
                {tr("Thành viên")}
              </Text>
              <View style={[styles.tabBadge, activeTab === 'members' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'members' && styles.tabBadgeTextActive]}>
                  {members.length}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* MAIN SCROLLABLE CONTENT */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isKanbanDragging}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#579DFF"
              colors={['#579DFF']}
            />
          }
        >
          {/* ================================================================= */}
          {/* TAB 1: TỔNG QUAN & MINDMAP (FIRST TAB BY DEFAULT!) */}
          {/* ================================================================= */}
          {activeTab === 'overview' && (
            <View style={styles.tabSection}>
              {/* Progress Summary Card */}
              <View style={styles.cardBox}>
                <View style={styles.progressHeader}>
                  <Text style={styles.cardBoxTitle}>
                    {tr("TIẾN ĐỘ HOÀN THÀNH")}
                  </Text>
                  <Text
                    style={[
                      styles.progressPercentText,
                      { color: progressColor.main },
                    ]}
                  >
                    {percentComplete}%
                  </Text>
                </View>

                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${percentComplete}%`,
                        backgroundColor: progressColor.main,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.progressSubText}>
                  {tr("Đã hoàn tất {done} trên tổng số {total} nhiệm vụ", {
                    done: doneTasks,
                    total: totalTasks,
                  })}
                </Text>
              </View>

              {/* 4 Status Metric Cards */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("CẦN LÀM")}</Text>
                  <Text style={[styles.metricValue, { color: '#8C9BAB' }]}>
                    {todoTasks}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("ĐANG LÀM")}</Text>
                  <Text style={[styles.metricValue, { color: '#579DFF' }]}>
                    {inProgressTasks}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("CHỜ DUYỆT")}</Text>
                  <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                    {inReviewTasks}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{tr("ĐÃ XONG")}</Text>
                  <Text style={[styles.metricValue, { color: '#57D9A3' }]}>
                    {doneTasks}
                  </Text>
                </View>
              </View>

              {/* MINDMAP INTEGRATED INSIDE OVERVIEW TAB (Focused on current Sprint, other Sprints collapsed!) */}
              <SpaceMindmapView
                space={space}
                tasks={tasks}
                sprints={sprints}
                members={memberUsers}
                currentUser={user}
                onSelectTask={(t) => setSelectedTask(t)}
              />

              {/* Space Info Card */}
              <View style={styles.cardBox}>
                <Text style={styles.cardBoxTitle}>
                  {tr("THÔNG TIN KHÔNG GIAN")}
                </Text>

                <View style={styles.infoRow}>
                  <Calendar
                    size={16}
                    color="#8C9BAB"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.infoLabel}>{tr("Thời gian:")}</Text>
                  <Text style={styles.infoValue}>
                    {space?.startDate
                      ? new Date(space.startDate).toLocaleDateString(locale)
                      : tr("Chưa đặt")}{' '}
                    →{' '}
                    {space?.endDate
                      ? new Date(space.endDate).toLocaleDateString(locale)
                      : tr("Không thời hạn")}
                  </Text>
                </View>

                {workspace && (
                  <View style={styles.infoRow}>
                    <Building
                      size={16}
                      color="#8C9BAB"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.infoLabel}>{tr("Workspace:")}</Text>
                    <Text style={styles.infoValue}>{workspace.name}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Layers
                    size={16}
                    color="#8C9BAB"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.infoLabel}>{tr("Số lượng Sprint:")}</Text>
                  <Text style={styles.infoValue}>{sprints.length}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ================================================================= */}
          {/* TAB 2: DANH SÁCH CÔNG VIỆC THEO SPRINT & BACKLOG */}
          {/* ================================================================= */}
          {activeTab === 'tasks' && (
            <View style={styles.tabSection}>
              {/* Top Filter Strip (Search + Sprint Bottom Sheet + Assignee Bottom Sheet + Actions) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.searchIconBtn,
                    tasksSearchOpen && {
                      backgroundColor: colors.primaryBg,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setTasksSearchOpen(!tasksSearchOpen)}
                >
                  <Search
                    size={15}
                    color={tasksSearchOpen ? colors.primary : colors.subText}
                  />
                </TouchableOpacity>

                {/* Sprint Filter Dropdown Pill (Opens Bottom Sheet like Screenshot 1!) */}
                <TouchableOpacity
                  style={[
                    styles.dropdownPill,
                    tasksSprintFilter !== 'ALL' && {
                      backgroundColor: isDark ? '#1D3B6A' : '#EFF6FF',
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setTasksSprintSearchQuery('');
                    setTasksSprintSheetOpen(true);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownPillText,
                      tasksSprintFilter !== 'ALL' && {
                        color: colors.primary,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {tasksSprintPillLabel}
                  </Text>
                  <ChevronDown
                    size={14}
                    color={
                      tasksSprintFilter !== 'ALL'
                        ? colors.primary
                        : colors.subText
                    }
                  />
                </TouchableOpacity>

                {/* Assignee Filter Dropdown Pill */}
                <TouchableOpacity
                  style={[
                    styles.dropdownPill,
                    taskOwnerFilter !== 'ALL' && {
                      backgroundColor: isDark ? '#1D3B6A' : '#EFF6FF',
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setTasksAssigneeSheetOpen(true)}
                >
                  <Text
                    style={[
                      styles.dropdownPillText,
                      taskOwnerFilter !== 'ALL' && {
                        color: colors.primary,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {tasksAssigneePillLabel}
                  </Text>
                  <ChevronDown
                    size={14}
                    color={
                      taskOwnerFilter !== 'ALL'
                        ? colors.primary
                        : colors.subText
                    }
                  />
                </TouchableOpacity>

                {isCoordinator && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dropdownPill,
                        {
                          backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setAssignModalVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: colors.primary,
                        }}
                      >
                        ✨ {tr("Phân chia việc")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dropdownPill}
                      onPress={() => setCreateSprintVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: colors.text,
                        }}
                      >
                        {tr("+ Tạo Sprint")}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>

              {tasksSearchOpen && (
                <View style={styles.searchBoxRow}>
                  <Search size={15} color={colors.subText} />
                  <TextInput
                    style={styles.searchBoxInput}
                    placeholder={tr("Tìm kiếm tên công việc hoặc mã TASK...")}
                    placeholderTextColor={colors.mutedText}
                    value={tasksSearchQuery}
                    onChangeText={setTasksSearchQuery}
                    autoFocus
                  />
                  {tasksSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setTasksSearchQuery('')}>
                      <X size={15} color={colors.subText} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* SPRINT ACCORDION CARDS */}
              {sprintSections.map((sec) => {
                const isCollapsed = Boolean(collapsedSprints[sec.key]);

                return (
                  <View key={sec.key} style={styles.sprintAccordionCard}>
                    <TouchableOpacity
                      style={[
                        styles.sprintHeaderBar,
                        {
                          borderBottomColor: isCollapsed
                            ? 'transparent'
                            : colors.divider,
                        },
                      ]}
                      onPress={() => toggleSprintCollapse(sec.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.sprintHeaderTopRow}>
                        <View style={styles.sprintHeaderLeft}>
                          {isCollapsed ? (
                            <ChevronRight size={18} color={colors.subText} />
                          ) : (
                            <ChevronDown size={18} color={colors.text} />
                          )}
                          <Text
                            style={[
                              styles.sprintHeaderTitle,
                              { color: colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {sec.title}
                          </Text>

                          {sec.sprint && (
                            <View
                              style={[
                                styles.sprintBadge,
                                {
                                  backgroundColor:
                                    sec.sprint.status === 'ACTIVE'
                                      ? isDark
                                        ? '#1D3B6A'
                                        : '#DBEAFE'
                                      : sec.sprint.status === 'CLOSED'
                                      ? isDark
                                        ? '#22272B'
                                        : '#F3F4F6'
                                      : isDark
                                      ? '#3B2314'
                                      : '#FEF3C7',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sprintBadgeText,
                                  {
                                    color:
                                      sec.sprint.status === 'ACTIVE'
                                        ? '#2563EB'
                                        : sec.sprint.status === 'CLOSED'
                                        ? colors.subText
                                        : '#D97706',
                                  },
                                ]}
                              >
                                {systemLabel(sec.sprint.status)}
                              </Text>
                            </View>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.addInSprintBtn}
                          onPress={() => {
                            setCreateTaskDefaultSprintId(
                              sec.sprint ? sec.sprint.id : null
                            );
                            setCreateTaskVisible(true);
                          }}
                        >
                          <Plus size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.sprintSubRow}>
                        <View style={styles.sprintSubLeft}>
                          <Text style={styles.sprintCountSub}>
                            {sec.totalInSprint} {tr("Công việc")}
                          </Text>
                          {sec.sprint &&
                            isCoordinator &&
                            sec.sprint.status !== 'CLOSED' && (
                              <TouchableOpacity
                                style={[
                                  styles.sprintActionBtn,
                                  {
                                    backgroundColor:
                                      sec.sprint.status === 'FUTURE'
                                        ? '#16A34A'
                                        : '#2563EB',
                                  },
                                ]}
                                onPress={() =>
                                  handleToggleSprintStatus(sec.sprint!)
                                }
                              >
                                <Play size={9} color="#FFFFFF" />
                                <Text style={styles.sprintActionText}>
                                  {sec.sprint.status === 'FUTURE'
                                    ? tr("Bắt đầu Sprint")
                                    : tr("Kết thúc Sprint")}
                                </Text>
                              </TouchableOpacity>
                            )}
                        </View>

                        {/* 4 Colored Status Counters: Todo (Gray), In Progress (Blue), Review (Amber), Done (Green) */}
                        <View style={styles.statusCountersRow}>
                          <View
                            style={[
                              styles.counterPill,
                              {
                                backgroundColor: isDark ? '#22272B' : '#F1F5F9',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.counterPillText,
                                { color: colors.subText },
                              ]}
                            >
                              {sec.todoInSprint}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.counterPill,
                              {
                                backgroundColor: isDark ? '#1D3B6A' : '#DBEAFE',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.counterPillText,
                                { color: '#2563EB' },
                              ]}
                            >
                              {sec.inProgInSprint}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.counterPill,
                              {
                                backgroundColor: isDark ? '#3B2314' : '#FEF3C7',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.counterPillText,
                                { color: '#D97706' },
                              ]}
                            >
                              {sec.inRevInSprint}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.counterPill,
                              {
                                backgroundColor: isDark ? '#0D3823' : '#DCFCE7',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.counterPillText,
                                { color: '#16A34A' },
                              ]}
                            >
                              {sec.doneInSprint}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Sprint Task Rows */}
                    {!isCollapsed && (
                      <View style={styles.sprintTasksList}>
                        {sec.tasks.length === 0 ? (
                          <View style={styles.emptySprintBox}>
                            <Text style={styles.emptySprintText}>
                              {tr("Không có công việc nào trong giai đoạn này.")}
                            </Text>
                          </View>
                        ) : (
                          sec.tasks.map((t, tIdx) => {
                            const st = normalizeTaskStatus(t.status);
                            const isDone = st === 'DONE';
                            const oid = t.ownerId || t.assignee?.id;
                            const isMyTask = Boolean(
                              user?.id && oid === user.id
                            );
                            const assignedMember = members.find(
                              (m) => m.id === oid
                            );
                            const assigneeName =
                              assignedMember?.fullName ||
                              t.ownerName ||
                              t.assignee?.fullName;
                            const parsed = parseTaskDescriptionWithChecklist(
                              t.description
                            );
                            const avatarColor = oid
                              ? AVATAR_COLORS[oid % AVATAR_COLORS.length]
                              : '#64748B';

                            const stBadge =
                              st === 'DONE'
                                ? {
                                    bg: isDark ? '#0D3823' : '#DCFCE7',
                                    text: '#16A34A',
                                  }
                                : st === 'IN_REVIEW'
                                ? {
                                    bg: isDark ? '#3B2314' : '#FEF3C7',
                                    text: '#D97706',
                                  }
                                : st === 'IN_PROGRESS'
                                ? {
                                    bg: isDark ? '#1D3B6A' : '#DBEAFE',
                                    text: '#2563EB',
                                  }
                                : {
                                    bg: isDark ? '#22272B' : '#F1F5F9',
                                    text: colors.subText,
                                  };

                            return (
                              <TouchableOpacity
                                key={t.id}
                                style={[
                                  styles.cleanTaskRow,
                                  tIdx < sec.tasks.length - 1 && {
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.divider,
                                  },
                                  isMyTask && {
                                    borderLeftWidth: 4,
                                    borderLeftColor: '#2563EB',
                                    backgroundColor: isDark
                                      ? '#151F2E'
                                      : '#F8FAFF',
                                  },
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setSelectedTask(t)}
                              >
                                <View style={styles.cleanTaskCenter}>
                                  <Text
                                    style={[
                                      styles.cleanTaskTitle,
                                      isMyTask && {
                                        fontWeight: '800',
                                      },
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {t.title}
                                  </Text>

                                  {/* Pills Row: Status Badge + Mine / Claim + Verified */}
                                  <View style={styles.cleanPillsRow}>
                                    <View
                                      style={[
                                        styles.statusBadgePill,
                                        { backgroundColor: stBadge.bg },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.statusBadgePillText,
                                          { color: stBadge.text },
                                        ]}
                                      >
                                        {systemLabel(st)}
                                      </Text>
                                    </View>

                                    {isMyTask ? (
                                      <View style={styles.mineBadgePill}>
                                        <Text style={styles.mineBadgeText}>
                                          👤 {tr("CỦA TÔI")}
                                        </Text>
                                      </View>
                                    ) : !assigneeName ? (
                                      <TouchableOpacity
                                        style={styles.claimInlineBtn}
                                        onPress={() => setSelfAssignTask(t)}
                                      >
                                        <UserPlus size={10} color="#2563EB" />
                                        <Text style={styles.claimInlineText}>
                                          {tr("+ Nhận việc")}
                                        </Text>
                                      </TouchableOpacity>
                                    ) : null}

                                    {parsed.assistantVerified && (
                                      <View style={styles.verifiedTag}>
                                        <ShieldCheck
                                          size={10}
                                          color="#16A34A"
                                        />
                                        <Text style={styles.verifiedTagText}>
                                          {tr("Đạt yêu cầu")}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  {/* Bottom Code & Avatar Row */}
                                  <View style={styles.cleanCodeLine}>
                                    <Text
                                      style={[
                                        styles.cleanCodeText,
                                        isDone && styles.strikeThrough,
                                      ]}
                                    >
                                      TASK-{t.id}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: '#F97316',
                                        fontWeight: '800',
                                      }}
                                    >
                                      =
                                    </Text>
                                    {assigneeName && (
                                      <View style={styles.avatarAndNameInline}>
                                        <View
                                          style={[
                                            styles.tinyAvatar,
                                            {
                                              backgroundColor: isMyTask
                                                ? '#2563EB'
                                                : avatarColor,
                                            },
                                          ]}
                                        >
                                          <Text style={styles.tinyAvatarText}>
                                            {getInitials(assigneeName)}
                                          </Text>
                                        </View>
                                        <Text
                                          style={[
                                            styles.inlineAssigneeName,
                                            {
                                              color: isMyTask
                                                ? '#2563EB'
                                                : colors.subText,
                                              fontWeight: isMyTask
                                                ? '800'
                                                : '600',
                                            },
                                          ]}
                                          numberOfLines={1}
                                        >
                                          {assigneeName}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>

                                {/* Right Action Button */}
                                <View style={styles.cleanTaskRight}>
                                  {st === 'TODO' &&
                                    (isMyTask || (isPM && !oid)) && (
                                      <TouchableOpacity
                                        style={styles.rowActionBtn}
                                        onPress={() =>
                                          handleRequestStatusChange(
                                            t,
                                            'IN_PROGRESS'
                                          )
                                        }
                                      >
                                        <Text style={styles.rowActionBtnText}>
                                          {tr("Bắt đầu làm")}
                                        </Text>
                                      </TouchableOpacity>
                                    )}

                                  {st === 'IN_PROGRESS' && isMyTask && (
                                    <TouchableOpacity
                                      style={[
                                        styles.rowActionBtn,
                                        {
                                          backgroundColor: isDark
                                            ? '#3B2314'
                                            : '#FEF3C7',
                                        },
                                      ]}
                                      onPress={() =>
                                        handleRequestStatusChange(
                                          t,
                                          'IN_REVIEW'
                                        )
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.rowActionBtnText,
                                          { color: '#D97706' },
                                        ]}
                                      >
                                        {tr("Gửi Chờ duyệt")}
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {st === 'IN_REVIEW' && isPM && (
                                    <TouchableOpacity
                                      style={[
                                        styles.rowActionBtn,
                                        { backgroundColor: '#16A34A' },
                                      ]}
                                      onPress={() =>
                                        handleRequestStatusChange(t, 'DONE')
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.rowActionBtnText,
                                          { color: '#FFFFFF' },
                                        ]}
                                      >
                                        ✓ {tr("Duyệt Done")}
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {st === 'IN_REVIEW' && isAssistant && (
                                    <TouchableOpacity
                                      style={[
                                        styles.rowActionBtn,
                                        {
                                          backgroundColor:
                                            parsed.assistantVerified
                                              ? '#DCFCE7'
                                              : '#16A34A',
                                        },
                                      ]}
                                      onPress={() =>
                                        handleAssistantVerifyTask(
                                          t,
                                          !parsed.assistantVerified
                                        )
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.rowActionBtnText,
                                          {
                                            color: parsed.assistantVerified
                                              ? '#15803D'
                                              : '#FFFFFF',
                                          },
                                        ]}
                                      >
                                        {parsed.assistantVerified
                                          ? `✓ ${tr("Đã đạt")}`
                                          : tr("Đánh dấu Đạt")}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ================================================================= */}
          {/* TAB 3: BẢNG KANBAN 4 CỘT (MẶC ĐỊNH QUA SPRINT HIỆN TẠI, KÉO THẢ!) */}
          {/* ================================================================= */}
          {activeTab === 'kanban' && (
            <View style={styles.tabSection}>
              <KanbanBoard
                tasks={tasks}
                sprints={sprints}
                members={memberUsers}
                currentUserId={user?.id}
                userRole={currentUserRole}
                selectedSprintId={kanbanSprintId}
                onSelectSprint={(val) => setKanbanSprintId(val)}
                onUpdateStatus={handleDirectUpdateStatus}
                onRequestStatusChange={handleRequestStatusChange}
                onSelectTask={(t) => setSelectedTask(t)}
                onSelfAssign={(t) => setSelfAssignTask(t)}
                onAssistantVerify={handleAssistantVerifyTask}
                onDragStateChange={setIsKanbanDragging}
                onAddTask={() => {
                  setCreateTaskDefaultSprintId(
                    typeof kanbanSprintId === 'number'
                      ? kanbanSprintId
                      : sprints.find((s) => s.status === 'ACTIVE')?.id ?? null
                  );
                  setCreateTaskVisible(true);
                }}
              />
            </View>
          )}

          {/* ================================================================= */}
          {/* TAB 4: THÀNH VIÊN & PHÂN QUYỀN (MEMBERS & ROLES) */}
          {/* ================================================================= */}
          {activeTab === 'members' && (
            <View style={styles.tabSection}>
              <View style={styles.cardBox}>
                <View style={styles.memberHeaderRow}>
                  <Text style={styles.cardBoxTitle}>
                    {tr("DANH SÁCH THÀNH VIÊN (")}{members.length})
                  </Text>
                  {space?.workspaceId && isPM ? (
                    <TouchableOpacity
                      style={styles.addMemberBtn}
                      onPress={() => setAddMemberModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <UserPlus size={14} color="#579DFF" />
                      <Text style={styles.addMemberBtnText}>{tr("Thêm")}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {members.map((m, idx) => (
                  <View
                    key={`member-${m.id}-${idx}`}
                    style={[
                      styles.memberRow,
                      idx === members.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    {m.avatarUrl ? (
                      <Image
                        source={{ uri: m.avatarUrl }}
                        style={styles.memberAvatarImg}
                      />
                    ) : (
                      <View
                        style={[
                          styles.memberAvatar,
                          m.spaceRole === 'PM' && styles.ownerAvatar,
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberAvatarText,
                            m.spaceRole === 'PM' && styles.ownerAvatarText,
                          ]}
                        >
                          {getInitials(m.fullName, m.email)}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.memberNameLine}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.fullName || tr("Thành viên #{0}", { 0: m.id })}
                        </Text>
                        {m.spaceRole === 'PM' ? (
                          <View style={styles.ownerBadge}>
                            <Crown
                              size={11}
                              color="#FFAB00"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.ownerBadgeText}>
                              {tr("PM")}
                            </Text>
                          </View>
                        ) : m.spaceRole === 'ASSISTANT' ? (
                          <View style={styles.assistantBadge}>
                            <Shield
                              size={11}
                              color="#10B981"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.assistantBadgeText}>
                              {tr("Trợ lý (Assistant)")}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>
                              {tr("Member")}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {m.jobTitle
                          ? `${m.jobTitle} • ${m.email || `@${m.username}`}`
                          : m.email || `@${m.username}`}
                      </Text>

                      <View style={styles.memberStatsRow}>
                        <View style={styles.statDot} />
                        <Text style={styles.memberStatsText}>
                          {m.assignedTasksCount > 0
                            ? tr("{0} công việc ({1} hoàn thành)", {
                                0: m.assignedTasksCount,
                                1: m.completedTasksCount,
                              })
                            : tr("Chưa có công việc được giao")}
                        </Text>
                      </View>

                      {isPM && !m.isOwner && m.spaceRole !== 'PM' && (
                        <TouchableOpacity
                          style={styles.toggleRoleBtn}
                          onPress={() => handleChangeMemberRole(m)}
                        >
                          <Shield size={12} color={colors.primary} />
                          <Text
                            style={[
                              styles.toggleRoleBtnText,
                              { color: colors.primary },
                            ]}
                          >
                            {m.spaceRole === 'ASSISTANT'
                              ? tr("Chuyển về Thành viên (Member)")
                              : tr("Cấp quyền Trợ lý (Assistant)")}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* PERSISTENT BOTTOM TAB BAR */}
        <PersistentTabBar activeTab="spaces" />

        {/* ================================================================= */}
        {/* BOTTOM SHEET MODAL FOR TASKS TAB: LỌC THEO SPRINT (LIKE IMAGE 1) */}
        {/* ================================================================= */}
        <Modal
          visible={tasksSprintSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setTasksSprintSheetOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setTasksSprintSheetOpen(false)}
          >
            <View
              style={[
                styles.bottomSheet,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  style={[
                    styles.sheetCloseCircle,
                    { backgroundColor: isDark ? '#22272B' : '#F1F5F9' },
                  ]}
                  onPress={() => setTasksSprintSheetOpen(false)}
                >
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {tr("Lọc theo sprint")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTasksSprintFilter('ALL');
                    setTasksSprintSheetOpen(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: colors.subText,
                    }}
                  >
                    {tr("Bỏ chọn")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.sheetSearchRow,
                  {
                    backgroundColor: isDark ? '#161A1D' : '#F8FAFC',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Search size={15} color={colors.subText} />
                <TextInput
                  style={[styles.sheetSearchInput, { color: colors.text }]}
                  placeholder={tr("Tìm kiếm Sprint...")}
                  placeholderTextColor={colors.mutedText}
                  value={tasksSprintSearchQuery}
                  onChangeText={setTasksSprintSearchQuery}
                />
              </View>

              <View
                style={[
                  styles.sheetListContainer,
                  {
                    backgroundColor: isDark ? '#161A1D' : '#FFFFFF',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                {/* Backlog Option */}
                <TouchableOpacity
                  style={[
                    styles.sheetRadioRow,
                    searchedSprintsForSheet.length > 0 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.divider,
                    },
                  ]}
                  onPress={() => {
                    setTasksSprintFilter('BACKLOG');
                    setTasksSprintSheetOpen(false);
                  }}
                >
                  <Text style={[styles.sheetRadioLabel, { color: colors.text }]}>
                    {tr("Backlog")}
                  </Text>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          tasksSprintFilter === 'BACKLOG'
                            ? colors.primary
                            : colors.subText,
                      },
                    ]}
                  >
                    {tasksSprintFilter === 'BACKLOG' && (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {searchedSprintsForSheet.map((sp, idx) => {
                  const isSelected = tasksSprintFilter === sp.id;
                  return (
                    <TouchableOpacity
                      key={sp.id}
                      style={[
                        styles.sheetRadioRow,
                        idx < searchedSprintsForSheet.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.divider,
                        },
                      ]}
                      onPress={() => {
                        setTasksSprintFilter(sp.id);
                        setTasksSprintSheetOpen(false);
                      }}
                    >
                      <View style={styles.sheetRadioLeft}>
                        <Text
                          style={[
                            styles.sheetRadioLabel,
                            { color: colors.text },
                          ]}
                        >
                          {sp.name}
                        </Text>
                        {sp.status === 'ACTIVE' && (
                          <View style={styles.activeSprintPill}>
                            <Text style={styles.activeSprintPillText}>
                              {systemLabel('ACTIVE')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : colors.subText,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ================================================================= */}
        {/* BOTTOM SHEET MODAL FOR TASKS TAB: NGƯỜI ĐƯỢC CHỈ ĐỊNH */}
        {/* ================================================================= */}
        <Modal
          visible={tasksAssigneeSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setTasksAssigneeSheetOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setTasksAssigneeSheetOpen(false)}
          >
            <View
              style={[
                styles.bottomSheet,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  style={[
                    styles.sheetCloseCircle,
                    { backgroundColor: isDark ? '#22272B' : '#F1F5F9' },
                  ]}
                  onPress={() => setTasksAssigneeSheetOpen(false)}
                >
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {tr("Người được chỉ định")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTaskOwnerFilter('ALL');
                    setTasksAssigneeSheetOpen(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: colors.subText,
                    }}
                  >
                    {tr("Bỏ chọn")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.sheetListContainer,
                  {
                    backgroundColor: isDark ? '#161A1D' : '#FFFFFF',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                {[
                  { key: 'ALL' as const, label: tr("Tất cả thành viên") },
                  { key: 'MINE' as const, label: `👤 ${tr("Việc của tôi")}` },
                  { key: 'UNASSIGNED' as const, label: tr("Chưa giao") },
                ].map((opt) => {
                  const isSelected = taskOwnerFilter === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sheetRadioRow,
                        {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.divider,
                        },
                      ]}
                      onPress={() => {
                        setTaskOwnerFilter(opt.key);
                        setTasksAssigneeSheetOpen(false);
                      }}
                    >
                      <Text
                        style={[styles.sheetRadioLabel, { color: colors.text }]}
                      >
                        {opt.label}
                      </Text>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : colors.subText,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {memberUsers.map((m, idx) => {
                  const mName = m.fullName || m.displayName || m.username;
                  const isSelected = taskOwnerFilter === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.sheetRadioRow,
                        idx < memberUsers.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.divider,
                        },
                      ]}
                      onPress={() => {
                        setTaskOwnerFilter(m.id);
                        setTasksAssigneeSheetOpen(false);
                      }}
                    >
                      <Text
                        style={[styles.sheetRadioLabel, { color: colors.text }]}
                      >
                        {mName}
                      </Text>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : colors.subText,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Status Transition Confirmation Modal */}
        <StatusConfirmModal
          visible={confirmModalState.visible}
          task={confirmModalState.task}
          targetStatus={confirmModalState.targetStatus}
          isRevertWithReason={confirmModalState.isRevert}
          onClose={() =>
            setConfirmModalState((prev) => ({ ...prev, visible: false }))
          }
          onConfirm={handleExecuteConfirmedStatusChange}
        />

        {/* Self-Assign Confirmation Modal */}
        <Modal
          visible={Boolean(selfAssignTask)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelfAssignTask(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.smallModalBox,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.smallModalTitle, { color: colors.text }]}>
                {tr("Xác nhận tự nhận công việc")}
              </Text>
              <Text style={[styles.smallModalSub, { color: colors.subText }]}>
                {selfAssignTask?.title}
              </Text>
              <View style={styles.smallModalBtns}>
                <TouchableOpacity
                  style={[
                    styles.smallModalCancel,
                    { borderColor: colors.cardBorder },
                  ]}
                  onPress={() => setSelfAssignTask(null)}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {tr("Hủy")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallModalConfirm,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleConfirmSelfAssign}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {tr("Nhận việc ngay")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Sprint Modal */}
        <Modal
          visible={createSprintVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateSprintVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.smallModalBox,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.memberHeaderRow}>
                <Text style={[styles.smallModalTitle, { color: colors.text }]}>
                  {tr("Tạo Giai Đoạn (Sprint) Mới")}
                </Text>
                <TouchableOpacity onPress={() => setCreateSprintVisible(false)}>
                  <X size={18} color={colors.subText} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder={`Sprint ${sprints.length + 1}`}
                placeholderTextColor={colors.mutedText}
                value={newSprintName}
                onChangeText={setNewSprintName}
              />

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder={tr("Mục tiêu của Sprint...")}
                placeholderTextColor={colors.mutedText}
                value={newSprintGoal}
                onChangeText={setNewSprintGoal}
              />

              <View style={styles.smallModalBtns}>
                <TouchableOpacity
                  style={[
                    styles.smallModalCancel,
                    { borderColor: colors.cardBorder },
                  ]}
                  onPress={() => setCreateSprintVisible(false)}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {tr("Hủy")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallModalConfirm,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleCreateSprint}
                  disabled={creatingSprint}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {tr("Tạo Sprint")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Task Detail Modal */}
        <TaskDetailModal
          visible={Boolean(selectedTask)}
          task={selectedTask}
          sprints={sprints}
          members={memberUsers}
          currentUserId={user?.id}
          userRole={currentUserRole}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTaskFull}
          onDeleteTask={handleDeleteTask}
        />

        {/* Manual & Auto Assign Modal */}
        <TaskAssignModal
          visible={assignModalVisible}
          tasks={tasks}
          sprints={sprints}
          members={memberUsers}
          onClose={() => setAssignModalVisible(false)}
          onAssignBatch={handleAssignBatch}
          onAssignSingle={handleAssignSingle}
        />

        {/* Create Task Modal */}
        <CreateTaskModal
          visible={createTaskVisible}
          sprints={sprints}
          members={memberUsers}
          defaultSprintId={createTaskDefaultSprintId}
          canAssignMember={isCoordinator}
          onClose={() => setCreateTaskVisible(false)}
          onSubmit={handleCreateTask}
        />

        {/* Space Edit Modal */}
        <SpaceModal
          visible={editSpaceVisible}
          onClose={() => setEditSpaceVisible(false)}
          onSubmit={handleEditSpace}
          spaceToEdit={space}
          onDelete={handleDeleteSpace}
        />

        {/* Add Space Member Modal */}
        {space?.workspaceId ? (
          <AddSpaceMemberModal
            visible={addMemberModalVisible}
            workspaceId={space.workspaceId}
            spaceId={idNum}
            existingMemberIds={members.map((m) => m.id)}
            onClose={() => setAddMemberModalVisible(false)}
            onMemberAdded={() => loadData(true)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: colors.subText,
    },
    headerBar: {
      height: 58,
      backgroundColor: colors.headerBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.headerBorder,
      gap: 6,
    },
    backBtn: {
      padding: 6,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    roleHeaderPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    roleHeaderText: {
      fontSize: 10,
      fontWeight: '800',
    },
    headerSub: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 1,
    },
    assignHeaderBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsBtn: {
      padding: 6,
    },
    subTabBarWrapper: {
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    subTabBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 6,
    },
    subTabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      gap: 6,
    },
    subTabActive: {
      borderBottomColor: colors.primary,
    },
    subTabText: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '600',
    },
    subTabTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    tabBadge: {
      backgroundColor: colors.cardBg,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
    },
    tabBadgeActive: {
      backgroundColor: colors.primaryBg,
    },
    tabBadgeText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '700',
    },
    tabBadgeTextActive: {
      color: colors.primary,
    },
    content: {
      flex: 1,
      padding: 14,
    },
    tabSection: {
      gap: 14,
    },
    filterScroll: {
      gap: 8,
      alignItems: 'center',
      paddingBottom: 2,
    },
    searchIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.cardBg,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropdownPillText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    searchBoxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      height: 40,
    },
    searchBoxInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
    },
    sprintAccordionCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    sprintHeaderBar: {
      padding: 14,
      borderBottomWidth: 1,
      gap: 8,
    },
    sprintHeaderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sprintHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    sprintHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    sprintBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    sprintBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    sprintSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 26,
    },
    sprintSubLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sprintCountSub: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '500',
    },
    sprintActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    sprintActionText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    statusCountersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    counterPill: {
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      alignItems: 'center',
    },
    counterPillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    addInSprintBtn: {
      padding: 4,
    },
    sprintTasksList: {
      backgroundColor: colors.cardBg,
    },
    emptySprintBox: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptySprintText: {
      color: colors.mutedText,
      fontSize: 12,
      fontStyle: 'italic',
    },
    cleanTaskRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 12,
    },
    cleanTaskLeftIcon: {
      paddingTop: 2,
    },
    cleanTaskCenter: {
      flex: 1,
      gap: 6,
    },
    cleanTaskTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 21,
    },
    strikeThrough: {
      textDecorationLine: 'line-through',
      color: colors.subText,
    },
    cleanPillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    mineBadgePill: {
      backgroundColor: '#2563EB',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    mineBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    claimInlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#1D3B6A' : '#DBEAFE',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    claimInlineText: {
      color: '#2563EB',
      fontSize: 10,
      fontWeight: '800',
    },
    statusBadgePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgePillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    verifiedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    verifiedTagText: {
      color: '#15803D',
      fontSize: 10,
      fontWeight: '800',
    },
    cleanCodeLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    cleanCodeText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },
    avatarAndNameInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tinyAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tinyAvatarText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    inlineAssigneeName: {
      fontSize: 12,
      maxWidth: 140,
    },
    cleanTaskRight: {
      justifyContent: 'center',
      alignSelf: 'center',
    },
    rowActionBtn: {
      backgroundColor: isDark ? '#1D3B6A' : '#DBEAFE',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    rowActionBtnText: {
      color: '#2563EB',
      fontSize: 11,
      fontWeight: '800',
    },
    cardBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardBoxTitle: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      marginBottom: 14,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressPercentText: {
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 12,
    },
    progressBarTrack: {
      height: 8,
      backgroundColor: colors.inputBg,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 10,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressSubText: {
      color: colors.subText,
      fontSize: 12,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '48%',
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    metricLabel: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 6,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    infoLabel: {
      color: colors.subText,
      fontSize: 13,
      width: 120,
    },
    infoValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    memberHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    addMemberBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    addMemberBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    memberAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    memberAvatarImg: {
      width: 42,
      height: 42,
      borderRadius: 21,
      marginRight: 14,
    },
    ownerAvatar: {
      backgroundColor: '#332E1B',
      borderColor: '#FFAB00',
    },
    memberAvatarText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 14,
    },
    ownerAvatarText: {
      color: '#FFAB00',
    },
    memberNameLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    memberName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      flexShrink: 1,
    },
    ownerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#332E1B',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    ownerBadgeText: {
      color: '#FFAB00',
      fontSize: 10,
      fontWeight: '800',
    },
    assistantBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B98120',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    assistantBadgeText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '800',
    },
    memberBadge: {
      backgroundColor: colors.inputBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    memberBadgeText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '700',
    },
    memberEmail: {
      color: colors.subText,
      fontSize: 12,
      marginBottom: 4,
    },
    memberStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#36B37E',
    },
    memberStatsText: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '600',
    },
    toggleRoleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.primaryBg,
    },
    toggleRoleBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      gap: 14,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetCloseCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    sheetSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      height: 40,
    },
    sheetSearchInput: {
      flex: 1,
      fontSize: 13,
    },
    sheetListContainer: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    sheetRadioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    sheetRadioLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sheetRadioLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    activeSprintPill: {
      backgroundColor: '#DBEAFE',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    activeSprintPillText: {
      color: '#2563EB',
      fontSize: 10,
      fontWeight: '800',
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    smallModalBox: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      gap: 12,
    },
    smallModalTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    smallModalSub: {
      fontSize: 13,
      lineHeight: 19,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    smallModalBtns: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    smallModalCancel: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    smallModalConfirm: {
      flex: 1.3,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
    },
  });
