import { useCallback, useEffect, useRef, useState } from 'react';
import { createTask, fetchTask, fetchTasks, TaskApiError, updateTask } from './api/taskApi';
import type { CreateTaskRequest, Task, UpdateTaskRequest } from './types/task';
import StatusMessage from './components/StatusMessage';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import TaskDetail from './components/TaskDetail';

const detailPathPrefix = '/tasks/';
const maxApiTaskId = 2_147_483_647;

function parseTaskId(path: string): number | null {
  const idString = path.slice(detailPathPrefix.length);
  const id = Number(idString);
  return /^[1-9]\d*$/.test(idString) && Number.isSafeInteger(id) && id <= maxApiTaskId ? id : null;
}

function getTaskErrorMessage(caught: unknown): string {
  return caught instanceof TaskApiError ? caught.message : 'タスクの取得に失敗しました';
}

function isAbortError(caught: unknown): boolean {
  return caught instanceof DOMException && caught.name === 'AbortError';
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [detail, setDetail] = useState<Task | undefined>();
  const [detailLoading, setDetailLoading] = useState(() => window.location.pathname.startsWith('/tasks/'));
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);

  const loadTasks = useCallback(async () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const generation = ++requestGeneration.current;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks(
        {
          includeCompleted: showCompleted,
          sortBy: sortBy === 'priority' ? undefined : sortBy,
          tag: selectedTag,
        },
        controller.signal,
      );
      if (generation !== requestGeneration.current) {
        return;
      }
      setTasks(data);
    } catch (caught) {
      if (
        controller.signal.aborted ||
        generation !== requestGeneration.current ||
        isAbortError(caught)
      ) {
        return;
      }
      setError(
        caught instanceof TaskApiError
          ? caught.message
          : 'タスクの取得に失敗しました',
      );
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        activeController.current = null;
      }
    }
  }, [showCompleted, sortBy, selectedTag]);

  useEffect(() => {
    const handlePopState = () => {
      setDetail(undefined);
      setDetailError(null);
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (path !== '/') return;
    void loadTasks();
    return () => activeController.current?.abort();
  }, [loadTasks, path]);

  useEffect(() => {
    if (!path.startsWith(detailPathPrefix)) return;
    activeController.current?.abort();
    detailController.current?.abort();

    const id = parseTaskId(path);
    setDetail(undefined);
    if (id === null) {
      setDetailLoading(false);
      setDetailError('不正なタスクIDです');
      return;
    }

    const controller = new AbortController();
    detailController.current = controller;
    setDetailLoading(true);
    setDetailError(null);

    void fetchTask(id, controller.signal).then((task) => {
      if (!controller.signal.aborted) {
        setDetail(task);
      }
    }).catch((caught) => {
      if (!controller.signal.aborted && !isAbortError(caught)) {
        setDetailError(getTaskErrorMessage(caught));
      }
    }).finally(() => {
      if (!controller.signal.aborted) {
        setDetailLoading(false);
        detailController.current = null;
      }
    });

    return () => controller.abort();
  }, [path]);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setDetail(undefined);
    setDetailError(null);
    setPath(nextPath);
  };

  const handleSubmit = async (request: CreateTaskRequest) => {
    await createTask(request);
    await loadTasks();
  };

  const handleSave = async (request: UpdateTaskRequest) => {
    const urlPath = window.location.pathname;
    const id = urlPath.startsWith(detailPathPrefix) ? parseTaskId(urlPath) : null;
    if (id === null || detail?.id !== id) {
      throw new Error('保存対象のタスクがありません');
    }
    return updateTask(detail.id, request);
  };

  if (path.startsWith(detailPathPrefix)) {
    const id = parseTaskId(path);
    const matches = id !== null && detail?.id === id;
    return <TaskDetail key={path} task={matches ? detail : undefined} loading={detailLoading || (id !== null && !matches && !detailError)} error={detailError} onSave={handleSave} onBack={() => navigate('/')} />;
  }

  return (
    <div>
      <h1>TodoPi</h1>
      <StatusMessage loading={loading} error={error} />
      <TaskForm onSubmit={handleSubmit} />
      <TaskList
        tasks={tasks}
        showCompleted={showCompleted}
        sortBy={sortBy}
        selectedTag={selectedTag}
        onShowCompletedChange={setShowCompleted}
        onSortByChange={setSortBy}
        onTagChange={(tag) => setSelectedTag(tag === '' ? null : tag)}
        onSelectTask={(id) => navigate(`/tasks/${id}`)}
      />
    </div>
  );
}
