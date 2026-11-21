"use client";

import { useState } from "react";
import { Loader2, LogIn, Cloud } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinGroup } from "@/hooks/use-groups";
import { useAuth } from "@/hooks/use-auth";
import { describeCloudError } from "@/lib/cloud-errors";

type Props = {
  open: boolean;
  /** Pre-filled invite code (e.g. from a ?join= URL). Empty = manual entry. */
  inviteCode?: string;
  onOpenChange: (open: boolean) => void;
  onJoined?: (groupId: string) => void;
};

export function JoinGroupDialog({
  open,
  inviteCode = "",
  onOpenChange,
  onJoined,
}: Props) {
  const join = useJoinGroup();
  const { user, loading, signInWithGoogle } = useAuth();
  const [code, setCode] = useState(inviteCode);
  const [name, setName] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Keep the code field in sync when the dialog is opened with a prefilled code.
  // (Keyed remount at the page level handles the common case; this is a safety net.)
  const effectiveCode = inviteCode || code;

  const valid = effectiveCode.trim().length > 0 && name.trim().length > 0;

  const submit = async () => {
    if (!valid) {
      toast.error("Add the invite code and your name.");
      return;
    }
    try {
      const res = await join.mutateAsync({
        inviteCode: effectiveCode.trim(),
        name: name.trim(),
      });
      if (res.alreadyMember) {
        toast.success("You're already in this group");
      } else {
        toast.success(`Joined ${res.group.name}`);
      }
      setCode("");
      setName("");
      onOpenChange(false);
      onJoined?.(res.group.id);
    } catch (e) {
      toast.error(describeCloudError(e), { duration: 8000 });
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in — now enter your name to join");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-primary" />
            Join a group
          </DialogTitle>
          <DialogDescription>
            {inviteCode
              ? "You scanned an invite. Enter your name to join."
              : "Paste the invite code from the person who shared it with you."}
          </DialogDescription>
        </DialogHeader>

        {/* If not signed in, prompt sign-in first */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              You need to sign in with Google to join a group. This is so
              your membership is saved and synced across your devices.
            </p>
            <Button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full gap-2"
            >
              {signingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              Sign in with Google
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {!inviteCode && (
              <div className="space-y-1.5">
                <Label htmlFor="j-code">
                  Invite code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="j-code"
                  placeholder="Paste invite code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="j-name">
                Your name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="j-name"
                placeholder="e.g. Jordan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={!!inviteCode}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={join.isPending}
          >
            Cancel
          </Button>
          {user && (
            <Button onClick={submit} disabled={!valid || join.isPending}>
              {join.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Join group
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
