"use client";

import { useState } from "react";
import { LogOut, Cloud, CloudOff, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { isFirebaseConfigured } from "@/lib/firebase";

export function UserMenu() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  // Firebase not configured at all → local-only mode badge.
  if (!isFirebaseConfigured) {
    return (
      <span className="hidden items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex">
        <CloudOff className="h-3 w-3" />
        Local
      </span>
    );
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Signed out → show a Sign in button.
  if (!user) {
    const onSignIn = async () => {
      setBusy(true);
      try {
        await signInWithGoogle();
        toast.success("Signed in — syncing to cloud");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign-in failed";
        toast.error(
          msg.includes("popup")
            ? "Sign-in popup was blocked or closed. Make sure this domain is in Firebase Authorized domains."
            : msg
        );
      } finally {
        setBusy(false);
      }
    };
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={onSignIn}
        disabled={busy}
        aria-label="Sign in with Google"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Cloud className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  // Signed in → avatar + dropdown.
  const initial = (user.displayName || user.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  const name = user.displayName || user.email?.split("@")[0] || "You";

  const onSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out — switched to local mode");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-out failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border bg-card p-0.5 pl-0.5 pr-2 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {initial}
            </span>
          )}
          <span className="hidden max-w-[80px] truncate text-xs font-medium sm:block">
            {name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <Cloud className="h-3.5 w-3.5 text-primary" />
          Synced to cloud
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{name}</p>
          {user.email && (
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
