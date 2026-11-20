import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Race a promise against a timeout. If the promise doesn't resolve within
 * `ms` milliseconds, it rejects with a timeout error. Used by mutation hooks
 * so cloud writes don't hang indefinitely (e.g. when the Firestore database
 * doesn't exist yet — the SDK retries with exponential backoff for 30-60s).
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Cloud write timed out")), ms)
    ),
  ]);
}
