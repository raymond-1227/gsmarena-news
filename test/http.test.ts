import assert from "node:assert/strict";
import { afterEach, mock, spyOn, test } from "bun:test";
import { HttpError, request } from "../http.ts";

afterEach(() => mock.restore());

function stubFetch(...responses: (Response | Error)[]) {
  return spyOn(globalThis, "fetch").mockImplementation((async () => {
    const next = responses.shift();

    if (!next || next instanceof Error) throw next ?? new Error("No response");
    return next;
  }) as unknown as typeof fetch);
}

const retryNow = { "retry-after": "0.001" };

test("retries 5xx and 429", async () => {
  const fetch = stubFetch(
    new Response("", { status: 503, headers: retryNow }),
    new Response("", { status: 429, headers: retryNow }),
    new Response("ok"),
  );

  const response = await request("https://example.com/");

  assert.equal(await response.text(), "ok");
  assert.equal(fetch.mock.calls.length, 3);
});

test("does not retry other 4xx responses", async () => {
  const fetch = stubFetch(new Response("nope", { status: 404 }));

  await assert.rejects(
    request("https://example.com/"),
    (error) => error instanceof HttpError && error.status === 404,
  );
  assert.equal(fetch.mock.calls.length, 1);
});

test("gives up after the retry budget", async () => {
  const fetch = stubFetch(
    new Response("", { status: 500, headers: retryNow }),
    new Response("", { status: 500, headers: retryNow }),
  );

  await assert.rejects(request("https://example.com/", { retries: 1 }), {
    status: 500,
  });
  assert.equal(fetch.mock.calls.length, 2);
});
