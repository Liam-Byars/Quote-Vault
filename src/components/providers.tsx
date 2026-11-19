"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { CloudSyncProvider } from "@/lib/cloud-sync";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// Remounts the cloud sync (and resets all its state) whenever the signed-in
// user changes.
function CloudSyncKeyed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <CloudSyncProvider key={user?.uid ?? "anon"}>{children}</CloudSyncProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <CloudSyncKeyed>
          <QueryProvider>{children}</QueryProvider>
        </CloudSyncKeyed>
      </AuthProvider>
    </ThemeProvider>
  );
}
