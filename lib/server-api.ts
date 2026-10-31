const simulatorUrl =
  process.env.CIVICSHIELD_SIMULATOR_URL ?? "http://localhost:8081";

const platformUrl =
  process.env.CIVICSHIELD_PLATFORM_URL ?? "http://localhost:8080";

function platformAuthorization(): string {
  const username =
    process.env.CIVICSHIELD_PLATFORM_USER ?? "civicshield";

  const password =
    process.env.CIVICSHIELD_PLATFORM_PASSWORD ??
    "change-this-before-any-deployment";

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
  return fetch(`${platformUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: platformAuthorization(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}
