export const Priority = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
} as const;

export const TaskStatus = {
  Incomplete: 'Incomplete',
  Completed: 'Completed',
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  tags: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  tags?: string;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  tags?: string | null;
  status?: TaskStatus;
}
