import type { Task } from '../types/task';

export function splitAndNormalizeTags(
  tags: string | null | undefined,
): string[] {
  if (tags == null) {
    return [];
  }

  return tags
    .split(',')
    .map((tag) => tag.trim().toLocaleLowerCase())
    .filter((tag) => tag !== '');
}

export function matchesTag(
  tags: string | null | undefined,
  selectedTag: string,
): boolean {
  if (selectedTag === '__none__') {
    return tags == null || tags.trim() === '';
  }

  const normalizedSelectedTag = selectedTag.trim().toLocaleLowerCase();
  if (normalizedSelectedTag === '') {
    return false;
  }

  return splitAndNormalizeTags(tags).includes(normalizedSelectedTag);
}

export function extractUniqueTags(tasks: Task[]): string[] {
  const tags = new Set<string>();

  for (const task of tasks) {
    for (const tag of splitAndNormalizeTags(task.tags)) {
      tags.add(tag);
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}
