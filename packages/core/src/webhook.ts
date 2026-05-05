export type ProviderHeaders = Record<string, string | string[] | undefined>;

export function getHeader(headers: ProviderHeaders, name: string): string | undefined {
  const target = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== target) {
      continue;
    }

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  return undefined;
}

export function normalizeHeaders(headers: Headers | ProviderHeaders): ProviderHeaders {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return headers;
}
