import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

import { ChatButton } from '@/components/chat/chat-button';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InferaLytics | Advanced Mathematical Infrastructure',
  description: 'Hierarchical structural adjustment and seasonal forecasting optimization platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#004E64',
          colorText: '#004E64',
          colorBackground: '#ffffff',
          colorInputBackground: '#f1f5f9',
          borderRadius: '0.75rem',
        }
      }}
    >
      <html lang="en">
        <body className={cn(
          inter.className,
          "bg-[#E0E5E9] text-[#004E64] min-h-screen selection:bg-[#004E64] selection:text-white"
        )}>
          {children}
          <ChatButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
