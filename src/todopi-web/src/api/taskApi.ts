import type { CreateTaskRequest, Task } from '../types/task';

function extractTitle(details: unknown): string | undefined {
  if (typeof details === 'object' && details !== null && 'title' in details) {
    const title = (details as { title?: unknown }).title;
    if (typeof title === 'string') {
      return title;
    }
  }
  return undefined;
}

export class TaskApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, details?: unknown) {
    super(extractTitle(details) ?? `Request failed with status ${status}`);
    this.name = 'TaskApiError';
    this.status = status;
    this.details = details;
  }
}

async function parseErrorDetails(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export interface FetchTasksParams {
  includeCompleted?: boolean;
  sortBy?: 'priority' | 'dueDate';
  tag?: string | null;
}

export async function fetchTasks(
  params?: FetchTasksParams,
  signal?: AbortSignal,
): Promise<Task[]> {
  const searchParams = new URLSearchParams();

  if (params?.includeCompleted) {
    searchParams.set('includeCompleted', 'true');
  }
  if (params?.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  if (params?.tag) {
    searchParams.set('tag', params.tag);
  }

  const query = searchParams.toString();
  const url = query ? `/api/tasks?${query}` : '/api/tasks';
  const response = signal
    ? await fetch(url, { signal })
    : await fetch(url);
  if (!response.ok) {
    throw new TaskApiError(response.status, await parseErrorDetails(response));
  }
  return response.json();
}

export async function createTask(request: CreateTaskRequest): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new TaskApiError(response.status, await parseErrorDetails(response));
  }
  return response.json();
}
