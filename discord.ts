import { request } from "./http.ts";

export interface Embed {
  title: string;
  url: string;
  color: number;
  timestamp: string;
  footer: { text: string };
  image?: { url: string };
}

const WEBHOOK_PATTERN =
  /^https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function isWebhookUrl(url: unknown): url is string {
  return typeof url === "string" && WEBHOOK_PATTERN.test(url);
}

export async function sendEmbed(webhookUrl: string, embed: Embed) {
  await request(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
    retries: 3,
  });
}
