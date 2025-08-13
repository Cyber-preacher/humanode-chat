import ChatView from '@/components/ChatView';

/**
 * Next 15 typedRoutes sometimes wraps `params` in a Promise for type-checks.
 * Accept Promise<{ id: string }> and await it to satisfy the checker.
 */
export default async function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  // We don't need the id yet, but awaiting keeps typedRoutes happy
  await params;
  return <ChatView />;
}
