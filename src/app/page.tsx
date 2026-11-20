"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, MessageSquareQuote, BookDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/quote/theme-toggle";
import { UserMenu } from "@/components/quote/user-menu";
import { QuoteStatsView } from "@/components/quote/quote-stats";
import { QuoteFiltersBar } from "@/components/quote/quote-filters";
import { QuoteCard } from "@/components/quote/quote-card";
import { QuoteFormDrawer } from "@/components/quote/quote-form-drawer";
import { EmptyState } from "@/components/quote/empty-state";
import { GroupsView } from "@/components/quote/groups-view";
import { GroupDetail } from "@/components/quote/group-detail";
import { JoinGroupDialog } from "@/components/quote/join-group-dialog";
import { LegalDialog } from "@/components/quote/legal-dialog";
import { CloudStatus } from "@/components/quote/cloud-status";
import { exportQuoteBook } from "@/components/quote/export-pdf";
import {
  useQuotes,
  useQuoteStats,
  type QuoteFilters,
} from "@/hooks/use-quotes";
import { useGroups } from "@/hooks/use-groups";
import { parseTags, type Quote } from "@/lib/quote-types";
import { APP_VERSION } from "@/lib/version";

type Tab = "vault" | "groups";

export default function Page() {
  const [tab, setTab] = useState<Tab>("vault");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuoteFilters>({ sort: "newest" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [presetGroupId, setPresetGroupId] = useState<string | null>(null);

  // Invite-via-URL (?join=<code>), e.g. from scanning a group QR.
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  // Terms / Privacy dialog
  const [legalOpen, setLegalOpen] = useState(false);

  const quotesQuery = useQuotes(filters);
  const statsQuery = useQuoteStats();
  const groupsQuery = useGroups();

  const quotes = quotesQuery.data?.quotes ?? [];
  const groups = groupsQuery.data?.groups ?? [];

  // Read ?join= on mount (client-only to avoid SSR/Suspense requirements).
  // This is a one-time sync from an external system (the browser URL) into
  // state, so the cascading-render concern doesn't apply here.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJoinCode(code);
      setJoinOpen(true);
    }
  }, []);

  // Map groupId -> name for badge display on vault cards.
  const groupNameFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) map.set(g.id, g.name);
    return (id: string | null | undefined) =>
      id ? (map.get(id) ?? null) : null;
  }, [groups]);

  // Derive known authors + tags for autocomplete / filters.
  const { authors, tags } = useMemo(() => {
    const a = new Set<string>();
    const t = new Set<string>();
    for (const q of quotes) {
      if (q.author) a.add(q.author);
      for (const tag of parseTags(q.tags)) t.add(tag);
    }
    return {
      authors: [...a].sort((x, y) => x.localeCompare(y)),
      tags: [...t].sort((x, y) => x.localeCompare(y)),
    };
  }, [quotes]);

  const openNew = () => {
    setEditing(null);
    setPresetGroupId(null);
    setDrawerOpen(true);
  };

  const openNewInGroup = (groupId: string) => {
    setEditing(null);
    setPresetGroupId(groupId);
    setDrawerOpen(true);
  };

  const openEdit = (q: Quote) => {
    setEditing(q);
    setPresetGroupId(null);
    setDrawerOpen(true);
  };

  const selectTab = (t: Tab) => {
    setTab(t);
    setSelectedGroupId(null);
  };

  const onJoinedFromLink = (groupId: string) => {
    // Clean the ?join= from the URL.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("join");
      window.history.replaceState({}, "", url.toString());
    }
    setTab("groups");
    setSelectedGroupId(groupId);
  };

  const exportAll = () => {
    if (quotes.length === 0) {
      toast.error("No quotes to export yet");
      return;
    }
    exportQuoteBook({
      title: "My Quote Vault",
      subtitle: "A book of the funny things people say",
      quotes,
    });
    toast.success("Exporting PDF…");
  };

  const hasFilters =
    !!filters.q || !!filters.author || !!filters.tag || !!filters.favorite;
  const clearFilters = () => setFilters({ sort: filters.sort ?? "newest" });

  const showTabs = !(tab === "groups" && selectedGroupId);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquareQuote className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-[15px] font-bold tracking-tight">
                Quote Vault
              </h1>
              <p className="-mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                Funny things people say
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={exportAll}
              aria-label="Export all quotes as a PDF book"
              title="Export as PDF book"
            >
              <BookDown className="h-5 w-5" />
            </Button>
            <Button
              onClick={openNew}
              size="sm"
              className="h-9 gap-1.5"
              aria-label="Add quote"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add quote</span>
            </Button>
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-8">
          {/* Tabs */}
          {showTabs && (
            <div className="flex rounded-xl bg-muted p-1">
              <TabButton
                active={tab === "vault"}
                onClick={() => selectTab("vault")}
                label="Vault"
              />
              <TabButton
                active={tab === "groups"}
                onClick={() => selectTab("groups")}
                label="Groups"
                badge={groups.length || undefined}
              />
            </div>
          )}

          {tab === "vault" && (
            <>
              <QuoteStatsView
                data={statsQuery.data}
                isLoading={statsQuery.isLoading}
              />

              <QuoteFiltersBar
                filters={filters}
                onChange={setFilters}
                authors={authors}
                tags={tags}
                resultCount={quotes.length}
              />

              {quotesQuery.isLoading ? (
                <QuoteListSkeleton />
              ) : quotes.length === 0 ? (
                <EmptyState
                  hasFilters={hasFilters}
                  onAdd={openNew}
                  onClear={clearFilters}
                />
              ) : (
                <div className="space-y-3">
                  {quotes.map((q) => (
                    <QuoteCard
                      key={q.id}
                      quote={q}
                      onEdit={openEdit}
                      groupName={groupNameFor(q.groupId)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "groups" && !selectedGroupId && (
            <GroupsView onOpenGroup={setSelectedGroupId} />
          )}

          {tab === "groups" && selectedGroupId && (
            <GroupDetail
              groupId={selectedGroupId}
              onBack={() => setSelectedGroupId(null)}
              onAddQuoteToGroup={openNewInGroup}
              onEditQuote={openEdit}
            />
          )}
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-background/85 backdrop-blur-md pb-safe">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            Quote Vault{" "}
            <span className="tabular-nums opacity-60">v{APP_VERSION}</span>{" "}
            — the things people say, before you forget them.
          </p>
          <CloudStatus />
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Terms · Privacy
          </button>
        </div>
      </footer>

      <QuoteFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editing={editing}
        knownAuthors={authors}
        knownTags={tags}
        groups={groups}
        presetGroupId={presetGroupId}
      />

      <JoinGroupDialog
        open={joinOpen}
        inviteCode={joinCode ?? ""}
        onOpenChange={(o) => {
          setJoinOpen(o);
          if (!o) setJoinCode(null);
        }}
        onJoined={onJoinedFromLink}
      />

      <LegalDialog open={legalOpen} onOpenChange={setLegalOpen} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold",
            active
              ? "bg-primary/15 text-primary"
              : "bg-muted-foreground/15 text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function QuoteListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
