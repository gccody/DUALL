import CenteredMessage from '@/components/ui/CenteredMessage';

/** @deprecated Use `<CenteredMessage spinner message="Loading..." />`. Kept until the home screen migrates. */
export default function LoadingView() {
  return <CenteredMessage spinner message="Loading..." />;
}
