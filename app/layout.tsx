import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import CreatorBadge from '@/components/ui/creator-badge';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CricScore',
  description: 'Live Cricket Score Logger',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <CreatorBadge/>
      </body>
    </html>
  );
}
