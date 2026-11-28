const USER_AGENT = "gsmarena-news (+https://github.com/flandyw/gsmarena-news)";
const MAX_RETRY_DELAY = 60_000;

export class HttpError extends Error {
  override name = "HttpError";

  constructor(
    readonly status: number,
    url: string | URL,
    body = "",
  ) {
    super(`HTTP ${status}: ${url}${body ? ` (${body.slice(0, 200)})` : ""}`);
  }
}

export interface RequestOptions extends Omit<RequestInit, "signal"> {
  retries?: number;
  timeout?: number;
}

function retryDelay(response: Response | undefined, attempt: number) {
  const retryAfter = Number(response?.headers.get("retry-after"));

  if (retryAfter > 0) return Math.min(retryAfter * 1000, MAX_RETRY_DELAY);

  return 500 * 2 ** attempt * (0.5 + Math.random());
}

const isRetryable = (status: number) => status === 429 || status >= 500;

// fetch with a per-attempt timeout that retries network errors, 429 and 5xx.
export async function request(
  url: string | URL,
  { retries = 2, timeout = 15_000, headers, ...init }: RequestOptions = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let response: Response | undefined;
    let failure: unknown;

    try {
      response = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(timeout),
      });

      if (response.ok) return response;

      failure = new HttpError(
        response.status,
        url,
        await response.text().catch(() => ""),
      );
    } catch (error) {
      failure = error;
    }

    if (attempt >= retries || (response && !isRetryable(response.status))) {
      throw failure;
    }

    await Bun.sleep(retryDelay(response, attempt));
  }
}
