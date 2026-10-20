import { apiClient } from './api';
import {
  Workspace,
  Space,
  Task,
  TaskStatus,
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
  getSpacesByWorkspace: async (workspaceId: number): Promise<Space[]> => {
    const response = await apiClient.get<ApiResponse<Space[]>>(`/spaces/workspace/${workspaceId}`);
    return response.data.data;
  },

  createSpace: async (data: { workspaceId: number; name: string; startDate?: string; endDate?: string }): Promise<Space> => {
    const response = await apiClient.post<ApiResponse<Space>>('/spaces', data);
    return response.data.data;
  },

  updateSpace: async (id: number, data: { workspaceId: number; name: string; startDate?: string; endDate?: string }): Promise<Space> => {
    const response = await apiClient.put<ApiResponse<Space>>(`/spaces/${id}`, data);
    return response.data.data;
  },

  deleteSpace: async (id: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/spaces/${id}`);
  },

  // Tasks & Kanban
  getTasksBySpace: async (spaceId: number): Promise<Task[]> => {
    const response = await apiClient.get<ApiResponse<Task[]>>(`/tasks/space/${spaceId}`);
    return response.data.data;
  },

  updateTaskStatus: async (taskId: number, status: TaskStatus): Promise<Task> => {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/status?status=${status}`);
    return response.data.data;
  },

  createTask: async (data: {
    spaceId: number;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: string;
    ownerId?: number;
    startDate?: string;
    dueDate?: string;
  }): Promise<Task> => {
    const response = await apiClient.post<ApiResponse<Task>>('/tasks', data);
    return response.data.data;
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
      const results: { workspace: Workspace; spaces: Space[] }[] = [];
      for (const ws of workspaces) {
        try {
          const spaces = await workspaceService.getSpacesByWorkspace(ws.id);
          results.push({ workspace: ws, spaces });
        } catch {
          results.push({ workspace: ws, spaces: [] });
        }
      }
      return results;
    } catch {
      return [];
    }
  },

  // Get all tasks across user's spaces
  getAllUserTasks: async (userId: number): Promise<{ task: Task; spaceName: string; workspaceName: string }[]> => {
    try {
      let workspaces: Workspace[] = [];
      try {
        const classified = await workspaceService.getClassifiedWorkspaces(userId);
        workspaces = [...classified.ownedWorkspaces, ...classified.joinedWorkspaces];
      } catch {
        workspaces = await workspaceService.getWorkspacesByOwner(userId);
      }
      const allTasks: { task: Task; spaceName: string; workspaceName: string }[] = [];

      for (const ws of workspaces) {
        try {
          const spaces = await workspaceService.getSpacesByWorkspace(ws.id);
          for (const sp of spaces) {
            try {
              const tasks = await workspaceService.getTasksBySpace(sp.id);
              for (const t of tasks) {
                allTasks.push({
                  task: t,
                  spaceName: sp.name,
                  workspaceName: ws.name,
                });
              }
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      }
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
      // Fallback mock AI response for demonstration if AI microservice is not online
      return {
        id: Date.now(),
        threadId: 1,
        senderType: 'ASSISTANT',
        messageContent: `[AI Agent ${data.agentType}] Đã nhận phân tích yêu cầu: "${data.prompt}". Bạn có muốn phân rã nhiệm vụ này thành các task cụ thể không?`,
        jsonPayload: data.agentType === 'REQUIREMENT' ? JSON.stringify([
          { title: 'Xây dựng màn hình đăng nhập & xác thực', description: 'Giao diện login, validate input', priority: 'HIGH' },
          { title: 'Cấu hình kết nối API Gateway', description: 'Tích hợp JWT Token Interceptor', priority: 'URGENT' },
          { title: 'Thiết kế Bảng Kanban 4 cột', description: 'Cột TODO, IN_PROGRESS, REVIEW, DONE', priority: 'MEDIUM' }
        ]) : undefined,
        createdAt: new Date().toISOString(),
      };
    }
  },
};
