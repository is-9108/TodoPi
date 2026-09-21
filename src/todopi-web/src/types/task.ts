export const Priority = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
} as const;

export const TaskStatus = {
  Incomplete: 'Incomplete',
  Completed: 'Completed',
} as const;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  tags: string | null;
  status: string;
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
