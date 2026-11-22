"use client";

import { useState } from "react";
import { ScrollText, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LegalDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"terms" | "privacy">("terms");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>Terms &amp; Privacy</DialogTitle>
          <DialogDescription>
            The short, honest version for Quote Vault.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "terms" | "privacy")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms" className="gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              Terms
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[55vh] overflow-y-auto pr-1 scroll-slim">
            <TabsContent value="terms" className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">
              <Section title="1. What Quote Vault is">
                Quote Vault is a personal journal app for saving and sharing
                quotes — the funny, weird, and memorable things people say. You
                can use it on your own, or in groups with people you invite.
              </Section>
              <Section title="2. Your content">
                You keep ownership of everything you write. Your quotes are
                either stored only in your own browser (when you&apos;re not
                signed in) or in your Firebase cloud account (when you are).
                You can edit or delete your quotes at any time. Don&apos;t put
                anything in a group you wouldn&apos;t want its members to see.
              </Section>
              <Section title="3. Acceptable use">
                Don&apos;t use Quote Vault to harass anyone, store content
                that&apos;s illegal, or share quotes meant to hurt or expose
                someone. Group owners can delete their groups; be kind.
              </Section>
              <Section title="4. Accounts">
                Signing in uses your Google account through Firebase
                Authentication. You&apos;re responsible for your account
                activity. You need to meet Google&apos;s minimum age
                requirement to use Google sign-in.
              </Section>
              <Section title="5. Admin & maintenance">
                The app has one admin account (the project owner). The admin
                can see all quotes and groups for moderation purposes, and can
                temporarily put the app into maintenance mode (a downtime
                screen) if there&apos;s a bug or issue. The admin can&apos;t
                see your Google password — only the quotes and groups you
                create in the app.
              </Section>
              <Section title="6. The service">
                Quote Vault is provided &quot;as is&quot; without warranties.
                It&apos;s a personal project — it may have bugs, and features
                may change or be discontinued. Don&apos;t rely on it as your
                only copy of anything important; you can export your quotes as
                a PDF anytime.
              </Section>
              <Section title="7. Installable app & offline">
                Quote Vault can be installed as a Progressive Web App (PWA) on
                your phone or computer. Once installed, it works like a native
                app and can function offline using cached data. The app
                automatically checks for updates and refreshes when new
                versions are available.
              </Section>
              <Section title="8. Suggestions">
                Users can submit feature suggestions or bug reports through the
                in-app suggestion box. Submissions are visible to the admin
                only. Don&apos;t include personal information in suggestions.
              </Section>
              <Section title="9. Payments">
                The app includes an optional "Support" button that links to
                Cash App. Any payments are processed by Cash App (a third-party
                service) under their own terms. Quote Vault does not process,
                store, or handle any payment information.
              </Section>
              <Section title="10. Changes">
                If these terms change, the updated version will appear here.
                Continued use after changes means you accept them.
              </Section>
            </TabsContent>

            <TabsContent value="privacy" className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">
              <Section title="What we store">
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>
                    <strong>Not signed in:</strong> your quotes and groups are
                    saved only in your own browser (IndexedDB). They never
                    leave your device.
                  </li>
                  <li>
                    <strong>Signed in:</strong> your quotes and groups sync to
                    your Firebase Firestore cloud so you can access them
                    across devices and share groups with others.
                  </li>
                  <li>
                    <strong>Account info:</strong> when you sign in with
                    Google, we see your name, email, and profile picture (via
                    Firebase Authentication) to label your account.
                  </li>
                  <li>
                    <strong>Person profiles:</strong> if you add info about a
                    person (last name, birthday, notes), it&apos;s stored in
                    your cloud account and visible only to you.
                  </li>
                  <li>
                    <strong>Suggestions:</strong> feature ideas or bug reports
                    you submit are stored in the cloud and visible to the admin
                    only.
                  </li>
                  <li>
                    <strong>Voice input:</strong> if you use the microphone
                    button, speech recognition is handled by your browser
                    (Chrome/Edge). Audio is not sent to or stored on our
                    servers.
                  </li>
                </ul>
              </Section>
              <Section title="What we don't do">
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>No ads. No selling data. No data brokers.</li>
                  <li>No third-party analytics or tracking.</li>
                  <li>No reading your quotes for any purpose other than
                    showing them to you and the groups you put them in.</li>
                </ul>
              </Section>
              <Section title="Who can see your quotes">
                Personal quotes are visible only to you. Quotes you add to a
                group are visible to that group&apos;s members — that&apos;s
                the point of groups. Anyone with a group&apos;s invite link or
                QR code can join that group.
                <br /><br />
                <strong>Admin access:</strong> the app admin (the project
                owner) can see all quotes and groups for moderation — to
                respond to reports, fix issues, or remove harmful content. The
                admin is a single identified account, not a team.
              </Section>
              <Section title="Deleting your data">
                Deleting a quote removes it (from your browser, or from the
                cloud when signed in). Clearing your browser data removes all
                local (not-signed-in) quotes. To delete cloud data, delete
                your quotes/groups in the app, or ask for help.
              </Section>
              <Section title="Maintenance mode">
                The admin can temporarily put the app into maintenance mode.
                When this happens, you&apos;ll see a downtime screen instead of
                the app. This is used for fixing bugs or addressing issues.
                Your data is never affected by maintenance mode.
              </Section>
              <Section title="Auto-refresh & caching">
                The app caches files on your device for offline use and faster
                loading. If you haven&apos;t opened the app in 24+ hours, it
                automatically clears the cache and downloads the latest version
                on your next visit.
              </Section>
              <Section title="Where data lives">
                Cloud data is stored in Google Firebase (Firestore), which
                processes it under Google&apos;s privacy policy. Your
                not-signed-in data never leaves your device.
              </Section>
              <Section title="Contact">
                Questions about this policy or the app? Email us at{" "}
                <strong>lpbmusic5426@gmail.com</strong>
              </Section>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
