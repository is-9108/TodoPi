import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  window.history.pushState({}, '', '/');
});

describe('App', () => {
  it('一覧のタスクから対応する詳細へ遷移し、一覧へ戻れる', async () => {
    const user = userEvent.setup();
    const task = makeTask({ title: 'Open detail' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([task]))
      .mockResolvedValueOnce(jsonResponse(task));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await user.click(await screen.findByText('Open detail'));
    expect(window.location.pathname).toBe('/tasks/1');
    expect(await screen.findByText('Open detail')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/tasks/1')).toBe(true));
    await user.click(screen.getByRole('button', { name: /一覧へ戻る/ }));
    expect(window.location.pathname).toBe('/');
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === '/api/tasks').length).toBe(2));
  });

  it('shows task details directly from the URL', async () => {
    window.history.pushState({}, '', '/tasks/3');
    const task = makeTask({ id: 3, title: 'URL detail' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(task));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    expect(await screen.findByText('URL detail')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tasks/3')).toBe(true);
    window.history.pushState({}, '', '/');
  });

  it('詳細画面を切り替えた場合は古い詳細レスポンスを無視する', async () => {
    const user = userEvent.setup();
    const first = makeTask({ id: 1, title: 'First detail' });
    const second = makeTask({ id: 2, title: 'Second detail' });
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/tasks/1') {
        return new Promise((resolve) => { resolveFirst = resolve; });
      }
      if (url === '/api/tasks/2') {
        return new Promise((resolve) => { resolveSecond = resolve; });
      }
      return Promise.resolve(jsonResponse([first, second]));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.click(await screen.findByText('First detail'));
    await waitFor(() => expect(resolveFirst).toBeDefined());
    window.history.pushState({}, '', '/tasks/2');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(resolveSecond).toBeDefined());

    await act(async () => {
      resolveSecond(jsonResponse(second));
    });
    expect(await screen.findByText('Second detail')).toBeInTheDocument();
    await act(async () => {
      resolveFirst(jsonResponse(first));
    });
    expect(screen.queryByText('First detail')).not.toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('表示済み詳細から別IDへ切り替えると旧フォームを隠し、旧フォームの保存も拒否する', async () => {
    const first = makeTask({ id: 1, title: 'First detail' });
    const second = makeTask({ id: 2, title: 'Second detail' });
    let resolveSecond!: (value: unknown) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL, _options?: RequestInit) => {
      if (String(input) === '/api/tasks/1') return Promise.resolve(jsonResponse(first));
      if (String(input) === '/api/tasks/2') {
        return new Promise((resolve) => { resolveSecond = resolve; });
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/tasks/1');
    render(<App />);
    expect(await screen.findByText('First detail')).toBeInTheDocument();
    const oldForm = screen.getByLabelText('タイトル').closest('form')!;
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();

    window.history.pushState({}, '', '/tasks/2');
    await act(async () => { fireEvent.submit(oldForm); });
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);

    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.queryByText('First detail')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('タイトル')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
    await waitFor(() => expect(resolveSecond).toBeDefined());
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中');

    await act(async () => { resolveSecond(jsonResponse(second)); });
    expect(await screen.findByText('Second detail')).toBeInTheDocument();
    expect(screen.getByLabelText('タイトル')).toHaveValue('Second detail');
  });

  it('不正なIDと不存在タスクのエラーを表示する', async () => {
    window.history.pushState({}, '', '/tasks/nope');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ title: 'Not found' }, 404, false));
    vi.stubGlobal('fetch', fetchMock);
    let view = render(<App />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    view.unmount();
    window.history.pushState({}, '', '/tasks/2147483648');
    view = render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('不正なタスクIDです');
    expect(fetchMock).not.toHaveBeenCalled();
    view.unmount();
    window.history.pushState({}, '', '/tasks/77');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not found');
    window.history.pushState({}, '', '/');
  });

  it('詳細取得エラー後に別IDへ移動すると古いエラーをすぐ消す', async () => {
    let resolveNext!: (value: unknown) => void;
    const next = makeTask({ id: 78, title: 'Recovered detail' });
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/tasks/77') {
        return Promise.resolve(jsonResponse({ title: 'Not found' }, 404, false));
      }
      if (String(input) === '/api/tasks/78') {
        return new Promise((resolve) => { resolveNext = resolve; });
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/tasks/77');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not found');

    window.history.pushState({}, '', '/tasks/78');
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(resolveNext).toBeDefined());
    await act(async () => { resolveNext(jsonResponse(next)); });
    expect(await screen.findByText('Recovered detail')).toBeInTheDocument();
  });

  it('保存後に更新内容と更新日時を表示する', async () => {
    const user = userEvent.setup();
    const original = makeTask({ title: 'Before edit' });
    const updated = makeTask({ title: 'After edit', status: TaskStatus.Completed, updatedAt: '2025-03-03T00:00:00Z' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([original]))
      .mockResolvedValueOnce(jsonResponse(original))
      .mockResolvedValueOnce(jsonResponse(updated))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([updated]));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await user.click(await screen.findByText('Before edit'));
    await screen.findByLabelText('タイトル');
    await user.clear(screen.getByLabelText('タイトル'));
    await user.type(screen.getByLabelText('タイトル'), 'After edit');
    await user.selectOptions(screen.getByLabelText('状態'), 'Completed');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT' && JSON.parse(String(options.body)).status === 'Completed')).toBe(true));
    expect(await screen.findByText('After edit')).toBeInTheDocument();
    expect(await screen.findByText('2025-03-03T00:00:00Z')).toBeInTheDocument();
    expect(screen.getByLabelText('状態')).toHaveValue('Completed');
    expect(await screen.findByText('保存しました')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /一覧へ戻る/ }));
    expect(await screen.findByText('タスクがありません')).toBeInTheDocument();
    await user.click(screen.getByTestId('show-completed-toggle'));
    expect(await screen.findByText('After edit')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tasks?includeCompleted=true')).toBe(true);
  });

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
