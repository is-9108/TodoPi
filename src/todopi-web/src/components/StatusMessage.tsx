interface StatusMessageProps {
  loading: boolean;
  error: string | null;
}

export default function StatusMessage({ loading, error }: StatusMessageProps) {
  if (loading) {
    return <div role="status">読み込み中</div>;
  }

  if (error) {
    return <div role="alert">{error}</div>;
  }

  return null;
}
