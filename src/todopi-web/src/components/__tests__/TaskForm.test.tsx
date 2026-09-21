import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TaskForm from '../TaskForm';
import type { CreateTaskRequest } from '../../types/task';

describe('TaskForm', () => {
  it('renders the title, description, priority, dueDate, and tags fields', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
    expect(screen.getByLabelText('説明')).toBeInTheDocument();
    expect(screen.getByLabelText('優先度')).toBeInTheDocument();
    expect(screen.getByLabelText('期限')).toBeInTheDocument();
    expect(screen.getByLabelText('タグ')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when title is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('タイトルを入力してください')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the entered data when title is provided', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('タイトル'), '牛乳を買う');
    await user.type(screen.getByLabelText('説明'), '低脂肪乳');
    await user.selectOptions(screen.getByLabelText('優先度'), 'High');
    fireEvent.change(screen.getByLabelText('期限'), { target: { value: '2025-12-31' } });
    await user.type(screen.getByLabelText('タグ'), '買い物,日用品');
    await user.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '牛乳を買う',
      description: '低脂肪乳',
      priority: 'High',
      dueDate: '2025-12-31',
      tags: '買い物,日用品',
    } satisfies CreateTaskRequest);
  });

  it('offers the High, Medium, and Low priority options', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    const select = screen.getByLabelText('優先度');
    expect(select).toContainElement(screen.getByRole('option', { name: 'High' }));
    expect(select).toContainElement(screen.getByRole('option', { name: 'Medium' }));
    expect(select).toContainElement(screen.getByRole('option', { name: 'Low' }));
  });

  it('resets the form after a successful submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('タイトル'), 'Task to reset');
    await user.type(screen.getByLabelText('説明'), 'description');
    await user.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByLabelText('タイトル') as HTMLInputElement).value).toBe(''));
    expect((screen.getByLabelText('説明') as HTMLTextAreaElement).value).toBe('');
  });
});
