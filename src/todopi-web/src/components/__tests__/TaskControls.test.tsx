import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TaskControls from '../TaskControls';
import { Priority, TaskStatus, type Task } from '../../types/task';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Task',
  description: null,
  priority: Priority.High,
  dueDate: null,
  tags: null,
  status: TaskStatus.Incomplete,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const baseProps = {
  showCompleted: false,
  sortBy: 'priority' as const,
  selectedTag: null as string | null,
  tasks: [] as Task[],
  onShowCompletedChange: vi.fn(),
  onSortByChange: vi.fn(),
  onTagChange: vi.fn(),
};

describe('TaskControls', () => {
  it('renders showCompleted toggle', () => {
    render(<TaskControls {...baseProps} />);
    expect(screen.getByTestId('show-completed-toggle')).toHaveAttribute('type', 'checkbox');
  });

  it('renders sort selector options', () => {
    render(<TaskControls {...baseProps} />);
    const select = screen.getByTestId('sort-select');
    expect(select).toContainElement(screen.getByRole('option', { name: '優先度' }));
    expect(select).toContainElement(screen.getByRole('option', { name: '期限' }));
  });

  it('renders normalized unique tags from tasks', () => {
    const tasks = [
      makeTask({ id: 1, tags: 'Work,home' }),
      makeTask({ id: 2, tags: 'work' }),
      makeTask({ id: 3, tags: 'urgent, WORK' }),
    ];
    render(<TaskControls {...baseProps} tasks={tasks} />);

    const select = screen.getByTestId('tag-select');
    expect(select).toContainElement(screen.getByRole('option', { name: 'work' }));
    expect(select).toContainElement(screen.getByRole('option', { name: 'home' }));
    expect(select).toContainElement(screen.getByRole('option', { name: 'urgent' }));
    expect(screen.getAllByRole('option', { name: 'work' })).toHaveLength(1);
  });

  it('renders __none__ option', () => {
    render(<TaskControls {...baseProps} />);
    expect(screen.getByRole('option', { name: 'タグなし' })).toBeInTheDocument();
  });

  it('calls onShowCompletedChange when toggled', async () => {
    const onShowCompletedChange = vi.fn();
    const user = userEvent.setup();
    render(<TaskControls {...baseProps} onShowCompletedChange={onShowCompletedChange} />);
    await user.click(screen.getByTestId('show-completed-toggle'));
    expect(onShowCompletedChange).toHaveBeenCalledWith(true);
  });

  it('calls onSortByChange when selected', async () => {
    const onSortByChange = vi.fn();
    const user = userEvent.setup();
    render(<TaskControls {...baseProps} onSortByChange={onSortByChange} />);
    await user.selectOptions(screen.getByTestId('sort-select'), 'dueDate');
    expect(onSortByChange).toHaveBeenCalledWith('dueDate');
  });

  it('calls onTagChange when selected', async () => {
    const onTagChange = vi.fn();
    const user = userEvent.setup();
    render(<TaskControls {...baseProps} tasks={[makeTask({ tags: 'work' })]} onTagChange={onTagChange} />);
    await user.selectOptions(screen.getByTestId('tag-select'), 'work');
    expect(onTagChange).toHaveBeenCalledWith('work');
  });
});
