import { NextResponse } from "next/server";

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asin = (searchParams.get("asin") ?? "UNKNOWN").trim() || "UNKNOWN";
  const brand = (searchParams.get("brand") ?? "Brand").trim() || "Brand";
  const category = (searchParams.get("category") ?? "Category").trim() || "Category";

  const seed = hashString(`${asin}:${brand}:${category}`);
  const hue = seed % 360;
  const hueShift = (hue + 28) % 360;

  const labelBrand = truncate(toTitleCase(brand), 26);
  const labelCategory = truncate(toTitleCase(category), 26);
  const labelAsin = truncate(asin.toUpperCase(), 14);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${escapeSvg(labelBrand)} ${escapeSvg(labelCategory)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue} 82% 60%)" />
      <stop offset="100%" stop-color="hsl(${hueShift} 78% 52%)" />
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
    </linearGradient>
  </defs>

  <rect width="800" height="800" rx="54" fill="url(#bg)" />
  <rect x="26" y="26" width="748" height="748" rx="44" fill="url(#overlay)" />

  <g fill="rgba(255,255,255,0.3)">
    <circle cx="666" cy="138" r="54" />
    <circle cx="726" cy="198" r="24" />
  </g>

  <g fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="10" stroke-linecap="round">
    <path d="M166 582h468" />
    <path d="M206 522c78-68 310-72 390 0" />
  </g>

  <text x="84" y="190" fill="white" font-family="Inter, Helvetica, Arial, sans-serif" font-size="40" font-weight="600" opacity="0.9">${escapeSvg(labelCategory)}</text>
  <text x="84" y="260" fill="white" font-family="Inter, Helvetica, Arial, sans-serif" font-size="66" font-weight="800">${escapeSvg(labelBrand)}</text>
  <text x="84" y="700" fill="rgba(255,255,255,0.86)" font-family="Inter, Helvetica, Arial, sans-serif" font-size="34" font-weight="600">ASIN ${escapeSvg(labelAsin)}</text>
</svg>`.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
