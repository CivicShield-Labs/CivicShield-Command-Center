import { simulatorFetch } from "@/lib/server-api";
import { authorizeCommandCenter } from "@/lib/command-auth";

export async function GET(request: Request) {
  const unauthorized = authorizeCommandCenter(request);
  if (unauthorized) return unauthorized;

  try {
    const response = await simulatorFetch("/api/simulator/vehicles");

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
