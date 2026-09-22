import type { Task } from '../types/task';
import { extractUniqueTags } from '../utils/tags';

interface TaskControlsProps {
  showCompleted: boolean;
  sortBy: 'priority' | 'dueDate';
  selectedTag: string | null;
  tasks: Task[];
  onShowCompletedChange: (value: boolean) => void;
  onSortByChange: (value: 'priority' | 'dueDate') => void;
  onTagChange: (value: string) => void;
}

export default function TaskControls({
  showCompleted,
  sortBy,
  selectedTag,
  tasks,
  onShowCompletedChange,
  onSortByChange,
  onTagChange,
}: TaskControlsProps) {
  const uniqueTags = extractUniqueTags(tasks);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          data-testid="show-completed-toggle"
          checked={showCompleted}
          onChange={(event) => onShowCompletedChange(event.target.checked)}
        />
        完了タスクを表示
      </label>

      <label>
        並び順
        <select
          data-testid="sort-select"
          value={sortBy}
          onChange={(event) =>
            onSortByChange(event.target.value as 'priority' | 'dueDate')
          }
        >
          <option value="priority">優先度</option>
          <option value="dueDate">期限</option>
        </select>
      </label>

      <label>
        タグ
        <select
          data-testid="tag-select"
          value={selectedTag ?? ''}
          onChange={(event) => onTagChange(event.target.value)}
        >
          <option value="">すべて</option>
          <option value="__none__">タグなし</option>
          {uniqueTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
