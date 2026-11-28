# GSMArena News Fetcher

Originally developed by [@flandyw](https://github.com/flandyw). Reuploaded and maintained by me after the original repository was removed.

## About

A Discord webhook service that automatically fetches news from GSMArena every 10 minutes and posts new articles to configured Discord channels. Supports multiple search queries and webhooks, with persistent history to prevent duplicate posts.

## How to Use

Requires [Bun](https://bun.sh) 1.2 or later.

1. Install dependencies using `bun install`.
2. Create a Discord webhook through your server settings.
3. Copy `.env.example` to `.env` and put the webhook URL in `DISCORD_WEBHOOK_URL`.
4. Modify `FEEDS` in `config.ts` to configure your news subscriptions:

   ```ts
   export const FEEDS: FeedConfig[] = [
     {
       query: "realme",
       webhookUrl: process.env.DISCORD_WEBHOOK_URL,
       historyFile: "seen-links.json",
       footer: "realme News",
       color: 0xff0000,
     },
   ];
   ```

   Additional subscriptions can be added to the array with their own webhook URLs and history files.

5. Start the service using `bun start` from the project folder. Bun reads `.env` from the folder it is started in.

On the first launch, existing articles are recorded without being posted. Subsequent checks only publish unseen articles, with older history entries automatically removed to limit storage usage.

Failed requests to GSMArena and Discord are retried with backoff, and an article that could not be posted is tried again on the next check. Stop the service with Ctrl+C or `SIGTERM`; it finishes the article it is posting before exiting.

## Development

Run the tests with `bun test` and the type check with `bun run typecheck`.
