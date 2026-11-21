import type { MetadataRoute } from "next";

// PWA manifest — makes Quote Vault installable on phones and desktops.
// After this is deployed, users can "Add to Home Screen" / "Install app"
// and it'll appear as a native-style app icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quote Vault — Funny Things People Say",
    short_name: "Quote Vault",
    description:
      "A mobile-friendly journal for the funny, weird, and memorable things people say.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fef9f0",
    theme_color: "#d97706",
    categories: ["lifestyle", "social", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
