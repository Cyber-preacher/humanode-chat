// apps/web/src/app/(app)/layout.tsx
import React from 'react';
import SidebarClient from '@/components/SidebarClient';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-full max-w-[320px] border-r bg-background">
        <SidebarClient initialChats={[]} initialContacts={[]} />
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
