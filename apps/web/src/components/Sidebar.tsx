// apps/web/src/components/Sidebar.tsx
import React from 'react';
import SidebarClient from './SidebarClient';

// Keep server wrapper simple; SWR in SidebarClient will fetch data.
// If you want server-prefetch later, we can reintroduce it safely.
export default function Sidebar() {
  return (
    <aside className="w-full max-w-[320px] border-r bg-background">
      <SidebarClient initialChats={[]} initialContacts={[]} />
    </aside>
  );
}

// Ensure this file is treated as a module in all TS modes.
export {};
