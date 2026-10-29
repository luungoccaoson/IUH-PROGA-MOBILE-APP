import { create } from 'zustand';
import { Workspace, Space, Task } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  spaces: Space[];
  currentSpace: Space | null;
  tasks: Task[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setSpaces: (spaces: Space[]) => void;
  setCurrentSpace: (space: Space | null) => void;
  setTasks: (tasks: Task[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  spaces: [],
  currentSpace: null,
  tasks: [],

  setWorkspaces: (workspaces: Workspace[]) => set({ workspaces }),
  setCurrentWorkspace: (workspace: Workspace | null) => set({ currentWorkspace: workspace }),
  setSpaces: (spaces: Space[]) => set({ spaces }),
  setCurrentSpace: (space: Space | null) => set({ currentSpace: space }),
  setTasks: (tasks: Task[]) => set({ tasks }),
}));
