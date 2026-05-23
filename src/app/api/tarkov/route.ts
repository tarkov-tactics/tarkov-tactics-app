import { NextRequest, NextResponse } from "next/server";

const TARKOV_DEV_API = "https://api.tarkov.dev/graphql";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(TARKOV_DEV_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `tarkov.dev API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
