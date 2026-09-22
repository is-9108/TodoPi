import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('fetches tasks on mount', async () => {
    const tasks = [makeTask({ title: '未完了タスク' })];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(tasks));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('未完了タスク')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tasks')).toBe(true);
  });

  it('adds a task via the form and reloads the list', async () => {
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
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true);
  });

  it('reloads with query parameters when filters change', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('タスクがありません');
    await user.selectOptions(screen.getByTestId('tag-select'), '__none__');

    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls.some((url) => url.includes('tag=__none__'))).toBe(true);
  });

  it('reloads when completed visibility and sort order change', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('タスクがありません');

    await user.click(screen.getByTestId('show-completed-toggle'));
    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain(
        '/api/tasks?includeCompleted=true',
      ),
    );

    await user.selectOptions(screen.getByTestId('sort-select'), 'dueDate');
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(urls).toContain('/api/tasks?includeCompleted=true&sortBy=dueDate');
    });
  });

  it('shows an error when loading tasks fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ title: 'Server Error' }, 500, false),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server Error');
  });

  it('shows a loading indicator while tasks are being fetched', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByRole('status')).toBeInTheDocument();
    resolveFetch(jsonResponse([]));
    expect(await screen.findByText('タスクがありません')).toBeInTheDocument();
  });

  it('ignores an older response when a newer filter request finishes first', async () => {
    const user = userEvent.setup();
    const initial = makeTask({ id: 1, title: 'Initial task', tags: 'work' });
    const stale = makeTask({ id: 2, title: 'Stale task', tags: 'work' });
    const latest = makeTask({ id: 3, title: 'Latest task', tags: 'work' });
    let resolveStale!: (value: unknown) => void;
    let resolveLatest!: (value: unknown) => void;

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.searchParams.get('tag') === 'work' && url.searchParams.get('sortBy') === 'dueDate') {
        return new Promise((resolve) => { resolveLatest = resolve; });
      }
      if (url.searchParams.get('tag') === 'work') {
        return new Promise((resolve) => { resolveStale = resolve; });
      }
      return Promise.resolve(jsonResponse([initial]));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Initial task')).toBeInTheDocument();
    await user.selectOptions(screen.getByTestId('tag-select'), 'work');
    await waitFor(() => expect(resolveStale).toBeDefined());
    await user.selectOptions(screen.getByTestId('sort-select'), 'dueDate');
    await waitFor(() => expect(resolveLatest).toBeDefined());

    resolveLatest(jsonResponse([latest]));
    expect(await screen.findByText('Latest task')).toBeInTheDocument();
    resolveStale(jsonResponse([stale]));
    await waitFor(() => expect(screen.queryByText('Stale task')).not.toBeInTheDocument());
  });

  it('keeps API-returned order in the rendered list', async () => {
    const tasks = [
      makeTask({ id: 1, title: 'First from API', priority: Priority.Low }),
      makeTask({ id: 2, title: 'Second from API', priority: Priority.High }),
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(tasks));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('First from API')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('First from API')).toBeInTheDocument();
    expect(within(items[1]).getByText('Second from API')).toBeInTheDocument();
  });
});
