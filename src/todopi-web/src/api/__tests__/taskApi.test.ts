import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTask, fetchTasks, TaskApiError } from '../taskApi';
import type { CreateTaskRequest, Task } from '../../types/task';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Task 1',
  description: null,
  priority: 'High',
  dueDate: null,
  tags: null,
  status: 'Incomplete',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchTasks', () => {
  it('calls GET /api/tasks and returns the task list', async () => {
    const tasks: Task[] = [makeTask(), makeTask({ id: 2, title: 'Task 2' })];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tasks,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchTasks();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks');
    expect(result).toEqual(tasks);
  });

  it('includes includeCompleted when enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    await fetchTasks({ includeCompleted: true });
    expect(fetchMock.mock.calls[0][0]).toContain('includeCompleted=true');
  });

  it('passes an AbortSignal to fetch when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await fetchTasks(undefined, signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', { signal });
  });

  it('serializes includeCompleted, sortBy, and tag parameters together', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    await fetchTasks({ includeCompleted: true, sortBy: 'dueDate', tag: '__none__' });

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('includeCompleted')).toBe('true');
    expect(url.searchParams.get('sortBy')).toBe('dueDate');
    expect(url.searchParams.get('tag')).toBe('__none__');
  });

  it('throws a TaskApiError on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ title: 'Server error', status: 500 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const error = await fetchTasks().catch((e) => e);

    expect(error).toBeInstanceOf(TaskApiError);
    expect(error.status).toBe(500);
  });
});

describe('createTask', () => {
  it('sends the request as a JSON body to POST /api/tasks', async () => {
    const request: CreateTaskRequest = {
      title: 'New task',
      description: 'description',
      priority: 'High',
      dueDate: '2025-02-01',
      tags: 'work',
    };
    const created: Task = makeTask({
      id: 10,
      title: 'New task',
      description: 'description',
      priority: 'High',
      dueDate: '2025-02-01',
      tags: 'work',
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => created,
    });
    vi.stubGlobal('fetch', fetchMock);

    await createTask(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tasks');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(request);
  });

  it('returns the created task from the response', async () => {
    const created: Task = makeTask({ title: 'Created task' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => created,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createTask({ title: 'Created task' });

    expect(result).toEqual(created);
  });

  it('throws a TaskApiError with details on 400 response', async () => {
    const problemDetails = {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: { Title: ['The Title field is required.'] },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => problemDetails,
    });
    vi.stubGlobal('fetch', fetchMock);

    const error = await createTask({ title: '' }).catch((e) => e);

    expect(error).toBeInstanceOf(TaskApiError);
    expect(error.status).toBe(400);
    expect(error.details).toEqual(problemDetails);
  });
});
