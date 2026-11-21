// Generate a shareable image card from a quote using HTML Canvas.
// Produces a 1080x1080 PNG (Instagram-square friendly) with the quote text
// on a gradient background. No external libraries — pure Canvas API.

import type { Quote } from "@/lib/quote-types";

const COLORS = [
  ["#f59e20", "#d97706"], // amber
  ["#10b981", "#059669"], // emerald
  ["#8b5cf6", "#6d28d9"], // violet
  ["#ec4899", "#be185d"], // pink
  ["#06b6d4", "#0891b2"], // cyan
  ["#ef4444", "#b91c1c"], // red
];

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function exportQuoteImage(quote: Quote, colorIndex = 0) {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Pick a color pair (deterministic based on quote text length).
  const [c1, c2] =
    COLORS[(quote.text.length + colorIndex) % COLORS.length];

  // Gradient background.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative quote mark.
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 300px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("\u201C", W / 2, 280);

  // Quote text.
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 52px Georgia, serif";
  ctx.textAlign = "center";
  const maxWidth = W - 160;
  const lines = wrapText(ctx, quote.text, maxWidth);
  const lineHeight = 68;
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * lineHeight);
  });

  // Author.
  ctx.font = "400 32px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(
    `\u2014 ${quote.author || "Unknown"}`,
    W / 2,
    startY + lines.length * lineHeight + 20
  );

  // Watermark.
  ctx.font = "600 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("Quote Vault", W / 2, H - 50);

  // Export.
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quote-vault-${quote.id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
