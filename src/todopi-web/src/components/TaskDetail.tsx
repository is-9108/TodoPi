import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Priority, TaskStatus, type Task, type UpdateTaskRequest, type Priority as PriorityValue, type TaskStatus as TaskStatusValue } from '../types/task';

interface TaskDetailProps {
  task?: Task;
  loading?: boolean;
  error?: string | null;
  onSave: (request: UpdateTaskRequest) => Promise<Task>;
  onBack: () => void;
}

export default function TaskDetail({ task, loading = false, error, onSave, onBack }: TaskDetailProps) {
  const [current, setCurrent] = useState<Task | undefined>(task);
  const saveGenerationRef = useRef(0);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<PriorityValue>(task?.priority ?? Priority.Medium);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [tags, setTags] = useState(task?.tags ?? '');
  const [status, setStatus] = useState<TaskStatusValue>(task?.status ?? TaskStatus.Incomplete);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    ++saveGenerationRef.current;
    setCurrent(task);
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setPriority(task?.priority ?? Priority.Medium);
    setDueDate(task?.dueDate ?? '');
    setTags(task?.tags ?? '');
    setStatus(task?.status ?? TaskStatus.Incomplete);
    savingRef.current = false;
    setSaving(false);
    setSaveError(null);
    setSaved(false);
  }, [task]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    if (!title.trim()) {
      setSaveError('タイトルを入力してください');
      setSaved(false);
      return;
    }
    const generation = ++saveGenerationRef.current;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await onSave({
        title: title.trim(), description: description.trim(), priority,
        dueDate: dueDate || null, tags: tags.trim(), status,
      });
      if (generation !== saveGenerationRef.current) {
        return;
      }
      setCurrent(updated);
      setTitle(updated.title);
      setDescription(updated.description ?? '');
      setPriority(updated.priority);
      setDueDate(updated.dueDate ?? '');
      setTags(updated.tags ?? '');
      setStatus(updated.status);
      setSaved(true);
    } catch (caught) {
      if (generation === saveGenerationRef.current) {
        setSaveError(caught instanceof Error ? caught.message : '保存に失敗しました');
      }
    } finally {
      if (generation === saveGenerationRef.current) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  };

  return (
    <div>
      <button type="button" onClick={onBack}>一覧へ戻る</button>
      {loading && <p role="status">読み込み中...</p>}
      {error && <p role="alert">{error}</p>}
      {current && !loading && (
        <>
          <dl>
            <dt>ID</dt><dd>{current.id}</dd>
            <dt>タイトル</dt><dd>{current.title}</dd>
            <dt>説明</dt><dd>{current.description}</dd>
            <dt>優先度</dt><dd>{current.priority}</dd>
            <dt>期限</dt><dd>{current.dueDate}</dd>
            <dt>タグ</dt><dd>{current.tags}</dd>
            <dt>状態</dt><dd>{current.status}</dd>
            <dt>作成日時</dt><dd>{current.createdAt}</dd>
            <dt>更新日時</dt><dd>{current.updatedAt}</dd>
          </dl>
          <form onSubmit={handleSave}>
            <label htmlFor="detail-title">タイトル</label>
            <input id="detail-title" value={title} disabled={saving} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="detail-description">説明</label>
            <textarea id="detail-description" value={description} disabled={saving} onChange={(event) => setDescription(event.target.value)} />
            <label htmlFor="detail-priority">優先度</label>
            <select id="detail-priority" value={priority} disabled={saving} onChange={(event) => setPriority(event.target.value as PriorityValue)}>
              <option value={Priority.High}>高 (High)</option>
              <option value={Priority.Medium}>中 (Medium)</option>
              <option value={Priority.Low}>低 (Low)</option>
            </select>
            <label htmlFor="detail-due-date">期限</label>
            <input id="detail-due-date" type="date" value={dueDate} disabled={saving} onChange={(event) => setDueDate(event.target.value)} />
            <label htmlFor="detail-tags">タグ</label>
            <input id="detail-tags" value={tags} disabled={saving} onChange={(event) => setTags(event.target.value)} />
            <label htmlFor="detail-status">状態</label>
            <select id="detail-status" value={status} disabled={saving} onChange={(event) => setStatus(event.target.value as TaskStatusValue)}>
              <option value={TaskStatus.Incomplete}>未完了</option>
              <option value={TaskStatus.Completed}>完了</option>
            </select>
            <button type="submit" disabled={saving}>保存</button>
          </form>
          {saving && <p role="status">保存中...</p>}
          {saved && <p role="status">保存しました</p>}
          {saveError && <p role="alert">{saveError}</p>}
        </>
      )}
    </div>
  );
}
