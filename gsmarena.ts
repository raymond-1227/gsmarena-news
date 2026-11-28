import { load } from "cheerio";
import { request } from "./http.ts";

export interface Article {
  title: string;
  link: string;
  thumbnail: string | null;
}

const BASE_URL = "https://www.gsmarena.com/";

function httpUrl(value: string | undefined, base: string) {
  if (!value || !URL.canParse(value, base)) return null;

  const url = new URL(value, base);

  return ["https:", "http:"].includes(url.protocol) ? url : null;
}

// GSMArena renames article slugs when a headline is edited; the numeric ID is stable.
export function articleKey(link: string) {
  return link.match(/-news-(\d+)\.php/)?.[1] ?? link;
}

export function parseNews(html: string): Article[] {
  const $ = load(html);
  const articles: Article[] = [];

  for (const element of $(".news-item")) {
    const item = $(element);
    const title = item.find("h3").first().text().trim();
    const link = httpUrl(item.find("a[href]").first().attr("href"), BASE_URL);

    if (!title || !link || link.origin !== new URL(BASE_URL).origin) continue;

    link.hash = "";

    const thumbnail = httpUrl(
      item.find("img[src]").first().attr("src"),
      link.href,
    );

    articles.push({
      title,
      link: link.href,
      thumbnail: thumbnail?.href ?? null,
    });
  }

  return articles.reverse();
}

export async function fetchNews(query: string) {
  const url = new URL("news.php3", BASE_URL);
  url.searchParams.set("sSearch", query);

  const response = await request(url);
  const articles = parseNews(await response.text());

  if (!articles.length) {
    throw new Error(`No news found for "${query}".`);
  }

  return articles;
}

export async function getPreviewImage(url: string) {
  try {
    const response = await request(url);
    const $ = load(await response.text());

    return (
      httpUrl($('meta[property="og:image"]').attr("content"), url)?.href ?? null
    );
  } catch (error) {
    console.warn(`Preview unavailable: ${errorMessage(error)}`);
    return null;
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
