import { simulatorFetch } from "@/lib/server-api";

export async function POST() {
  try {
    const response = await simulatorFetch("/api/simulator/start", {
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
