import { useCallback, useEffect, useRef, useState } from 'react';
import { createTask, fetchTasks, TaskApiError } from './api/taskApi';
import type { CreateTaskRequest, Task } from './types/task';
import StatusMessage from './components/StatusMessage';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const activeController = useRef<AbortController | null>(null);

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
        (caught instanceof DOMException && caught.name === 'AbortError')
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
    void loadTasks();
    return () => activeController.current?.abort();
  }, [loadTasks]);

  const handleSubmit = async (request: CreateTaskRequest) => {
    await createTask(request);
    await loadTasks();
  };

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
      />
    </div>
  );
}
