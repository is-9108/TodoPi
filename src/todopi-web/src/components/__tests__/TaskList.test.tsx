import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TaskList from '../TaskList';
import { Priority, TaskStatus, type Task } from '../../types/task';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: '買い物',
  description: null,
  priority: Priority.High,
  dueDate: null,
  tags: null,
  status: TaskStatus.Incomplete,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('TaskList', () => {
  it('renders each task title, priority, dueDate, and tags', () => {
    const task = makeTask({
      title: '買い物',
      priority: Priority.High,
      dueDate: '2025-12-31',
      tags: 'work,urgent',
    });
    render(<TaskList tasks={[task]} />);

    expect(screen.getByText('買い物')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('2025-12-31')).toBeInTheDocument();
    expect(screen.getByText('work,urgent')).toBeInTheDocument();
  });

  it('shows only Incomplete tasks and excludes Completed tasks', () => {
    const incomplete = makeTask({ id: 1, title: '未完了タスク', status: TaskStatus.Incomplete });
    const completed = makeTask({ id: 2, title: '完了タスク', status: TaskStatus.Completed });
    render(<TaskList tasks={[incomplete, completed]} />);

    expect(screen.getByText('未完了タスク')).toBeInTheDocument();
    expect(screen.queryByText('完了タスク')).not.toBeInTheDocument();
  });

  it('shows the empty message when there are no tasks', () => {
    render(<TaskList tasks={[]} />);

    expect(screen.getByText('タスクがありません')).toBeInTheDocument();
  });

  it('does not render the tags area when tags is null', () => {
    const task = makeTask({ tags: null, dueDate: '2025-12-31' });
    render(<TaskList tasks={[task]} />);

    expect(screen.queryByTestId('task-tags')).not.toBeInTheDocument();
    expect(screen.getByTestId('task-dueDate')).toBeInTheDocument();
  });

  it('does not render the dueDate area when dueDate is null', () => {
    const task = makeTask({ dueDate: null, tags: 'work' });
    render(<TaskList tasks={[task]} />);

    expect(screen.queryByTestId('task-dueDate')).not.toBeInTheDocument();
    expect(screen.getByTestId('task-tags')).toBeInTheDocument();
  });
});
