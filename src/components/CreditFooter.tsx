import { Button } from "@/components/ui";

const CHANNEL_URL = "https://www.youtube.com/@KRUN-KID";
const JOIN_URL = "https://www.youtube.com/channel/UCrREEp9fyOoCBiLn3LjW5OA/join";
const DISCORD_URL = "https://discord.gg/qw4NMz8sfC";

export function CreditFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-surface/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="space-y-1">
          <p className="font-display text-base font-semibold text-foreground">
            SpiritCal — a free fan tool for SpiritVale
          </p>
          <p className="text-sm text-muted">
            Made with care by{" "}
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              KRUN-KID
            </a>
            . Formulas by the SpiritVale dev · element art by Brilett.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              ▶ YouTube Channel
            </Button>
          </a>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              ✆ Join our Discord
            </Button>
          </a>
          <a href={JOIN_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm">
              ★ Join Membership
            </Button>
          </a>
        </div>
      </div>
    </footer>
  );
}
