import { cn } from "@/lib/utils";
import type { ProviderName } from "@/lib/types";

const LOGOS: Record<ProviderName, { src: string; mono?: boolean }> = {
  openai: { src: "/logos/openai.svg", mono: true },
  anthropic: { src: "/logos/anthropic.svg" },
  google: { src: "/logos/gemini.svg" },
  mistral: { src: "/logos/mistral.svg" },
  deepseek: { src: "/logos/deepseek.svg" },
  groq: { src: "/logos/meta.svg" },
};

export function ProviderIcon({
  provider,
  className,
}: {
  provider: ProviderName;
  className?: string;
}) {
  const logo = LOGOS[provider];
  if (logo.mono) {
    return (
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/8",
          className,
        )}
        aria-hidden
      >
        <span
          className="size-4 bg-foreground"
          style={{
            mask: `url(${logo.src}) center / contain no-repeat`,
            WebkitMask: `url(${logo.src}) center / contain no-repeat`,
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white p-0.5 ring-1 ring-black/10",
        className,
      )}
      aria-hidden
    >
      {/* Static brand SVG. next/image does not optimize these marks. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.src} alt="" className="size-full object-contain" />
    </span>
  );
}
