import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../../config/index.js";
import type { ThemeManifest } from "./types.js";

export async function nextThemeManifestDebugId(debugDir: string): Promise<string> {
  const prefixMatch = /^(\d{4})-/;
  let maxId = 0;
  try {
    const files = await readdir(debugDir);
    for (const name of files) {
      const m = name.match(prefixMatch);
      if (m) {
        const n = parseInt(m[1]!, 10);
        if (n > maxId) maxId = n;
      }
    }
  } catch {
    // directory missing or unreadable
  }
  return String(maxId + 1).padStart(4, "0");
}

export function themeSlug(theme: string, maxLen = 30): string {
  return theme
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, maxLen) || "theme";
}

export async function writeThemeManifestDebug(
  manifest: ThemeManifest,
  theme: string,
  outputPath: string
): Promise<void> {
  const debugDir = config.debug.themeManifest;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextThemeManifestDebugId(debugDir);
  const slug = themeSlug(theme);
  const filename = `${debugId}-${slug}-manifest.json`;
  await writeFile(
    join(debugDir, filename),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );
  const logPath = join(debugDir, "theme-manifest-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttheme="${theme}"\toutput=${outputPath}\tfile=${filename}\n`;
  await appendFile(logPath, line);
}
