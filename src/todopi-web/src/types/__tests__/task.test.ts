import { describe, expect, it } from 'vitest';
import { Priority, TaskStatus, type Task } from '../task';

describe('Priority', () => {
  it('contains exactly the three priority values', () => {
    expect(Priority.High).toBe('High');
    expect(Priority.Medium).toBe('Medium');
    expect(Priority.Low).toBe('Low');
    expect(Object.values(Priority)).toHaveLength(3);
  });
});

describe('TaskStatus', () => {
  it('contains exactly the two status values', () => {
    expect(TaskStatus.Incomplete).toBe('Incomplete');
    expect(TaskStatus.Completed).toBe('Completed');
    expect(Object.values(TaskStatus)).toHaveLength(2);
  });
});

describe('Task type', () => {
  it('is structurally compatible with the TaskResponse JSON schema', () => {
    const taskResponseJson = {
      id: 1,
      title: 'Implement frontend',
      description: null,
      priority: 'High',
      dueDate: '2025-12-31',
      tags: null,
      status: 'Incomplete',
      createdAt: '2025-01-01T09:00:00Z',
      updatedAt: '2025-01-02T10:30:00Z',
    } satisfies Task;

    expect(taskResponseJson).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      description: null,
      priority: expect.any(String),
      dueDate: expect.any(String),
      tags: null,
      status: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
