import "server-only";

import { createHash, createHmac } from "crypto";

const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
const PATH = "/paapi5/getitems";
const BATCH_SIZE = 10;

export interface AmazonPaapiConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  host: string;
  region: string;
  marketplace: string;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function getTimestamps(now = new Date()) {
  const compact = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const amzDate = `${compact.slice(0, 15)}Z`;
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

function signRequest({
  config,
  body,
  amzDate,
  dateStamp,
}: {
  config: AmazonPaapiConfig;
  body: string;
  amzDate: string;
  dateStamp: string;
}) {
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${config.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`;

  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest =
    `POST\n${PATH}\n\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n${sha256(body)}`;

  const scope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;

  const kDate = hmac(`AWS4${config.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  return `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

export async function fetchAmazonProductImagesByAsin({
  asins,
  config,
}: {
  asins: string[];
  config: AmazonPaapiConfig;
}) {
  const requestedAsins = [...new Set(asins.map((asin) => asin.trim().toUpperCase()).filter(Boolean))];
  const imageByAsin = new Map<string, string>();
  const unresolvedAsins = new Set<string>(requestedAsins);
  const errors: string[] = [];

  for (const batch of chunk(requestedAsins, BATCH_SIZE)) {
    const body = JSON.stringify({
      ItemIds: batch,
      PartnerTag: config.partnerTag,
      PartnerType: "Associates",
      Marketplace: config.marketplace,
      Resources: ["Images.Primary.Large", "Images.Primary.Medium", "Images.Primary.Small"],
    });

    const { amzDate, dateStamp } = getTimestamps();
    const authorization = signRequest({
      config,
      body,
      amzDate,
      dateStamp,
    });

    const response = await fetch(`https://${config.host}${PATH}`, {
      method: "POST",
      headers: {
        "content-encoding": "amz-1.0",
        "content-type": "application/json; charset=utf-8",
        host: config.host,
        "x-amz-date": amzDate,
        "x-amz-target": TARGET,
        authorization,
      },
      body,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          Errors?: Array<{ Code?: string; Message?: string }>;
          ItemsResult?: {
            Items?: Array<{
              ASIN?: string;
              Images?: {
                Primary?: {
                  Large?: { URL?: string };
                  Medium?: { URL?: string };
                  Small?: { URL?: string };
                };
              };
            }>;
          };
        }
      | null;

    if (!response.ok) {
      if (payload?.Errors?.length) {
        for (const error of payload.Errors) {
          errors.push(`${error.Code ?? "Error"}: ${error.Message ?? "Unknown error"}`);
        }
      } else {
        errors.push(`PA-API request failed with status ${response.status}.`);
      }
      continue;
    }

    for (const item of payload?.ItemsResult?.Items ?? []) {
      const asin = item.ASIN?.trim().toUpperCase();
      if (!asin) {
        continue;
      }

      const imageUrl =
        item.Images?.Primary?.Large?.URL ??
        item.Images?.Primary?.Medium?.URL ??
        item.Images?.Primary?.Small?.URL;

      if (!imageUrl) {
        continue;
      }

      imageByAsin.set(asin, imageUrl);
      unresolvedAsins.delete(asin);
    }
  }

  return {
    imageByAsin,
    unresolvedAsins: [...unresolvedAsins],
    errors,
    requestedAsins,
  };
}
