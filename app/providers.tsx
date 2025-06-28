'use client';

import { PropsWithChildren } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import AuthProvider from '@/components/providers/auth-provider';
import { Toaster } from 'sonner';

// Create a client
const queryClient = new QueryClient();

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

export function TanStackProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <TanStackProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TanStackProvider>
      </ThemeProvider>
    </AuthProvider>
  );
} 