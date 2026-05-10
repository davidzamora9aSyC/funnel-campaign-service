const PLACEHOLDER_RE = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

export function extractPlaceholders(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    const key = match[1]?.trim();
    if (key) {
      seen.add(key);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function renderTemplateText(
  text: string,
  variables: Record<string, string | number>,
  expectedPlaceholders: string[],
): string {
  for (const placeholder of expectedPlaceholders) {
    const value = variables[placeholder];
    if (value === undefined || value === null) {
      throw new Error(`Missing variable: ${placeholder}`);
    }
  }

  return text.replace(PLACEHOLDER_RE, (_full, keyRaw: string) => {
    const key = String(keyRaw).trim();
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

