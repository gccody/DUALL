import CenteredMessage from '@/components/ui/CenteredMessage';

/** @deprecated Use `<CenteredMessage title="Error" message={...} />`. Kept until the home screen migrates. */
export default function ErrorView({ message }: { message: string }) {
  return <CenteredMessage title="Error" message={message} />;
}
