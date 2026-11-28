import { rename } from "node:fs/promises";

export interface History {
  readonly initialized: boolean;
  has(link: string): boolean;
  remember(...links: string[]): Promise<void>;
  flush(): Promise<void>;
}

function parseLinks(text: string): string[] | null {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  // Migrate the previous timestamp-based format
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data);

    if (!entries.every(([, time]) => Number.isSafeInteger(time))) return null;

    return entries.sort((a, b) => a[1] - b[1]).map(([link]) => link);
  }

  return Array.isArray(data) && data.every((link) => typeof link === "string")
    ? data
    : null;
}

async function readLinks(file: string) {
  const source = Bun.file(file);

  if (!(await source.exists())) return null;

  const links = parseLinks(await source.text());

  if (links) return links;

  // A damaged file is set aside and the history starts over, which records
  // the current articles without posting them.
  const backup = `${file}.corrupt`;

  await rename(file, backup);
  console.warn(`Invalid history file moved to ${backup}.`);

  return null;
}

export async function openHistory(
  file: string,
  limit = 100,
  key: (link: string) => string = (link) => link,
): Promise<History> {
  const links = await readLinks(file);
  const seen = new Map<string, string>();

  function add(link: string) {
    const id = key(link);

    seen.delete(id);
    seen.set(id, link);
  }

  function trim() {
    for (const id of seen.keys()) {
      if (seen.size <= limit) break;
      seen.delete(id);
    }
  }

  links?.forEach(add);
  trim();

  let initialized = links !== null;
  let dirty = links !== null && seen.size !== links.length;

  async function flush() {
    if (!dirty) return;

    const tempFile = `${file}.tmp`;

    await Bun.write(tempFile, JSON.stringify([...seen.values()], null, 2));
    await rename(tempFile, file);

    dirty = false;
  }

  async function remember(...links: string[]) {
    links.forEach(add);
    trim();

    initialized = true;
    dirty = true;

    await flush();
  }

  return {
    get initialized() {
      return initialized;
    },
    has: (link) => seen.has(key(link)),
    remember,
    flush,
  };
}
