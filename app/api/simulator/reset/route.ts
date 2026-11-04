import { simulatorFetch } from "@/lib/server-api";
import { authorizeCommandCenter, requireSameOriginMutation } from "@/lib/command-auth";

export async function POST(request: Request) {
  const unauthorized = authorizeCommandCenter(request);
  if (unauthorized) return unauthorized;
  const crossOrigin = requireSameOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const response = await simulatorFetch("/api/simulator/reset", {
      method: "POST"
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch {
    return Response.json(
      {
        error: "Simulator unavailable"
      },
      {
        status: 503
      }
    );
  }
}
