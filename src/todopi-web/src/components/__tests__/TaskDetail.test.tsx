import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TaskDetail from '../TaskDetail';
import { Priority, TaskStatus, type Task } from '../../types/task';

const task: Task = {
  id: 9, title: 'Task title', description: 'Task description', priority: Priority.High,
  dueDate: '2025-06-01', tags: 'work,urgent', status: TaskStatus.Incomplete,
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z',
};

describe('TaskDetail', () => {
  it('詳細の全項目を表示する', () => {
    const { container } = render(<TaskDetail task={task} onSave={vi.fn()} onBack={vi.fn()} />);
    const dl = container.querySelector('dl');
    expect(dl).toBeInTheDocument();
    for (const value of ['9', 'Task title', 'Task description', 'High', '2025-06-01', 'work,urgent', 'Incomplete', task.createdAt, task.updatedAt]) {
      expect(within(dl!).getByText(value)).toBeInTheDocument();
    }
  });

  it('edits six fields and submits them', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(task);
    render(<TaskDetail task={task} onSave={onSave} onBack={vi.fn()} />);
    await user.clear(screen.getByLabelText('タイトル'));
    await user.type(screen.getByLabelText('タイトル'), 'Changed title');
    await user.clear(screen.getByLabelText('説明'));
    await user.type(screen.getByLabelText('説明'), 'Changed description');
    await user.selectOptions(screen.getByLabelText('優先度'), 'Low');
    await user.clear(screen.getByLabelText('期限'));
    await user.type(screen.getByLabelText('期限'), '2025-07-02');
    await user.clear(screen.getByLabelText('タグ'));
    await user.type(screen.getByLabelText('タグ'), 'home');
    await user.selectOptions(screen.getByLabelText('状態'), 'Completed');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Changed title', description: 'Changed description', priority: 'Low',
      dueDate: '2025-07-02', tags: 'home', status: 'Completed',
    });
  });

  it('不正なタイトルは送信せずエラーを表示する', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<TaskDetail task={task} onSave={onSave} onBack={vi.fn()} />);
    await user.clear(screen.getByLabelText('タイトル'));
    await user.type(screen.getByLabelText('タイトル'), '   ');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('通信中と保存失敗を表示する', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TaskDetail loading onSave={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    let resolveSave!: (value: Task) => void;
    const onSave = vi.fn(() => new Promise<Task>((resolve) => { resolveSave = resolve; }));
    rerender(<TaskDetail task={task} onSave={onSave} onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('タイトル')).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    await act(async () => { resolveSave(task); });
    await waitFor(() => expect(screen.getByText(/保存しました/)).toBeInTheDocument());

    rerender(<TaskDetail task={task} error="読み込み失敗" onSave={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('読み込み失敗');
    const rejected = vi.fn().mockRejectedValue(new Error('保存失敗'));
    rerender(<TaskDetail task={task} onSave={rejected} onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失敗');
    expect(screen.queryByText(/保存しました/)).not.toBeInTheDocument();
  });

  it.each(['success', 'failure'] as const)('A→B→A後は古いA保存の%sを反映しない', async (outcome) => {
    const user = userEvent.setup();
    const anotherTask: Task = { ...task, id: 10, title: 'Another task' };
    let resolveSave!: (value: Task) => void;
    let rejectSave!: (reason: Error) => void;
    const onSave = vi.fn(() => new Promise<Task>((resolve, reject) => {
      resolveSave = resolve;
      rejectSave = reject;
    }));
    const { rerender, container } = render(<TaskDetail task={task} onSave={onSave} onBack={vi.fn()} />);

    await user.clear(screen.getByLabelText('タイトル'));
    await user.type(screen.getByLabelText('タイトル'), 'Saved old task');
    await user.click(screen.getByRole('button', { name: '保存' }));
    rerender(<TaskDetail task={anotherTask} onSave={onSave} onBack={vi.fn()} />);
    rerender(<TaskDetail task={task} onSave={onSave} onBack={vi.fn()} />);
    await user.clear(screen.getByLabelText('タイトル'));
    await user.type(screen.getByLabelText('タイトル'), 'Current A input');

    await act(async () => {
      if (outcome === 'success') resolveSave({ ...task, title: 'Saved old task' });
      else rejectSave(new Error('Old save failed'));
    });

    expect(screen.getByLabelText('タイトル')).toHaveValue('Current A input');
    expect(within(container.querySelector('dl')!).getByText('Task title')).toBeInTheDocument();
    expect(screen.queryByText('Saved old task')).not.toBeInTheDocument();
    expect(screen.queryByText('保存しました')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Bの保存中に古いA保存が完了してもBの保存状態を維持する', async () => {
    const user = userEvent.setup();
    const anotherTask: Task = { ...task, id: 10, title: 'Another task' };
    let resolveA!: (value: Task) => void;
    let resolveB!: (value: Task) => void;
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise<Task>((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise<Task>((resolve) => { resolveB = resolve; }));
    const { rerender } = render(<TaskDetail task={task} onSave={onSave} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '保存' }));
    rerender(<TaskDetail task={anotherTask} onSave={onSave} onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.getByText('保存中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();

    await act(async () => { resolveA({ ...task, title: 'Saved old task' }); });
    expect(screen.getByLabelText('タイトル')).toHaveValue('Another task');
    expect(screen.getByText('保存中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.queryByText('保存しました')).not.toBeInTheDocument();

    await act(async () => { resolveB(anotherTask); });
    expect(screen.queryByText('保存中...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled();
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('returns to the list', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TaskDetail task={task} onSave={vi.fn()} onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: /一覧へ戻る/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
