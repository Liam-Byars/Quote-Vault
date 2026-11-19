"use client";

import { useState } from "react";
import { Loader2, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateGroup } from "@/hooks/use-groups";
import { describeCloudError } from "@/lib/cloud-errors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (groupId: string) => void;
};

export function CreateGroupDialog({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");

  const valid = name.trim().length > 0;

  const submit = async () => {
    if (!valid) {
      toast.error("Give the group a name.");
      return;
    }
    try {
      const res = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        ownerName: ownerName.trim() || "you",
      });
      toast.success("Group created");
      setName("");
      setDescription("");
      setOwnerName("");
      onOpenChange(false);
      onCreated?.(res.group.id);
    } catch (e) {
      // Keep the dialog open (input isn't lost) but make the failure loud
      // and long-lived so it isn't missed on mobile.
      toast.error(describeCloudError(e), { duration: 8000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Create a group
          </DialogTitle>
          <DialogDescription>
            Make a circle for family, friends, or coworkers to share quotes
            with.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="g-name">
              Group name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="g-name"
              placeholder="e.g. Family, Office, College Roomies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Description (optional)</Label>
            <Textarea
              id="g-desc"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-owner">Your name (shown to members)</Label>
            <Input
              id="g-owner"
              placeholder="e.g. Pat"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>
            {create.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
