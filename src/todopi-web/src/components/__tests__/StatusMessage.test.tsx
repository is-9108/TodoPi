import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusMessage from '../StatusMessage';

describe('StatusMessage', () => {
  it('shows a loading indicator when loading is true', () => {
    render(<StatusMessage loading error={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('読み込み中');
  });

  it('shows the error message when error is provided', () => {
    render(<StatusMessage loading={false} error="タスクの取得に失敗しました" />);

    expect(screen.getByRole('alert')).toHaveTextContent('タスクの取得に失敗しました');
  });

  it('renders nothing when not loading and no error', () => {
    const { container } = render(<StatusMessage loading={false} error={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
