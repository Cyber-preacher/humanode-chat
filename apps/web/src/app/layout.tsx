import { TopBar } from '@/components/TopBar';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers'; // <- direct import (Providers has "use client")

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Humanode Chat',
  description: 'Sybil-resistant chat app powered by Humanode & Biomapper',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {' '}
          <TopBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
