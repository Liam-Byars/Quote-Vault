"use client";

import { useState } from "react";
import { Loader2, Sparkles, X, Mic } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Quote, type VoiceFont } from "@/lib/quote-types";
import type { Group } from "@/lib/group-types";
import { useCreateQuote, useUpdateQuote } from "@/hooks/use-quotes";
import { describeCloudError } from "@/lib/cloud-errors";
import { StarRating } from "./star-rating";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Quote | null;
  knownAuthors: string[];
  knownTags: string[];
  groups: Group[];
  // When creating a new quote inside a group, preset the group.
  presetGroupId?: string | null;
};

export function QuoteFormDrawer(props: Props) {
  const { open, onOpenChange, editing, presetGroupId } = props;

  // Force a fresh mount of the inner form each time the drawer opens so the
  // form state is initialized from the current `editing` target (or the
  // preset group). This avoids syncing props into state via an effect.
  const key = `${editing ? editing.id : "new"}-${presetGroupId ?? ""}-${open}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Use the same data-variant as the base component so tailwind-merge
          replaces (not just supplements) the default 80vh cap. */}
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        {open ? (
          <QuoteFormInner key={key} {...props} />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

type FormState = {
  text: string;
  author: string;
  dateSaid: string; // yyyy-mm-dd
  context: string;
  tags: string;
  rating: number;
  favorite: boolean;
  groupId: string; // "" = personal / none
  voiceFont: VoiceFont;
};

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function dateToInput(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function makeInitial(
  editing: Quote | null,
  presetGroupId?: string | null
): FormState {
  if (!editing) {
    return {
      text: "",
      author: "",
      dateSaid: todayISO(),
      context: "",
      tags: "",
      rating: 3,
      favorite: false,
      groupId: presetGroupId ?? "",
      voiceFont: "normal",
    };
  }
  return {
    text: editing.text,
    author: editing.author,
    dateSaid: dateToInput(editing.dateSaid),
    context: editing.context ?? "",
    tags: editing.tags,
    rating: editing.rating,
    favorite: editing.favorite,
    groupId: editing.groupId ?? "",
    voiceFont: editing.voiceFont ?? "normal",
  };
}

function QuoteFormInner({
  open,
  onOpenChange,
  editing,
  knownAuthors,
  knownTags,
  groups,
  presetGroupId,
}: Props) {
  const create = useCreateQuote();
  const update = useUpdateQuote();
  const [form, setForm] = useState<FormState>(() =>
    makeInitial(editing, presetGroupId)
  );
  const [tagDraft, setTagDraft] = useState("");
  const [listening, setListening] = useState(false);

  const startVoice = () => {
    const SR = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input not supported in this browser (try Chrome)");
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      set("text", transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const existing = form.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (existing.includes(t)) {
      setTagDraft("");
      return;
    }
    const next = [...existing, t].join(", ");
    set("tags", next);
    setTagDraft("");
  };

  const removeTag = (t: string) => {
    const next = form.tags
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== t)
      .join(", ");
    set("tags", next);
  };

  const currentTags = form.tags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const valid = form.text.trim().length > 0;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid) {
      toast.error("Add the quote and who said it.");
      return;
    }
    const payload = {
      text: form.text.trim(),
      author: form.author.trim(),
      dateSaid: form.dateSaid ? new Date(form.dateSaid).toISOString() : null,
      context: form.context.trim() || null,
      tags: form.tags,
      rating: form.rating,
      favorite: form.favorite,
      groupId: form.groupId || null,
      voiceFont: form.voiceFont,
    };
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          input: payload,
          // Tells the cloud layer where the quote currently lives (personal
          // collection vs a group's shared collection) so it can move it if
          // the group was changed.
          currentGroupId: editing.groupId,
        });
        toast.success("Quote updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Quote saved");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(describeCloudError(err), { duration: 8000 });
    }
  };

  const pending = create.isPending || update.isPending;
  const title = editing ? "Edit quote" : "New quote";

  return (
    // The wrapper gets its own max-height (drawer cap minus the drag handle)
    // so the form inside can actually flex-shrink and become the scrollable
    // region — without this, tall forms push the footer off-screen and touch
    // scrolling appears broken on phones.
    <div className="mx-auto flex max-h-[calc(85dvh-44px)] w-full max-w-lg flex-col">
      <DrawerHeader className="shrink-0 pb-2">
        <DrawerTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
        </DrawerTitle>
        <DrawerDescription>
          Capture the moment before you forget it.
        </DrawerDescription>
      </DrawerHeader>

      <form
        onSubmit={submit}
        // data-vaul-no-drag lets touch scrolling work inside the drawer on
        // mobile (without it, vaul captures touch moves to drag the sheet).
        data-vaul-no-drag
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-2 scroll-slim"
      >
        {/* The quote */}
        <div className="space-y-1.5">
          <Label htmlFor="q-text">
            What did they say? <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Textarea
              id="q-text"
              autoFocus
              placeholder="The exact words, as best as you can remember..."
              value={form.text}
              onChange={(e) => set("text", e.target.value)}
              rows={3}
              className="resize-none pr-10"
            />
            <button
              type="button"
              onClick={startVoice}
              className="absolute right-2 top-2 rounded-md p-1.5 transition-colors hover:bg-muted"
              aria-label="Voice input"
            >
              <Mic className={listening ? "h-4 w-4 text-primary animate-pulse" : "h-4 w-4 text-muted-foreground"} />
            </button>
          </div>
        </div>

        {/* Voice font picker */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Voice style:</span>
          {(["normal", "bold", "cursive", "italic", "shout"] as VoiceFont[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("voiceFont", v)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                form.voiceFont === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "normal" ? "Normal" : v === "bold" ? "Bold" : v === "cursive" ? "Cursive" : v === "italic" ? "Italic" : "SHOUT"}
            </button>
          ))}
        </div>

        {/* Author + date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="q-author">
              Who said it?
            </Label>
            <Input
              id="q-author"
              list="authors-list"
              placeholder="e.g. Grandma, Liam"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Separate multiple people with commas
            </p>
            <datalist id="authors-list">
              {knownAuthors.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-date">
              When?
            </Label>
            <Input
              id="q-date"
              type="date"
              value={form.dateSaid}
              onChange={(e) => set("dateSaid", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Leave blank if you don&apos;t remember
            </p>
          </div>
        </div>

        {/* Context + Group */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="q-context">Where / context</Label>
            <Input
              id="q-context"
              placeholder="Sunday dinner, traffic..."
              value={form.context}
              onChange={(e) => set("context", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-group">Group</Label>
            <Select
              value={form.groupId || "__none"}
              onValueChange={(v) => set("groupId", v === "__none" ? "" : v)}
            >
              <SelectTrigger id="q-group" className="w-full">
                <SelectValue placeholder="Personal (no group)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Personal (no group)</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label htmlFor="q-tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="q-tags"
              list="tags-list"
              placeholder="Add a tag and press Enter"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => addTag(tagDraft)}
              disabled={!tagDraft.trim()}
            >
              Add
            </Button>
          </div>
          <datalist id="tags-list">
            {knownTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentTags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="gap-1 bg-secondary/70 pr-1"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={`Remove tag ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Rating */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="text-sm">Funny meter</Label>
            <p className="text-xs text-muted-foreground">
              How hard did it make you laugh?
            </p>
          </div>
          <StarRating
            value={form.rating}
            onChange={(v) => set("rating", v)}
            size={26}
          />
        </div>

        {/* Favorite */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="q-fav" className="text-sm">
              Mark as favorite
            </Label>
            <p className="text-xs text-muted-foreground">
              Pin the all-timers to the top.
            </p>
          </div>
          <Switch
            id="q-fav"
            checked={form.favorite}
            onCheckedChange={(v) => set("favorite", v)}
          />
        </div>
      </form>

      <DrawerFooter className="shrink-0 gap-2 pt-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => submit()}
            disabled={!valid || pending}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Save quote"}
          </Button>
        </div>
      </DrawerFooter>
    </div>
  );
}
