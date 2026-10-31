const simulatorUrl =
  process.env.CIVICSHIELD_SIMULATOR_URL ?? "http://localhost:8081";

const platformUrl =
  process.env.CIVICSHIELD_PLATFORM_URL ?? "http://localhost:8080";

function platformAuthorization(): string | null {
  const username = process.env.CIVICSHIELD_PLATFORM_USER;
  const password = process.env.CIVICSHIELD_PLATFORM_PASSWORD;

  // Never fall back to published default credentials: an unset value must
  // fail closed at the platform boundary instead of authenticating as a
  // well-known user that anyone reading this repository can guess.
  if (!username || !password) return null;

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export async function simulatorFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${simulatorUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

export async function platformFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const authorization = platformAuthorization();

  return fetch(`${platformUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}
