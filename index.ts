import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { CHECK_INTERVAL, FEEDS, HISTORY_LIMIT } from "./config.ts";
import { isWebhookUrl } from "./discord.ts";
import { checkFeed, type Feed } from "./feed.ts";
import { articleKey, errorMessage } from "./gsmarena.ts";
import { openHistory } from "./history.ts";

const feeds = await Promise.all(
  FEEDS.map(async ({ historyFile, webhookUrl, ...feed }): Promise<Feed> => {
    if (!isWebhookUrl(webhookUrl)) {
      throw new Error(`Missing or invalid webhook URL for ${feed.query}.`);
    }

    return {
      ...feed,
      webhookUrl,
      history: await openHistory(
        join(import.meta.dir, historyFile),
        HISTORY_LIMIT,
        articleKey,
      ),
    };
  }),
);

const shutdown = new AbortController();

for (const event of ["SIGINT", "SIGTERM"] as const) {
  process.once(event, () => {
    console.log(`${event} received, stopping.`);
    shutdown.abort();
  });
}

console.log("GSMArena News Fetcher started.");

while (!shutdown.signal.aborted) {
  await Promise.all(
    feeds.map((feed) =>
      checkFeed(feed, shutdown.signal).catch((error) => {
        console.error(`[${feed.query}] ${errorMessage(error)}`);
      }),
    ),
  );

  await delay(CHECK_INTERVAL, undefined, { signal: shutdown.signal }).catch(
    () => {},
  );
}
