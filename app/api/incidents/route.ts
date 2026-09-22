import { platformFetch } from "@/lib/server-api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const incidentId = url.searchParams.get("incidentId");

    if (!incidentId) {
      return Response.json([]);
    }

    const response = await platformFetch(
      `/api/incidents/${encodeURIComponent(incidentId)}/events`
    );

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
        error: "Platform unavailable"
      },
      {
        status: 503
      }
    );
  }
}
