"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { FirebaseAnalytics } from "@/components/analytics/firebase-analytics";
import { ToastViewport } from "@/components/common/toast-viewport";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <FirebaseAnalytics />
        <ToastViewport />
        <PwaRegister />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
