"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Heart,
  MapPin,
  MoreVertical,
  Pencil,
  Quote as QuoteIcon,
  QrCode,
  Trash2,
  Share2,
  Users,
  ImageDown,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Button } from "@/components/ui/button";
import {
  authorColor,
  initials,
  parseAuthors,
  parseTags,
  voiceFontStyle,
  type Quote,
} from "@/lib/quote-types";
import { useToggleFavorite, useDeleteQuote, useCreateQuote } from "@/hooks/use-quotes";
import { StarRating } from "./star-rating";
import { QrDialog } from "./qr-dialog";
import { exportQuoteImage } from "./share-image";
import { PersonDialog } from "./person-dialog";

type Props = {
  quote: Quote;
  onEdit: (quote: Quote) => void;
  groupName?: string | null;
};

function safeFormat(iso: string | null, fmt: string): string {
  if (!iso) return "Date unknown";
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return iso;
  }
}

export function QuoteCard({ quote, onEdit, groupName }: Props) {
  const toggleFav = useToggleFavorite();
  const deleteQuote = useDeleteQuote();
  const createQuote = useCreateQuote();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [laughs, setLaughs] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(`laugh-${quote.id}`);
    return stored ? parseInt(stored, 10) || 0 : 0;
  });
  const tags = parseTags(quote.tags);
  const authors = parseAuthors(quote.author || "Unknown");
  const primaryAuthor = authors[0] || "Unknown";

  const onLaugh = () => {
    const next = laughs + 1;
    setLaughs(next);
    localStorage.setItem(`laugh-${quote.id}`, String(next));
  };

  const onFav = () => {
    toggleFav.mutate({
      id: quote.id,
      favorite: !quote.favorite,
      groupId: quote.groupId,
    });
  };

  const onDelete = async () => {
    setConfirmOpen(false);
    // Store the quote data for undo.
    const snapshot = {
      text: quote.text,
      author: quote.author,
      dateSaid: quote.dateSaid,
      context: quote.context,
      tags: quote.tags,
      rating: quote.rating,
      favorite: quote.favorite,
      groupId: quote.groupId,
    };
    try {
      await deleteQuote.mutateAsync({
        id: quote.id,
        groupId: quote.groupId,
      });
      toast("Quote deleted", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await createQuote.mutateAsync(snapshot);
              toast.success("Quote restored");
            } catch {
              toast.error("Couldn’t restore the quote");
            }
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const onShare = async () => {
    const shareText = `"${quote.text}" — ${quote.author || "Unknown"}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Quote Vault", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("Copied to clipboard");
      }
    } catch {
      // user cancelled share — no toast needed
    }
  };

  return (
    <>
      <Card
        className={cnCard(quote.favorite)}
      >
        {/* Accent strip on the left for favorites */}
        <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
          {/* Avatar */}
          <div
            className={
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold " +
              authorColor(primaryAuthor)
            }
            aria-hidden
          >
            {initials(primaryAuthor)}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="truncate font-semibold leading-tight text-foreground cursor-pointer hover:text-primary"
                  onClick={() => {
                    setPersonName(primaryAuthor);
                    setPersonOpen(true);
                  }}
                  title="Click to view profile"
                >
                  {quote.author || "Unknown"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {safeFormat(quote.dateSaid, "MMM d, yyyy")}
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onLaugh}
                  aria-label="Laugh"
                  className="rounded-md p-1.5 text-sm transition-colors hover:bg-muted"
                >
                  😂{laughs > 0 && <span className="ml-0.5 text-xs">{laughs}</span>}
                </button>
                <button
                  type="button"
                  onClick={onFav}
                  disabled={toggleFav.isPending}
                  aria-pressed={quote.favorite}
                  aria-label={quote.favorite ? "Unfavorite" : "Favorite"}
                  className="rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <Heart
                    className={cnHeart(quote.favorite)}
                  />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      aria-label="Quote actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(quote)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onShare}>
                      <Share2 className="mr-2 h-4 w-4" /> Share / Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQrOpen(true)}>
                      <QrCode className="mr-2 h-4 w-4" /> QR code
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        exportQuoteImage(quote);
                        toast.success("Image downloaded");
                      }}
                    >
                      <ImageDown className="mr-2 h-4 w-4" /> Save as image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* The quote */}
            <div className="relative mt-2 pl-4">
              <QuoteIcon className="absolute left-0 top-0.5 h-3.5 w-3.5 text-primary/40" />
              <p
                className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground sm:text-base"
                style={voiceFontStyle(quote.voiceFont)}
              >
                {quote.text}
              </p>
            </div>

            {/* Context */}
            {quote.context && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{quote.context}</span>
              </p>
            )}

            {/* Tags + group badge */}
            {(tags.length > 0 || groupName) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {groupName && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-primary/10 text-[11px] font-medium text-primary"
                  >
                    <Users className="h-3 w-3" />
                    {groupName}
                  </Badge>
                )}
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="bg-secondary/70 text-[11px] font-normal"
                  >
                    #{t}
                  </Badge>
                ))}
              </div>
            )}

            {/* Footer: rating */}
            <div className="mt-3 flex items-center justify-between">
              <StarRating value={quote.rating} size={15} />
              <span className="text-[11px] text-muted-foreground">
                {quote.rating}/5 funny
              </span>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the quote by {quote.author || "Unknown"}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="Share this quote"
        description="Scan to read the quote, or copy the text to share it."
        payload={`"${quote.text}" — ${quote.author || "Unknown"}`}
        caption={`"${quote.text}" — ${quote.author || "Unknown"}`}
      />

      <PersonDialog
        name={personName}
        open={personOpen}
        onOpenChange={setPersonOpen}
      />
    </>
  );
}

function cnCard(favorite: boolean) {
  const base =
    "relative overflow-hidden border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md";
  return favorite
    ? base + " border-primary/30 ring-1 ring-primary/20"
    : base;
}

function cnHeart(favorite: boolean) {
  return favorite
    ? "h-4.5 w-4.5 fill-rose-500 text-rose-500"
    : "h-4.5 w-4.5 text-muted-foreground";
}
