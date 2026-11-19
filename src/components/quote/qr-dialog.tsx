"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  payload: string; // what the QR encodes
  caption?: string; // human-readable text shown under the QR
};

export function QrDialog({
  open,
  onOpenChange,
  title,
  description,
  payload,
  caption,
}: Props) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: caption ?? payload, url: payload });
      } else {
        await copyLink();
      }
    } catch {
      /* cancelled */
    }
  };

  const downloadPng = () => {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("Couldn't find QR image");
      return;
    }
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "quote-vault-qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("QR image downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <div
            ref={canvasWrapRef}
            className="rounded-xl border bg-white p-3 shadow-sm"
          >
            <QRCodeCanvas
              value={payload}
              size={208}
              level="M"
              marginSize={2}
              fgColor="#1c1814"
              bgColor="#ffffff"
            />
          </div>

          {caption && (
            <p className="max-w-full break-words text-center text-xs text-muted-foreground">
              {caption}
            </p>
          )}

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyLink}
            >
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={downloadPng}
            >
              <Download className="mr-1.5 h-4 w-4" />
              PNG
            </Button>
            <Button className="flex-1" onClick={share}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
