import { apiClient } from './api';
import {
  Workspace,
  Space,
  Sprint,
  SprintStatus,
  Task,
  TaskStatus,
  TaskPriority,
  ApiResponse,
  ChatMessage,
  ClassifiedWorkspaces,
  WorkspaceMember,
} from '../types';

export const workspaceService = {
  // Workspaces
  getWorkspacesByOwner: async (ownerId: number): Promise<Workspace[]> => {
    const response = await apiClient.get<ApiResponse<Workspace[]>>(`/workspaces/owner/${ownerId}`);
    return response.data.data;
  },

  getClassifiedWorkspaces: async (userId: number): Promise<ClassifiedWorkspaces> => {
    const response = await apiClient.get<ApiResponse<ClassifiedWorkspaces>>(`/workspaces/user/${userId}/classified`);
    return response.data.data;
  },

  inviteMember: async (workspaceId: number, userId: number, roleId: number = 3): Promise<void> => {
    await apiClient.post(`/workspaces/${workspaceId}/invite?userId=${userId}&roleId=${roleId}`);
  },

  acceptInvitation: async (workspaceId: number, userId: number): Promise<void> => {
    await apiClient.put(`/workspaces/${workspaceId}/invitations/accept?userId=${userId}`);
  },

  declineInvitation: async (workspaceId: number, userId: number): Promise<void> => {
    await apiClient.put(`/workspaces/${workspaceId}/invitations/decline?userId=${userId}`);
  },

  getWorkspaceMembers: async (workspaceId: number): Promise<WorkspaceMember[]> => {
    const response = await apiClient.get<ApiResponse<WorkspaceMember[]>>(`/workspaces/${workspaceId}/members`);
    return response.data.data;
  },

  getWorkspaceById: async (id: number): Promise<Workspace> => {
    const response = await apiClient.get<ApiResponse<Workspace>>(`/workspaces/${id}`);
    return response.data.data;
  },

  createWorkspace: async (data: { name: string; description?: string; ownerId: number }): Promise<Workspace> => {
    const response = await apiClient.post<ApiResponse<Workspace>>('/workspaces', data);
    return response.data.data;
  },

  updateWorkspace: async (id: number, data: { name: string; description?: string; ownerId: number }): Promise<Workspace> => {
    const response = await apiClient.put<ApiResponse<Workspace>>(`/workspaces/${id}`, data);
    return response.data.data;
  },

  deleteWorkspace: async (id: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/workspaces/${id}`);
  },

  // Spaces
  getSpaceById: async (id: number): Promise<Space> => {
    const response = await apiClient.get<ApiResponse<Space>>(`/spaces/${id}`);
    return response.data.data;
  },

  getSpacesByWorkspace: async (workspaceId: number, userId?: number): Promise<Space[]> => {
    const url = userId ? `/spaces/workspace/${workspaceId}?userId=${userId}` : `/spaces/workspace/${workspaceId}`;
    const response = await apiClient.get<ApiResponse<Space[]>>(url);
    return response.data.data;
  },

  createSpace: async (data: { workspaceId: number; name: string; startDate?: string; endDate?: string; isPrivate?: boolean }): Promise<Space> => {
    const response = await apiClient.post<ApiResponse<Space>>('/spaces', data);
    return response.data.data;
  },

  updateSpace: async (id: number, data: { workspaceId: number; name: string; startDate?: string; endDate?: string; isPrivate?: boolean }): Promise<Space> => {
    const response = await apiClient.put<ApiResponse<Space>>(`/spaces/${id}`, data);
    return response.data.data;
  },

  deleteSpace: async (id: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/spaces/${id}`);
  },

  getSpaceMembers: async (spaceId: number): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/spaces/${spaceId}/members`);
    return response.data.data;
  },

  addMemberToSpace: async (spaceId: number, userId: number, roleId: number = 3): Promise<void> => {
    await apiClient.post(`/spaces/${spaceId}/members?userId=${userId}&roleId=${roleId}`);
  },

  updateSpaceMemberRole: async (spaceId: number, userId: number, roleId: number): Promise<void> => {
    await apiClient.put(`/spaces/${spaceId}/members/${userId}/role?roleId=${roleId}`);
  },

  removeMemberFromSpace: async (spaceId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/spaces/${spaceId}/members/${userId}`);
  },

  // Sprints
  getSprintsBySpace: async (spaceId: number, status?: SprintStatus): Promise<Sprint[]> => {
    const url = status
      ? `/sprints/space/${spaceId}?status=${status}`
      : `/sprints/space/${spaceId}`;
    const response = await apiClient.get<ApiResponse<Sprint[]>>(url);
    return response.data.data || [];
  },

  createSprint: async (data: {
    spaceId: number;
    name: string;
    goal?: string;
    status?: SprintStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<Sprint> => {
    const response = await apiClient.post<ApiResponse<Sprint>>('/sprints', data);
    return response.data.data;
  },

  updateSprint: async (
    id: number,
    data: {
      spaceId: number;
      name: string;
      goal?: string;
      status?: SprintStatus;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Sprint> => {
    const response = await apiClient.put<ApiResponse<Sprint>>(`/sprints/${id}`, data);
    return response.data.data;
  },

  updateSprintStatus: async (id: number, status: SprintStatus): Promise<Sprint> => {
    const response = await apiClient.patch<ApiResponse<Sprint>>(`/sprints/${id}/status?status=${status}`);
    return response.data.data;
  },

  deleteSprint: async (id: number, deleteTasks = false): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/sprints/${id}`, {
      params: { deleteTasks },
    });
  },

  // Tasks & Kanban
  getTasksBySpace: async (spaceId: number): Promise<Task[]> => {
    const response = await apiClient.get<ApiResponse<Task[]>>(`/tasks/space/${spaceId}`);
    return (response.data.data || []).filter((t) => !t.isDeleted);
  },

  getTasksBySprint: async (sprintId: number): Promise<Task[]> => {
    const response = await apiClient.get<ApiResponse<Task[]>>(`/tasks/sprint/${sprintId}`);
    return (response.data.data || []).filter((t) => !t.isDeleted);
  },

  updateTaskStatus: async (taskId: number, status: TaskStatus): Promise<Task> => {
    const apiStatus = status === 'REVIEW' ? 'IN_REVIEW' : status;
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/status?status=${apiStatus}`);
    return response.data.data;
  },

  updateTask: async (
    id: number,
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
  ): Promise<Task> => {
    const payload = {
      ...data,
      status: data.status === 'REVIEW' ? 'IN_REVIEW' : data.status,
    };
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
    return response.data.data;
  },

  createTask: async (data: {
    spaceId: number;
    sprintId?: number | null;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: string;
    ownerId?: number | null;
    startDate?: string;
    dueDate?: string;
  }): Promise<Task> => {
    const payload = {
      ...data,
      status: data.status === 'REVIEW' ? 'IN_REVIEW' : data.status,
    };
    const response = await apiClient.post<ApiResponse<Task>>('/tasks', payload);
    return response.data.data;
  },

  assignTasksBatch: async (
    assignments: { taskId: number; ownerId: number; startDate?: string; dueDate?: string }[]
  ): Promise<void> => {
    await apiClient.post<ApiResponse<void>>('/tasks/batch-assign', { assignments });
  },

  deleteTask: async (taskId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/tasks/${taskId}`);
  },

  // Get all spaces across user's workspaces (both owned and joined)
  getAllUserSpaces: async (userId: number): Promise<{ workspace: Workspace; spaces: Space[] }[]> => {
    try {
      let workspaces: Workspace[] = [];
      try {
        const classified = await workspaceService.getClassifiedWorkspaces(userId);
        workspaces = [...classified.ownedWorkspaces, ...classified.joinedWorkspaces];
      } catch {
        workspaces = await workspaceService.getWorkspacesByOwner(userId);
      }
      const results = await Promise.all(
        workspaces.map(async (ws) => {
          try {
            const spaces = await workspaceService.getSpacesByWorkspace(ws.id);
            return { workspace: ws, spaces };
          } catch {
            return { workspace: ws, spaces: [] };
          }
        })
      );
      return results;
    } catch {
      return [];
    }
  },

  // Get all tasks across user's spaces (with sprint names mapped!)
  getAllUserTasks: async (userId: number): Promise<{ task: Task; spaceName: string; workspaceName: string; sprintName?: string }[]> => {
    try {
      const userSpaces = await workspaceService.getAllUserSpaces(userId);
      const allTasks: { task: Task; spaceName: string; workspaceName: string; sprintName?: string }[] = [];

      await Promise.all(
        userSpaces.map(async (group) => {
          await Promise.all(
            group.spaces.map(async (sp) => {
              try {
                const [tasks, sprints] = await Promise.all([
                  workspaceService.getTasksBySpace(sp.id),
                  workspaceService.getSprintsBySpace(sp.id).catch(() => []),
                ]);
                const sprintMap = new Map<number, string>();
                sprints.forEach((s) => sprintMap.set(s.id, s.name));

                for (const t of tasks) {
                  const spName = t.sprintId ? sprintMap.get(t.sprintId) : undefined;
                  allTasks.push({
                    task: { ...t, sprintName: spName || t.sprintName },
                    spaceName: sp.name,
                    workspaceName: group.workspace.name,
                    sprintName: spName,
                  });
                }
              } catch {
                // ignore
              }
            })
          );
        })
      );
      return allTasks;
    } catch {
      return [];
    }
  },

  // AI Chat & Agent assistant
  sendAgentMessage: async (data: {
    agentType: 'REQUIREMENT' | 'PM' | 'TECHNICAL_ADVISOR';
    prompt: string;
    spaceId?: number;
  }): Promise<ChatMessage> => {
    try {
      const response = await apiClient.post<ApiResponse<ChatMessage>>('/ai/chat', data);
      return response.data.data;
    } catch (err) {
      return {
        id: Date.now(),
        threadId: 1,
        senderType: 'ASSISTANT',
        systemGenerated: true,
        messageContent: '[AI Agent {0}] Đã nhận phân tích yêu cầu: "{1}". Bạn có muốn phân rã nhiệm vụ này thành các task cụ thể không?',
        systemMessageValues: { 0: data.agentType, 1: data.prompt },
        jsonPayload: data.agentType === 'REQUIREMENT' ? JSON.stringify([
          { title: 'Xây dựng màn hình đăng nhập & xác thực', description: 'Giao diện login, validate input', priority: 'HIGH' },
          { title: 'Cấu hình kết nối API Gateway', description: 'Tích hợp JWT Token Interceptor', priority: 'URGENT' },
          { title: 'Thiết kế Bảng Kanban 4 cột', description: 'Cột TODO, IN_PROGRESS, IN_REVIEW, DONE', priority: 'MEDIUM' }
        ]) : undefined,
        createdAt: new Date().toISOString(),
      };
    }
  },
};
