import { TopBar } from '@/components/TopBar';

import React from 'react';
import SidebarClient from '@/components/SidebarClient';

// NOTE: This is the (app) segment layout. It renders a sidebar and a top bar.
// Keep this as a Server Component; client components are fine as children.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <TopBar />
      {/* Global top-right bar (Connect + biomap badge) */}
      <aside className="w-full max-w-[320px] border-r bg-background">
        <SidebarClient initialChats={[]} initialContacts={[]} />
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}
