import { TaskStatus, type Task } from '../types/task';
import TaskControls from './TaskControls';
import { matchesTag } from '../utils/tags';

interface TaskListProps {
  tasks: Task[];
  showCompleted?: boolean;
  sortBy?: 'priority' | 'dueDate';
  selectedTag?: string | null;
  onShowCompletedChange: (value: boolean) => void;
  onSortByChange: (value: 'priority' | 'dueDate') => void;
  onTagChange: (value: string) => void;
  onSelectTask: (id: number) => void;
}

export default function TaskList({
  tasks,
  showCompleted = false,
  sortBy = 'priority',
  selectedTag = null,
  onShowCompletedChange,
  onSortByChange,
  onTagChange,
  onSelectTask,
}: TaskListProps) {
  let visibleTasks = showCompleted
    ? tasks
    : tasks.filter((task) => task.status === TaskStatus.Incomplete);

  if (selectedTag != null) {
    visibleTasks = visibleTasks.filter((task) => matchesTag(task.tags, selectedTag));
  }

  return (
    <div>
      <TaskControls
        showCompleted={showCompleted}
        sortBy={sortBy}
        selectedTag={selectedTag}
        tasks={tasks}
        onShowCompletedChange={onShowCompletedChange}
        onSortByChange={onSortByChange}
        onTagChange={onTagChange}
      />

      {tasks.length === 0 ? (
        <p>タスクがありません</p>
      ) : visibleTasks.length === 0 ? (
        <p>該当するタスクがありません</p>
      ) : (
        <ul>
          {visibleTasks.map((task) => (
            <li
              key={task.id}
              className={
                task.status === TaskStatus.Completed ? 'completed' : undefined
              }
              style={
                task.status === TaskStatus.Completed
                  ? { opacity: 0.6, textDecoration: 'line-through' }
                  : undefined
              }
              data-testid={
                task.status === TaskStatus.Completed
                  ? 'task-completed'
                  : undefined
              }
            >
              <button type="button" onClick={() => onSelectTask(task.id)}>{task.title}</button>
              <span>{task.priority}</span>
              <span data-testid="task-dueDate">
                {task.dueDate ?? '期限なし'}
              </span>
              {task.tags != null && (
                <span data-testid="task-tags">{task.tags}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
