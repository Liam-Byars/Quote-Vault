"use client";

import { useState } from "react";
import { Lightbulb, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSuggestion } from "@/hooks/use-suggestions";

export function SuggestionBox() {
  const { user } = useAuth();
  const create = useCreateSuggestion();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!user) return null;

  const submit = async () => {
    if (!text.trim()) return;
    try {
      await create.mutateAsync({
        text: text.trim(),
        authorName: user.displayName || user.email?.split("@")[0] || "Someone",
      });
      toast.success("Suggestion sent — thank you!");
      setText("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
  };

  if (open) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Suggest a feature or report a bug..."
          className="h-7 flex-1 text-[11px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          autoFocus
        />
        <Button
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={submit}
          disabled={!text.trim() || create.isPending}
        >
          <Send className="h-3 w-3" />
          Send
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => setOpen(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      <Lightbulb className="h-3 w-3" />
      Suggest a feature
    </button>
  );
}
