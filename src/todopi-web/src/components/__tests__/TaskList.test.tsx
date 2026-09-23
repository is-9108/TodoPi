import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

type RenderProps = Omit<
  ComponentProps<typeof TaskList>,
  'onShowCompletedChange' | 'onSortByChange' | 'onTagChange' | 'onSelectTask'
> & Partial<Pick<ComponentProps<typeof TaskList>, 'onSelectTask'>>;

const renderTaskList = (props: RenderProps) =>
  render(
    <TaskList
      {...props}
      onShowCompletedChange={vi.fn()}
      onSortByChange={vi.fn()}
      onTagChange={vi.fn()}
      onSelectTask={props.onSelectTask ?? vi.fn()}
    />,
  );

describe('TaskList', () => {
  it('renders each task title, priority, dueDate, and tags', () => {
    const task = makeTask({ dueDate: '2025-12-31', tags: 'work,urgent' });
    renderTaskList({ tasks: [task] });

    expect(screen.getByText('買い物')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('2025-12-31')).toBeInTheDocument();
    expect(screen.getByText('work,urgent')).toBeInTheDocument();
  });

  it('shows the 期限なし placeholder when dueDate is null', () => {
    renderTaskList({ tasks: [makeTask({ dueDate: null })] });
    expect(screen.getByTestId('task-dueDate')).toHaveTextContent('期限なし');
  });

  it('hides completed tasks when showCompleted is false', () => {
    const incomplete = makeTask({ id: 1, title: '未完了タスク' });
    const completed = makeTask({ id: 2, title: '完了タスク', status: TaskStatus.Completed });
    renderTaskList({ tasks: [incomplete, completed], showCompleted: false });

    expect(screen.getByText('未完了タスク')).toBeInTheDocument();
    expect(screen.queryByText('完了タスク')).not.toBeInTheDocument();
  });

  it('shows the empty message when there are no tasks', () => {
    renderTaskList({ tasks: [] });
    expect(screen.getByText('タスクがありません')).toBeInTheDocument();
  });

  it('shows filtered empty message when visible tasks are empty', () => {
    const completed = makeTask({ status: TaskStatus.Completed });
    renderTaskList({ tasks: [completed], showCompleted: false });
    expect(screen.getByText('該当するタスクがありません')).toBeInTheDocument();
  });

  it('shows completed tasks with visual distinction when showCompleted is true', () => {
    const completed = makeTask({ id: 2, title: '完了タスク', status: TaskStatus.Completed });
    renderTaskList({ tasks: [completed], showCompleted: true });

    const item = screen.getByTestId('task-completed');
    expect(screen.getByText('完了タスク')).toBeInTheDocument();
    expect(item).toHaveClass('completed');
  });

  it('preserves the API-returned order', () => {
    const tasks = [
      makeTask({ id: 1, title: 'Low task', priority: Priority.Low }),
      makeTask({ id: 2, title: 'High task', priority: Priority.High }),
    ];
    renderTaskList({ tasks });

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Low task')).toBeInTheDocument();
    expect(within(items[1]).getByText('High task')).toBeInTheDocument();
  });

  it('filters tags with trim, case-insensitive, exact matching', () => {
    const tasks = [
      makeTask({ id: 1, title: 'Work task', tags: '  Work  , urgent ' }),
      makeTask({ id: 2, title: 'Homework', tags: 'homework' }),
    ];
    renderTaskList({ tasks, selectedTag: 'work' });

    expect(screen.getByText('Work task')).toBeInTheDocument();
    expect(screen.queryByText('Homework')).not.toBeInTheDocument();
  });

  it('filters tasks by __none__ tag', () => {
    const tasks = [
      makeTask({ id: 1, title: 'Untagged', tags: null }),
      makeTask({ id: 2, title: 'Empty', tags: '' }),
      makeTask({ id: 3, title: 'Tagged', tags: 'work' }),
    ];
    renderTaskList({ tasks, selectedTag: '__none__' });

    expect(screen.getByText('Untagged')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.queryByText('Tagged')).not.toBeInTheDocument();
  });

  it('shows filtered empty message when selected tag has no match', () => {
    renderTaskList({ tasks: [makeTask({ tags: 'home' })], selectedTag: 'work' });
    expect(screen.getByText('該当するタスクがありません')).toBeInTheDocument();
  });

  it('selects a task by id', async () => {
    const onSelectTask = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <TaskList
        tasks={[makeTask({ id: 42, title: '選択するタスク' })]}
        onSelectTask={onSelectTask}
        onShowCompletedChange={vi.fn()}
        onSortByChange={vi.fn()}
        onTagChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText('選択するタスク'));

    expect(onSelectTask).toHaveBeenCalledWith(42);
  });

  it('renders TaskControls with filter/sort options', () => {
    renderTaskList({ tasks: [makeTask({ tags: 'work' })] });
    expect(screen.getByTestId('show-completed-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    expect(screen.getByTestId('tag-select')).toBeInTheDocument();
  });
});
