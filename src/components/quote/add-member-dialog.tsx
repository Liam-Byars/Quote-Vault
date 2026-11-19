"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
};

export function AddMemberDialog({ open, onOpenChange, groupId }: Props) {
  const addMember = useAddMember();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

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
      setName("");
      setEmail("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Add a member
          </DialogTitle>
          <DialogDescription>
            Add someone to this group. (Once Firebase auth is on, you'll be
            able to invite real users by email.)
          </DialogDescription>
        </DialogHeader>

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
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || addMember.isPending}>
            {addMember.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
