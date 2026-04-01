import { NextResponse } from "next/server";

import { mockProducts } from "@/lib/mock-data";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const incoming = request.headers.get("x-cron-secret");

  if (secret && incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      refreshedAt: new Date().toISOString(),
      mode: "mock",
      stats: {
        new: mockProducts.filter((product) => product.updateType === "new").length,
        updated: mockProducts.filter((product) => product.updateType === "updated").length,
        removed: mockProducts.filter((product) => product.updateType === "removed").length,
      },
    });
  }

  const refreshedAt = new Date().toISOString();

  const { error } = await supabase
    .from("products")
    .update({ last_updated: refreshedAt })
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    refreshedAt,
    mode: "supabase",
    message: "Daily refresh timestamp updated for active products.",
  });
}
