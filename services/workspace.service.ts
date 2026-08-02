import { apiClient } from './api';
import { Workspace, Space, Task, TaskStatus, ApiResponse, ChatMessage } from '../types';

export const workspaceService = {
  // Workspaces
  getWorkspacesByOwner: async (ownerId: number): Promise<Workspace[]> => {
    const response = await apiClient.get<ApiResponse<Workspace[]>>(`/workspaces/owner/${ownerId}`);
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
