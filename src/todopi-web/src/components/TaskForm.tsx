import { useState, type FormEvent } from 'react';
import { Priority, type CreateTaskRequest } from '../types/task';

interface TaskFormProps {
  onSubmit: (request: CreateTaskRequest) => Promise<void>;
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>(Priority.Medium);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    setError(null);

    const request: CreateTaskRequest = {
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(priority ? { priority } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(tags.trim() ? { tags: tags.trim() } : {}),
    };

    await onSubmit(request);

    setTitle('');
    setDescription('');
    setPriority(Priority.Medium);
    setDueDate('');
    setTags('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}
      <div>
        <label htmlFor="task-title">タイトル</label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="task-description">説明</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="task-priority">優先度</label>
        <select
          id="task-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          <option value={Priority.High}>High</option>
          <option value={Priority.Medium}>Medium</option>
          <option value={Priority.Low}>Low</option>
        </select>
      </div>
      <div>
        <label htmlFor="task-due-date">期限</label>
        <input
          id="task-due-date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="task-tags">タグ</label>
        <input
          id="task-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </div>
      <button type="submit">追加</button>
    </form>
  );
}
