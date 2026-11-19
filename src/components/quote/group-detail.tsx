"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BookDown,
  MoreVertical,
  QrCode,
  Trash2,
  UserPlus,
  Users,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authorColor, initials } from "@/lib/quote-types";
import { inviteUrl } from "@/lib/group-types";
import { useGroup, useRemoveMember, useDeleteGroup } from "@/hooks/use-groups";
import type { Quote } from "@/lib/quote-types";
import { QuoteCard } from "./quote-card";
import { QrDialog } from "./qr-dialog";
import { AddMemberDialog } from "./add-member-dialog";
import { exportQuoteBook } from "./export-pdf";

type Props = {
  groupId: string;
  onBack: () => void;
  onAddQuoteToGroup: (groupId: string) => void;
  onEditQuote: (q: Quote) => void;
};

function safeFormat(iso: string, fmt: string): string {
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return iso;
  }
}

export function GroupDetail({
  groupId,
  onBack,
  onAddQuoteToGroup,
  onEditQuote,
}: Props) {
  const { data, isLoading } = useGroup(groupId);
  const removeMember = useRemoveMember();
  const deleteGroup = useDeleteGroup();
  const [qrOpen, setQrOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const group = data?.group;

  const onRemoveMember = async (
    memberId: string,
    name: string,
    named: boolean
  ) => {
    try {
      await removeMember.mutateAsync({ groupId, memberId, named });
      toast.success(`Removed ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const onDeleteGroup = async () => {
    setDeleteOpen(false);
    try {
      await deleteGroup.mutateAsync(groupId);
      toast.success("Group deleted");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete group");
    }
  };

  const onExport = () => {
    if (!group || group.quotes.length === 0) {
      toast.error("No quotes in this group yet");
      return;
    }
    exportQuoteBook({
      title: group.name,
      subtitle: group.description || "A book of quotes from Quote Vault",
      quotes: group.quotes,
    });
    toast.success("Exporting PDF…");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Group not found.
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onBack}
          aria-label="Back to groups"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight">
            {group.name}
          </h2>
          {group.description && (
            <p className="truncate text-xs text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Group actions"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setQrOpen(true)}
        >
          <QrCode className="h-4 w-4" />
          Invite / QR
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setAddMemberOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-9 gap-1.5"
          onClick={onExport}
        >
          <BookDown className="h-4 w-4" />
          Export book
        </Button>
        <Button
          size="sm"
          className="ml-auto h-9 gap-1.5"
          onClick={() => onAddQuoteToGroup(group.id)}
        >
          <Plus className="h-4 w-4" />
          Add quote
        </Button>
      </div>

      {/* Members */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {group.members.length} {group.members.length === 1 ? "member" : "members"}
        </div>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-2 rounded-full border bg-secondary/40 py-1 pl-1 pr-2.5"
            >
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold " +
                  authorColor(m.name)
                }
              >
                {initials(m.name)}
              </span>
              <span className="text-xs font-medium">{m.name}</span>
              {m.role === "owner" && (
                <Badge className="h-4 px-1.5 text-[9px]">owner</Badge>
              )}
              {m.role !== "owner" && (
                <button
                  type="button"
                  onClick={() =>
                    onRemoveMember(m.id, m.name, m.id.startsWith("named-"))
                  }
                  disabled={removeMember.isPending}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label={`Remove ${m.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quotes in this group */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {group.quotes.length} {group.quotes.length === 1 ? "quote" : "quotes"}
          </h3>
        </div>
        {group.quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No quotes in this group yet.
            <div className="mt-3">
              <Button size="sm" onClick={() => onAddQuoteToGroup(group.id)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add the first quote
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {group.quotes.map((q) => (
              <QuoteCard
                key={q.id}
                quote={q}
                onEdit={onEditQuote}
                groupName={group.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        title={`Invite to "${group.name}"`}
        description="Share this link or QR code so others can join the group."
        payload={inviteUrl(group.inviteCode)}
        caption={inviteUrl(group.inviteCode)}
      />
      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        groupId={group.id}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the group, its member list, and every quote
              shared in it. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
