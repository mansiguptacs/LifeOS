import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GeocodeResult = { label: string; lat: number; lng: number };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json([] as GeocodeResult[]);
  }

  // Bias results toward the San Jose / Santa Clara demo area.
  const viewbox = "-122.05,37.45,-121.80,37.28";
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=6` +
    `&q=${encodeURIComponent(q)}&viewbox=${viewbox}&bounded=0`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AccessMapAI/1.0 (hackathon demo)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    const results: GeocodeResult[] = data.map((d) => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([] as GeocodeResult[]);
  }
}
