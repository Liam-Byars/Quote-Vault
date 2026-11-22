"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { usePerson, useSavePerson } from "@/hooks/use-people";

type Props = {
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PersonDialog({ name, open, onOpenChange }: Props) {
  const { data: person, isLoading } = usePerson(open ? name : null);
  const save = useSavePerson();
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (person) {
      setLastName(person.lastName);
      setMiddleInitial(person.middleInitial);
      setBirthday(person.birthday ?? "");
      setNotes(person.notes);
    } else if (!isLoading) {
      setLastName("");
      setMiddleInitial("");
      setBirthday("");
      setNotes("");
    }
  }, [person, isLoading]);

  const onSave = async () => {
    try {
      await save.mutateAsync({
        name,
        input: {
          lastName,
          middleInitial,
          birthday: birthday || null,
          notes,
        },
      });
      toast.success("Profile saved");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {name}
          </DialogTitle>
          <DialogDescription>
            Add info about this person
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Last name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Middle initial</Label>
                <Input
                  value={middleInitial}
                  onChange={(e) => setMiddleInitial(e.target.value)}
                  placeholder="J"
                  maxLength={2}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Birthday</Label>
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything about this person..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={save.isPending || isLoading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
