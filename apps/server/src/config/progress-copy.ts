import type { SSEEvent } from "@repo/shared";

type RuleContext = {
  attempt?: number;
  max?: number;
  kind?: string;
  index?: number;
  total?: number;
};

function parseDesignAttemptFromMessage(message: string): RuleContext | undefined {
  // Expected messages we generate from backend:
  // - "Designing your theme (meta) — attempt 2/3"
  // - "Designing your theme (elements) — attempt 1/3"
  const m = message.match(/attempt\s+(\d+)\/(\d+)/i);
  if (!m) return undefined;
  return { attempt: Number(m[1]), max: Number(m[2]) };
}

function parseSpritesheetAttemptFromMessage(message: string): RuleContext | undefined {
  // Expected messages we generate from backend:
  // - "Spritesheet QA: attempt 2/4 (generating)"
  const m = message.match(/attempt\s+(\d+)\/(\d+)/i);
  if (!m) return undefined;
  return { attempt: Number(m[1]), max: Number(m[2]) };
}

/**
 * Translate SSEEvent into a more fun, human-friendly message.
 *
 * This is intentionally message-pattern based (not type-only) so we can keep
 * templates stable even when we evolve backend wording.
 */
export function translateSSEEventCopy(event: SSEEvent): SSEEvent {
  // Helper: clone minimal fields while overriding message when present/meaningful.
  const withMessage = (message: string): SSEEvent => {
    // `SSEEvent` is a union; only some variants have `message`.
    return { ...event, message } as SSEEvent;
  };

  // asset-ready is special: we want to attach a fun message even if backend didn't send one.
  if (event.type === "asset-ready") {
    const kind = event.kind;
    const messageByKind: Partial<Record<string, string>> = {
      titleImage: "Bam! Title artwork is on deck.",
      winMessageImage: "Pop! The “You Won!” header is ready.",
      spritesheet: "Cracking open the cover-spritesheets…",
      particles: "Sprinkle squad assembled (particles).",
      backgroundImage: "Painting the backdrop…",
      backgroundVideo: "Rolling the background loop…",
      backgroundMusic: "Audio loaded. Let’s make it feel alive.",
      revealSound: "Reveal sfx armed. One scratch away.",
      glyphSheet: "Digit glyphs are stamped and styled.",
    };

    return withMessage(messageByKind[kind] ?? `Fresh asset dropped: ${kind}.`);
  }

  // Designing (meta/elements/moodboard)
  if (event.type === "designing") {
    const raw = event.message ?? "";
    const attemptCtx = parseDesignAttemptFromMessage(raw);

    if (/moodboard/i.test(raw)) {
      return withMessage("Moodboard vibes are forming… (panels at the ready)");
    }
    if (attemptCtx) {
      return withMessage(
        `Hold up — we’re iterating the vibe (attempt ${attemptCtx.attempt}/${attemptCtx.max}).`,
      );
    }
    return withMessage(event.message ?? "Designing your theme…");
  }

  // Generating assets
  if (
    event.type === "generating-particles" ||
    event.type === "generating-title" ||
    event.type === "generating-container" ||
    event.type === "generating-glyph-sheet" ||
    event.type === "generating-bgm" ||
    event.type === "generating-reveal-sound" ||
    event.type === "generating-video-image" ||
    event.type === "generating-video"
  ) {
    const raw = event.message ?? "";
    if (event.type === "generating-reveal-sound") return withMessage("Sharpening that reveal sound…");
    if (event.type === "generating-bgm") return withMessage("Warming up the background music…");
    if (event.type === "generating-glyph-sheet") return withMessage("Etching the number glyph sheet…");

    // Fall back to a slightly more playful wrapper for any other generated asset step.
    if (raw.trim()) return withMessage(`Getting it ready: ${raw}`);
    return withMessage("Building assets…");
  }

  // Spritesheet QA loop (we stream a lot of messages during QA retries)
  if (event.type === "generating-spritesheet") {
    const raw = event.message ?? "";
    const ctx = parseSpritesheetAttemptFromMessage(raw);

    if (/Algorithmic QA failed/i.test(raw)) {
      return withMessage(`Oops — that one didn’t pass the quick checks. Fixing it (attempt ${ctx?.attempt ?? "?"}).`);
    }
    if (/LLM QA failed/i.test(raw)) {
      return withMessage(`LLM spotted something off. Time for a glow-up (attempt ${ctx?.attempt ?? "?"}).`);
    }
    if (/max retries hit/i.test(raw) || /selecting best attempt/i.test(raw)) {
      return withMessage("No worries — picking the best-looking version and moving on.");
    }
    if (/extracting transparency|alpha/i.test(raw)) {
      return withMessage("Making it transparent where it should be…");
    }
    if (/passed/i.test(raw)) {
      return withMessage(ctx ? `Nice. Spritesheet passes QA (attempt ${ctx.attempt}/${ctx.max}).` : "Spritesheet passed QA.");
    }

    if (ctx) {
      return withMessage(`Spritesheet QA: attempt ${ctx.attempt}/${ctx.max}… stay tuned.`);
    }

    return withMessage(raw.trim() ? raw : "Working on spritesheet…");
  }

  // Composing final card
  if (event.type === "composing") {
    return withMessage(event.message ? `Almost there. ${event.message}` : "Composing your card…");
  }

  // text-ready
  if (event.type === "text-ready") {
    return withMessage("Copy locked in. Title is set!");
  }

  // error
  if (event.type === "error") {
    return withMessage(`Uh oh: ${event.message}`);
  }

  // complete is fine as-is
  return event;
}

