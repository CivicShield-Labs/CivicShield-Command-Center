import { timingSafeEqual } from "node:crypto";

const MAX_AUTHORIZATION_HEADER_BYTES = 4096;
const MIN_PASSWORD_BYTES = 32;

function genericResponse(status: number, message: string, challenge = false): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (challenge) {
    headers.set(
      "WWW-Authenticate",
      'Basic realm="CivicShield Command Center", charset="UTF-8"'
    );
  }

  return Response.json({ error: message }, { status, headers });
}

function safeEqual(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  const paddedCandidate = Buffer.alloc(expectedBytes.length);
  candidateBytes.copy(paddedCandidate, 0, 0, expectedBytes.length);
  const sameBytes = timingSafeEqual(paddedCandidate, expectedBytes);

  return candidateBytes.length === expectedBytes.length && sameBytes;
}

function readCredentials(header: string | null): { username: string; password: string } | null {
  if (!header || Buffer.byteLength(header, "utf8") > MAX_AUTHORIZATION_HEADER_BYTES) {
    return null;
  }

  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  if (!match) return null;

  const encoded = match[1];
  if (encoded.length % 4 === 1) return null;

  const bytes = Buffer.from(encoded, "base64");
  const canonical = bytes.toString("base64").replace(/=+$/, "");
  if (canonical !== encoded.replace(/=+$/, "")) return null;

  const decoded = bytes.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(bytes)) return null;

  const separator = decoded.indexOf(":");
  if (separator < 1) return null;

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1)
  };
}

export function authorizeCommandCenter(request: Request): Response | null {
  const username = process.env.CIVICSHIELD_COMMAND_CENTER_USER;
  const password = process.env.CIVICSHIELD_COMMAND_CENTER_PASSWORD;

  if (
    !username ||
    !password ||
    Buffer.byteLength(username, "utf8") > 128 ||
    Buffer.byteLength(password, "utf8") < MIN_PASSWORD_BYTES ||
    Buffer.byteLength(password, "utf8") > 256
  ) {
    return genericResponse(503, "Command Center authentication is not configured");
  }

  const credentials = readCredentials(request.headers.get("authorization"));
  if (
    !credentials ||
    !safeEqual(credentials.username, username) ||
    !safeEqual(credentials.password, password)
  ) {
    return genericResponse(401, "Authentication required", true);
  }

  return null;
}

export function requireSameOriginMutation(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  let expectedOrigin: string;
  const configuredOrigin = process.env.CIVICSHIELD_COMMAND_CENTER_ORIGIN;
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash
      ) {
        return genericResponse(503, "Same-origin protection is not configured correctly");
      }
      expectedOrigin = parsed.origin;
    } catch {
      return genericResponse(503, "Same-origin protection is not configured correctly");
    }
  } else if (process.env.NODE_ENV === "production") {
    return genericResponse(503, "Same-origin protection is not configured");
  } else {
    try {
      const requestUrl = new URL(request.url);
      const host = request.headers.get("host");
      if (!host) return genericResponse(403, "Same-origin request required");
      const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
      const protocol = forwardedProto || requestUrl.protocol.slice(0, -1);
      expectedOrigin = new URL(`${protocol}://${host}`).origin;
    } catch {
      return genericResponse(403, "Same-origin request required");
    }
  }

  if (
    !origin ||
    origin !== expectedOrigin ||
    (fetchSite !== null && fetchSite !== "same-origin")
  ) {
    return genericResponse(403, "Same-origin request required");
  }

  return null;
}
