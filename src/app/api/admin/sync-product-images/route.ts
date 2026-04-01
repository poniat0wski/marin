import { NextResponse } from "next/server";

import { fetchAmazonProductImagesByAsin } from "@/lib/amazon-paapi";
import type { AmazonPaapiConfig } from "@/lib/amazon-paapi";
import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

interface ProductImageRow {
  id: string;
  asin: string;
  image_url: string | null;
  active: boolean;
}

function getAmazonConfigOrError(): { config: AmazonPaapiConfig | null; error: string | null } {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY;
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PAAPI_PARTNER_TAG;
  const host = process.env.AMAZON_PAAPI_HOST ?? "webservices.amazon.com";
  const region = process.env.AMAZON_PAAPI_REGION ?? "us-east-1";
  const marketplace = process.env.AMAZON_PAAPI_MARKETPLACE ?? "www.amazon.com";

  const missing = [
    !accessKey ? "AMAZON_PAAPI_ACCESS_KEY" : null,
    !secretKey ? "AMAZON_PAAPI_SECRET_KEY" : null,
    !partnerTag ? "AMAZON_PAAPI_PARTNER_TAG" : null,
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) {
    return {
      config: null,
      error: `Missing required Amazon PA-API env vars: ${missing.join(", ")}`,
    };
  }

  const config = {
    accessKey: accessKey!,
    secretKey: secretKey!,
    partnerTag: partnerTag!,
    host,
    region,
    marketplace,
  };

  return {
    config,
    error: null,
  };
}

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase auth is not configured. Admin-verified image sync requires Supabase session auth.",
      },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid or expired auth session." }, { status: 401 });
  }

  if (user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      {
        error:
          "Missing SUPABASE_SERVICE_ROLE_KEY. Server-side product updates require service role access.",
      },
      { status: 500 },
    );
  }

  const { config, error: configError } = getAmazonConfigOrError();
  if (!config || configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    onlyMissing?: boolean;
  };

  const parsedLimit =
    typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.trunc(body.limit) : 50;
  const limit = Math.max(1, Math.min(200, parsedLimit));
  const onlyMissing = body.onlyMissing !== false;

  const { data, error } = await serviceClient
    .from("products")
    .select("id, asin, image_url, active")
    .eq("active", true)
    .order("last_updated", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as ProductImageRow[]).filter(
    (row) => row.asin && typeof row.asin === "string",
  );

  const sourceRows = rows
    .filter((row) => {
      if (!onlyMissing) {
        return true;
      }

      return !row.image_url || row.image_url.trim().length === 0;
    })
    .slice(0, limit);

  if (sourceRows.length === 0) {
    return NextResponse.json({
      ok: true,
      message: onlyMissing
        ? "No products with missing image URLs were found."
        : "No active products found to sync.",
      scanned: 0,
      requestedAsins: 0,
      foundImages: 0,
      updatedProducts: [],
      unresolvedAsins: [],
      paapiErrors: [],
    });
  }

  const asins = [...new Set(sourceRows.map((row) => row.asin.trim().toUpperCase()))];
  const paapi = await fetchAmazonProductImagesByAsin({
    asins,
    config,
  });

  const updates = sourceRows
    .map((row) => {
      const normalizedAsin = row.asin.trim().toUpperCase();
      const imageUrl = paapi.imageByAsin.get(normalizedAsin);
      if (!imageUrl) {
        return null;
      }

      const current = row.image_url?.trim() ?? "";
      if (current === imageUrl) {
        return null;
      }

      return {
        id: row.id,
        imageUrl,
      };
    })
    .filter((value): value is { id: string; imageUrl: string } => Boolean(value));

  const nowIso = new Date().toISOString();
  const failedUpdates: Array<{ id: string; message: string }> = [];
  const updatedProducts: Array<{ id: string; imageUrl: string }> = [];

  for (const update of updates) {
    const { error: updateError } = await serviceClient
      .from("products")
      .update({
        image_url: update.imageUrl,
        last_validation: nowIso,
        last_updated: nowIso,
      })
      .eq("id", update.id);

    if (updateError) {
      failedUpdates.push({
        id: update.id,
        message: updateError.message,
      });
      continue;
    }

    updatedProducts.push(update);
  }

  return NextResponse.json({
    ok: true,
    scanned: sourceRows.length,
    requestedAsins: paapi.requestedAsins.length,
    foundImages: paapi.imageByAsin.size,
    updated: updatedProducts.length,
    failedUpdates,
    updatedProducts,
    unresolvedAsins: paapi.unresolvedAsins,
    paapiErrors: paapi.errors,
  });
}
