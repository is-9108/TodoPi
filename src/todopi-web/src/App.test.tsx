import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { Priority, TaskStatus, type Task } from './types/task';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'タスクA',
  description: null,
  priority: Priority.High,
  dueDate: null,
  tags: null,
  status: TaskStatus.Incomplete,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200, ok = true) => ({
  ok,
  status,
  json: async () => body,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('fetches tasks on mount and shows only Incomplete tasks', async () => {
    const tasks = [
      makeTask({ id: 1, title: '未完了タスク', status: TaskStatus.Incomplete }),
      makeTask({ id: 2, title: '完了タスク', status: TaskStatus.Completed }),
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(tasks));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('未完了タスク')).toBeInTheDocument();
    expect(screen.queryByText('完了タスク')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks');
  });

  it('adds a task via the form and shows it in the list', async () => {
    const user = userEvent.setup();
    const created = makeTask({ id: 3, title: '新しいタスク' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(created, 201))
      .mockResolvedValueOnce(jsonResponse([created]));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('タスクがありません')).toBeInTheDocument();

    await user.type(screen.getByLabelText('タイトル'), '新しいタスク');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('新しいタスク')).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      ([, options]) => options?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    expect(postCall![0]).toBe('/api/tasks');
    expect(JSON.parse(postCall![1].body)).toMatchObject({ title: '新しいタスク' });
  });

  it('shows an error message when loading tasks fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ title: 'Server Error' }, 500, false),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server Error');
  });

  it('shows a loading indicator while tasks are being fetched', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByRole('status')).toBeInTheDocument();

    resolveFetch(jsonResponse([]));
    expect(await screen.findByText('タスクがありません')).toBeInTheDocument();
  });
});
