"use client";

import { useEffect } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Error boundary — catches the "Unable to process request due to missing
// initial state" error that occurs in in-app browsers (Messages, Instagram,
// etc.) where sessionStorage is restricted. Shows a friendly message telling
// the user to open the link in a real browser.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const isInitialStateError =
    error.message.includes("initial state") ||
    error.message.includes("sessionStorage");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <RefreshCw className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-xl font-bold tracking-tight">
        {isInitialStateError
          ? "Open in your browser"
          : "Something went wrong"}
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {isInitialStateError ? (
          <>
            This link was opened inside another app (like Messages or
            Instagram), which blocks some features. Tap the link below to
            open Quote Vault in your full browser.
          </>
        ) : (
          "An unexpected error occurred. Try refreshing the page."
        )}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button
          onClick={() => reset()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        {isInitialStateError && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              window.location.href = window.location.href;
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open in browser
          </Button>
        )}
      </div>
      <p className="mt-8 text-[11px] text-muted-foreground/50">
        Quote Vault v2.3.0
      </p>
    </div>
  );
}
