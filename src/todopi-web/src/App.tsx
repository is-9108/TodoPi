import { useCallback, useEffect, useState } from 'react';
import { createTask, fetchTasks, TaskApiError } from './api/taskApi';
import type { CreateTaskRequest, Task } from './types/task';
import StatusMessage from './components/StatusMessage';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (caught) {
      setError(
        caught instanceof TaskApiError
          ? caught.message
          : 'タスクの取得に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
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
      <TaskList tasks={tasks} />
    </div>
  );
}
