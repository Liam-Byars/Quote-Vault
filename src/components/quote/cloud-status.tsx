"use client";

// Tiny footer indicator that shows the cloud sync state in real time.
// Helps diagnose whether quotes are saving to Firestore or falling back
// to local, and whether the cloud read is working on refresh.
import { useAuth } from "@/hooks/use-auth";
import { useCloudSync } from "@/lib/cloud-sync";

export function CloudStatus() {
  const { user } = useAuth();
  const cloud = useCloudSync();

  if (!user) return null;

  const totalQuotes =
    cloud.personalQuotes.length +
    Object.values(cloud.groupQuotes).flat().length;

  const status = cloud.error
    ? "cloud offline"
    : !cloud.ready
      ? "cloud connecting"
      : totalQuotes > 0
        ? `cloud synced (${totalQuotes})`
        : "cloud empty";

  return (
    <span className="text-[10px] opacity-50 tabular-nums">{status}</span>
  );
}
