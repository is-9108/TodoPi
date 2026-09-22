import { describe, expect, it } from 'vitest';
import { extractUniqueTags, matchesTag, splitAndNormalizeTags } from '../tags';
import { Priority, TaskStatus, type Task } from '../../types/task';

const task = (tags: string | null): Task => ({
  id: Math.random(),
  title: 'Task',
  description: null,
  priority: Priority.Medium,
  dueDate: null,
  tags,
  status: TaskStatus.Incomplete,
  createdAt: '',
  updatedAt: '',
});

describe('tag utilities', () => {
  it('splits, trims, lowercases, and removes empty tags', () => {
    expect(splitAndNormalizeTags('  Work  ,, URGENT , ')).toEqual(['work', 'urgent']);
    expect(splitAndNormalizeTags(null)).toEqual([]);
  });

  it('matches exact tags and supports the untagged value', () => {
    expect(matchesTag('  Work  , urgent ', ' work ')).toBe(true);
    expect(matchesTag('homework', 'home')).toBe(false);
    expect(matchesTag('', '__none__')).toBe(true);
    expect(matchesTag(null, '__none__')).toBe(true);
  });

  it('extracts unique sorted tags', () => {
    expect(extractUniqueTags([task('Work,home'), task('work, urgent')])).toEqual([
      'home',
      'urgent',
      'work',
    ]);
  });
});
