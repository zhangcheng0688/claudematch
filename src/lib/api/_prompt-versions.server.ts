// src/lib/api/_prompt-versions.server.ts
// Lightweight A/B prompt-version picker. For now we ship a single v5
// variant; the plumbing (user-hash assignment + version return + feedback
// linkage) lets us add real variants later without touching the routes.

export type PromptKind = "profile" | "match";

const ACTIVE_VERSIONS: Record<PromptKind, string[]> = {
  profile: ["v5"],
  match: ["v5"],
};

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function selectPromptVersion(kind: PromptKind, userId: string): string {
  const versions = ACTIVE_VERSIONS[kind];
  if (versions.length === 1) return versions[0];
  return versions[simpleHash(userId) % versions.length];
}

export function isValidVersion(kind: PromptKind, version: string): boolean {
  return ACTIVE_VERSIONS[kind].includes(version);
}
