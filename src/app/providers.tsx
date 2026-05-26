"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Client-side providers wrapper.
 *
 * Creates a stable QueryClient per session and provides it to the
 * entire component tree. Placed in a separate file so the root
 * layout.tsx can remain a Server Component.
 *
 * Add any future client-only providers (e.g. ThemeProvider) here.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data in Dig doesn't change frequently; a 5-minute stale
            // window avoids redundant re-fetches during a session.
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}