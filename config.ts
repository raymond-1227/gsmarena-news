export interface FeedConfig {
  /** GSMArena news search term. */
  query: string;
  webhookUrl: string | undefined;
  /** Where seen articles are stored, relative to the project folder. */
  historyFile: string;
  footer: string;
  color: number;
}

export const CHECK_INTERVAL = 10 * 60 * 1000;
export const HISTORY_LIMIT = 100;

export const FEEDS: FeedConfig[] = [
  {
    query: "realme",
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    historyFile: "seen-links.json",
    footer: "realme News",
    color: 0xff0000,
  },
];
