"use client";

import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import type { Quote } from "@/lib/quote-types";
import { parseTags } from "@/lib/quote-types";

type ExportOpts = {
  title: string;
  subtitle?: string;
  quotes: Quote[];
};

// Warm amber accent (matches the app theme).
const AMBER: [number, number, number] = [217, 119, 6];
const INK: [number, number, number] = [40, 34, 28];
const MUTED: [number, number, number] = [120, 110, 100];
const LINE: [number, number, number] = [225, 215, 200];

function safeFormat(iso: string, fmt: string): string {
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return iso;
  }
}

// Build a nicely formatted "book of quotes" PDF and trigger a download.
export function exportQuoteBook({ title, subtitle, quotes }: ExportOpts) {
  // A5 portrait — a pocket-book feel.
  const doc = new jsPDF({ unit: "pt", format: "a5", compress: true });
  const pageW = doc.internal.pageSize.getWidth(); // ~419.5
  const pageH = doc.internal.pageSize.getHeight(); // ~595.3
  const margin = 36;

  // ---------- Cover ----------
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, pageW, 120, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("QUOTE VAULT", margin, 56);

  doc.setFontSize(26);
  doc.text(doc.splitTextToSize(title, pageW - margin * 2), margin, 86);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  if (subtitle) {
    const sub = doc.splitTextToSize(subtitle, pageW - margin * 2);
    doc.text(sub, margin, 160);
  }

  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`${quotes.length} ${quotes.length === 1 ? "quote" : "quotes"}`, margin, pageH - 96);
  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.text(`Compiled ${format(new Date(), "MMMM d, yyyy")}`, margin, pageH - 78);

  // small footer line
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 50, pageW - margin, pageH - 50);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Made with Quote Vault", margin, pageH - 36);

  // ---------- Content pages ----------
  if (quotes.length === 0) {
    return doc.save(safeFileName(title));
  }

  let y = margin + 30;
  let pageNum = 1;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 24) {
      addPageHeader();
      return margin + 30;
    }
    return y;
  };

  const addPageHeader = () => {
    doc.addPage();
    pageNum += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(title, margin, margin - 12);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, margin - 6, pageW - margin, margin - 6);
  };

  // First content page header
  doc.addPage();
  pageNum += 1;
  addPageHeader();

  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i];
    const tags = parseTags(q.tags);

    // Estimate block height: quote text + author + meta + tags + divider.
    const quoteLines = doc.splitTextToSize(`“${q.text}”`, pageW - margin * 2);
    const quoteHeight = quoteLines.length * 15;

    // Reserve space for the whole block, else page break.
    const blockHeight = quoteHeight + 22 /* author */ + 14 /* meta */ + (q.context ? 14 : 0) + (tags.length ? 16 : 0) + 18 /* rating + divider */ + 12 /* pad */;
    y = ensureSpace(blockHeight);

    // Accent tick
    doc.setFillColor(...AMBER);
    doc.rect(margin - 14, y - 9, 3, Math.min(quoteHeight + 24, 60), "F");

    // The quote
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(quoteLines, margin, y);
    y += quoteHeight + 6;

    // Author
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...AMBER);
    doc.text(`— ${q.author}`, margin, y);
    y += 16;

    // Meta: date + context
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const metaParts = [safeFormat(q.dateSaid, "MMM d, yyyy")];
    if (q.context) metaParts.push(q.context);
    doc.text(doc.splitTextToSize(metaParts.join("  ·  "), pageW - margin * 2), margin, y);
    y += 12;

    // Tags
    if (tags.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(tags.map((t) => `#${t}`).join("  "), margin, y);
      y += 14;
    }

    // Rating as 5 dots
    const dotR = 2.6;
    const gap = 10;
    const startX = margin;
    for (let s = 0; s < 5; s++) {
      if (s < q.rating) {
        doc.setFillColor(...AMBER);
        doc.circle(startX + s * gap, y, dotR, "F");
      } else {
        doc.setDrawColor(...LINE);
        doc.setFillColor(255, 255, 255);
        doc.circle(startX + s * gap, y, dotR, "S");
      }
    }
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${q.rating}/5 funny`, margin + 5 * gap + 6, y + 3);
    y += 16;

    // Divider
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  }

  doc.save(safeFileName(title));
}

function safeFileName(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "quotes";
  return `${base}-quote-book.pdf`;
}
