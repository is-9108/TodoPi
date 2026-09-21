import { TaskStatus, type Task } from '../types/task';

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  const incompleteTasks = tasks.filter(
    (task) => task.status === TaskStatus.Incomplete,
  );

  if (incompleteTasks.length === 0) {
    return <p>タスクがありません</p>;
  }

  return (
    <ul>
      {incompleteTasks.map((task) => (
        <li key={task.id}>
          <span>{task.title}</span>
          <span>{task.priority}</span>
          {task.dueDate != null && (
            <span data-testid="task-dueDate">{task.dueDate}</span>
          )}
          {task.tags != null && (
            <span data-testid="task-tags">{task.tags}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
