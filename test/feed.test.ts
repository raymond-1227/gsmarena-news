import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, mock, spyOn, test } from "bun:test";
import type { Embed } from "../discord.ts";
import { checkFeed, type Feed } from "../feed.ts";
import { articleKey } from "../gsmarena.ts";
import { openHistory } from "../history.ts";

afterEach(() => mock.restore());

const WEBHOOK = "https://discord.com/api/webhooks/1/token";
const listing = (...ids: number[]) =>
  ids
    .map(
      (id) => `<div class="news-item">
        <a href="a-news-${id}.php"><img src="https://fdn.gsmarena.com/t${id}.jpg"></a>
        <a href="a-news-${id}.php"><h3>Article ${id}</h3></a></div>`,
    )
    .join("");

async function setup(
  pages: string[],
  discordStatus: (embed: Embed) => number = () => 204,
) {
  const posts: Embed[] = [];

  spyOn(console, "log").mockImplementation(() => {});
  spyOn(console, "error").mockImplementation(() => {});
  spyOn(console, "warn").mockImplementation(() => {});
  spyOn(globalThis, "fetch").mockImplementation((async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);

    if (url === WEBHOOK) {
      const embed = JSON.parse(String(init?.body)).embeds[0] as Embed;
      const status = discordStatus(embed);

      if (status < 300) posts.push(embed);
      return new Response(null, { status });
    }

    if (url.includes("news.php3")) return new Response(pages.shift());

    return new Response(
      url.includes("-news-3.php")
        ? ""
        : '<meta property="og:image" content="https://fdn.gsmarena.com/og.jpg">',
    );
  }) as typeof fetch);

  const dir = await mkdtemp(join(tmpdir(), "feed-"));
  const feed: Feed = {
    query: "realme",
    webhookUrl: WEBHOOK,
    footer: "realme News",
    color: 0xff0000,
    history: await openHistory(join(dir, "seen.json"), 100, articleKey),
  };

  return { feed, posts };
}

test("first run records articles without posting", async () => {
  const { feed, posts } = await setup([listing(2, 1), listing(2, 1)]);

  await checkFeed(feed);
  await checkFeed(feed);

  assert.equal(posts.length, 0);
});

test("posts only unseen articles, oldest first", async () => {
  const { feed, posts } = await setup([listing(1), listing(3, 2, 1)]);

  await checkFeed(feed);
  await checkFeed(feed);

  assert.deepEqual(
    posts.map(({ title, url, image }) => [title, url, image?.url]),
    [
      [
        "Article 2",
        "https://www.gsmarena.com/a-news-2.php",
        "https://fdn.gsmarena.com/og.jpg",
      ],
      [
        "Article 3",
        "https://www.gsmarena.com/a-news-3.php",
        "https://fdn.gsmarena.com/t3.jpg",
      ],
    ],
  );
});

test("an embed Discord rejects does not block later articles", async () => {
  const { feed, posts } = await setup(
    [listing(1), listing(3, 2, 1), listing(3, 2, 1)],
    (embed) => (embed.title === "Article 2" ? 400 : 204),
  );

  await checkFeed(feed);
  await checkFeed(feed);
  await checkFeed(feed);

  assert.deepEqual(
    posts.map(({ title }) => title),
    ["Article 3"],
  );
});

test("a failed send is retried on the next check", async () => {
  let fail = true;
  const { feed, posts } = await setup(
    [listing(1), listing(2, 1), listing(2, 1)],
    () => (fail ? 404 : 204),
  );

  await checkFeed(feed);
  await assert.rejects(checkFeed(feed), { status: 404 });

  fail = false;
  await checkFeed(feed);

  assert.deepEqual(
    posts.map(({ title }) => title),
    ["Article 2"],
  );
});
