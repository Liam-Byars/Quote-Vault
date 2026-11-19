"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Users,
  MessageSquareQuote,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authorColor, initials } from "@/lib/quote-types";
import { useGroups } from "@/hooks/use-groups";
import { CreateGroupDialog } from "./create-group-dialog";
import { JoinGroupDialog } from "./join-group-dialog";

type Props = {
  onOpenGroup: (id: string) => void;
};

function safeFormat(iso: string, fmt: string): string {
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return iso;
  }
}

export function GroupsView({ onOpenGroup }: Props) {
  const { data, isLoading } = useGroups();
  const groups = data?.groups ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Action row */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${groups.length} ${groups.length === 1 ? "group" : "groups"}`}
        </h2>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto h-9 gap-1.5"
          onClick={() => setJoinOpen(true)}
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Join with code</span>
          <span className="sm:hidden">Join</span>
        </Button>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create group</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No groups yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Create a group for your family, friends, or coworkers to share
            quotes together.
          </p>
          <div className="mt-5 flex gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create a group
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onOpenGroup(g.id)}
              className="group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-semibold leading-tight">
                    {g.name}
                  </h3>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                {g.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {g.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquareQuote className="h-3 w-3" />
                    {g.quoteCount} {g.quoteCount === 1 ? "quote" : "quotes"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {g.members.length}{" "}
                    {g.members.length === 1 ? "member" : "members"}
                  </span>
                  <span>{safeFormat(g.createdAt, "MMM d, yyyy")}</span>
                </div>
                {/* Member avatars */}
                {g.members.length > 0 && (
                  <div className="mt-2 flex -space-x-2">
                    {g.members.slice(0, 6).map((m) => (
                      <span
                        key={m.id}
                        title={m.name}
                        className={
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-semibold " +
                          authorColor(m.name)
                        }
                      >
                        {initials(m.name)}
                      </span>
                    ))}
                    {g.members.length > 6 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-semibold">
                        +{g.members.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onOpenGroup}
      />
      <JoinGroupDialog open={joinOpen} onOpenChange={setJoinOpen} onJoined={onOpenGroup} />
    </div>
  );
}
