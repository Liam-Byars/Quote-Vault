"use client";

import { useState } from "react";
import { Loader2, UserPlus, Mail, Check } from "lucide-react";
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
import { useAddMember } from "@/hooks/use-groups";
import { inviteUrl } from "@/lib/group-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  inviteCode: string;
  groupName: string;
};

export function AddMemberDialog({
  open,
  onOpenChange,
  groupId,
  inviteCode,
  groupName,
}: Props) {
  const addMember = useAddMember();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // After adding a member with an email, show the "send invite" step.
  const [addedEmail, setAddedEmail] = useState<string | null>(null);
  const [addedName, setAddedName] = useState("");

  const valid = name.trim().length > 0;

  const submit = async () => {
    if (!valid) {
      toast.error("Add a name for the member.");
      return;
    }
    try {
      await addMember.mutateAsync({
        groupId,
        input: { name: name.trim(), email: email.trim() || null },
      });
      toast.success("Member added");
      if (email.trim()) {
        // Show the email invite step instead of closing.
        setAddedName(name.trim());
        setAddedEmail(email.trim());
      } else {
        // No email — just close.
        reset();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  };

  const reset = () => {
    setName("");
    setEmail("");
    setAddedEmail(null);
    setAddedName("");
    onOpenChange(false);
  };

  const sendInviteEmail = () => {
    if (!addedEmail) return;
    const url = inviteUrl(inviteCode);
    const subject = `You're invited to join "${groupName}" on Quote Vault`;
    const body = [
      `Hi ${addedName},`,
      "",
      `You're invited to join "${groupName}" on Quote Vault — a place to save and share the funny things people say.`,
      "",
      `Click here to join:`,
      url,
      "",
      "Once you open the link, sign in with Google and enter your name to join the group.",
      "",
      "— Quote Vault",
    ].join("\n");

    const mailto = `mailto:${encodeURIComponent(
      addedEmail
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {addedEmail ? "Invite sent?" : "Add a member"}
          </DialogTitle>
          <DialogDescription>
            {addedEmail
              ? `An invite link is ready for ${addedName}. Click below to open your email app.`
              : "Add someone to this group by name. If you include their email, you can send them an invite link."}
          </DialogDescription>
        </DialogHeader>

        {addedEmail ? (
          // ── Post-add: email invite step ──
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-secondary/30 p-3 text-sm">
              <p className="font-medium">{addedName}</p>
              <p className="text-xs text-muted-foreground">{addedEmail}</p>
            </div>
            <Button onClick={sendInviteEmail} className="w-full gap-2">
              <Mail className="h-4 w-4" />
              Send invite email
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Opens your email app with a pre-filled message and the join link.
            </p>
          </div>
        ) : (
          // ── Normal: add member form ──
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-name"
                placeholder="e.g. Taylor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email (optional)</Label>
              <Input
                id="m-email"
                type="email"
                placeholder="taylor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Include their email to send them an invite link
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {addedEmail ? (
            <>
              <Button variant="outline" onClick={reset} className="gap-2">
                <Check className="h-4 w-4" />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={addMember.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={!valid || addMember.isPending}
              >
                {addMember.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add member
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
