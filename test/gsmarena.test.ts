import assert from "node:assert/strict";
import { test } from "bun:test";
import { articleKey, parseNews } from "../gsmarena.ts";

const item = (href: string, title: string, img = "") => `
<div class="news-item">
  <div class="news-item-media-wrap left"><a href="${href}">${img}</a></div>
  <a href="${href}"><h3>${title}</h3></a>
</div>`;

test("parses articles oldest first with absolute links", () => {
  const articles = parseNews(
    item(
      "new-news-2.php#c",
      "New",
      '<img src="https://fdn.gsmarena.com/b.jpg">',
    ) +
      item("old-news-1.php", " Old ") +
      item("https://evil.example/x-news-3.php", "Offsite") +
      item("untitled-news-4.php", ""),
  );

  assert.deepEqual(articles, [
    {
      title: "Old",
      link: "https://www.gsmarena.com/old-news-1.php",
      thumbnail: null,
    },
    {
      title: "New",
      link: "https://www.gsmarena.com/new-news-2.php",
      thumbnail: "https://fdn.gsmarena.com/b.jpg",
    },
  ]);
});

test("article key survives a renamed slug", () => {
  assert.equal(
    articleKey("https://www.gsmarena.com/a_b-news-75392.php"),
    articleKey("https://www.gsmarena.com/c_d_e-news-75392.php"),
  );
  assert.equal(articleKey("https://x/other.php"), "https://x/other.php");
});
