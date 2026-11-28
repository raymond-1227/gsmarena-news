import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "bun:test";
import { openHistory } from "../history.ts";

const tempFile = async () =>
  join(await mkdtemp(join(tmpdir(), "history-")), "seen.json");
const read = async (file: string) => JSON.parse(await readFile(file, "utf8"));

test("starts uninitialized, persists and trims to the limit", async () => {
  const file = await tempFile();
  const history = await openHistory(file, 2);

  assert.equal(history.initialized, false);

  await history.remember("a", "b", "c");

  assert.equal(history.initialized, true);
  assert.equal(history.has("a"), false);
  assert.deepEqual(await read(file), ["b", "c"]);
  assert.equal((await openHistory(file, 2)).has("c"), true);
});

test("matches by key", async () => {
  const history = await openHistory(await tempFile(), 10, (link) =>
    link.slice(-1),
  );

  await history.remember("old-slug-1");

  assert.equal(history.has("new-slug-1"), true);
  assert.equal(history.has("new-slug-2"), false);
});

test("migrates the timestamp format", async () => {
  const file = await tempFile();

  await writeFile(file, JSON.stringify({ b: 2, a: 1 }));
  const history = await openHistory(file, 10);
  await history.remember("c");

  assert.deepEqual(await read(file), ["a", "b", "c"]);
});

test("sets a corrupt file aside instead of crashing", async () => {
  const file = await tempFile();

  await writeFile(file, '["a", ');
  const history = await openHistory(file, 10);

  assert.equal(history.initialized, false);
  assert.equal(await readFile(`${file}.corrupt`, "utf8"), '["a", ');
});
