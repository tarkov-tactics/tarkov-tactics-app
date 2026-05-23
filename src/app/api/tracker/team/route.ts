import { NextRequest, NextResponse } from "next/server";

const TARKOV_TRACKER_API = "https://api.tarkovtracker.org";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-tracker-token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing TarkovTracker API token" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${TARKOV_TRACKER_API}/team/progress`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") ?? "60";
      return NextResponse.json(
        { error: "Rate limited", retryAfter: parseInt(retryAfter) },
        { status: 429 }
      );
    }

    if (response.status === 403) {
      return NextResponse.json(
        { error: "Missing TP (Team Progress) permission" },
        { status: 403 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `TarkovTracker API error: ${response.status}` },
        { status: response.status }
      );
    }

    const json = await response.json();
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
