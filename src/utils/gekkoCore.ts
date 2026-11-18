export interface BuildChatEntry {
  username: string;
  question: string;
  response: string;
}

export function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSafeHttpsUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username.trim());
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function deterministicDmId(uidA: string, uidB: string): string {
  const pair = [uidA.trim(), uidB.trim()].sort();
  return `dm_${pair[0]}_${pair[1]}`;
}

export const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
export const CALL_RING_MAX_AGE_MS = 60 * 1000;
export const CALL_NO_ANSWER_TIMEOUT_MS = 45 * 1000;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isImageExpired(createdAt: number, now = Date.now()): boolean {
  if (!Number.isFinite(createdAt)) return false;
  return now - createdAt > TEN_DAYS_MS;
}

export function isRingCallStale(createdAt: number, now = Date.now()): boolean {
  if (!Number.isFinite(createdAt)) return true;
  return now - createdAt > CALL_RING_MAX_AGE_MS;
}

export function isFileSizeAllowed(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= MAX_UPLOAD_BYTES;
}

export function parseBuildChatsTxt(raw: string, currentUsername?: string): BuildChatEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let entries: BuildChatEntry[] = [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        entries = parsed
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            username: String(item.username ?? '').trim(),
            question: String(item.question ?? '').trim(),
            response: String(item.response ?? '').trim(),
          }))
          .filter((item) => item.username && item.question);
      }
    } catch {
      entries = [];
    }
  } else {
    entries = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        return {
          username: parts[0] || '',
          question: parts[1] || '',
          response: parts.slice(2).join(' | ').trim(),
        };
      })
      .filter((item) => item.username && item.question);
  }
  if (currentUsername) {
    const target = normalizeUsername(currentUsername);
    return entries.filter((e) => normalizeUsername(e.username) === target);
  }
  return entries;
}
