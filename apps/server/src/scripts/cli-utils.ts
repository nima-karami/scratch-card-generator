/**
 * Parse argv into a record of --key value pairs.
 * Each token starting with -- followed by a non-- token becomes key (without --) -> value.
 */
export function parseNamedArgs(argv: string[] = process.argv.slice(2)): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i]!.startsWith("--") && argv[i + 1] && !argv[i + 1]!.startsWith("--")) {
      out[argv[i]!.slice(2)] = argv[i + 1]!;
      i++;
    }
  }
  return out;
}
