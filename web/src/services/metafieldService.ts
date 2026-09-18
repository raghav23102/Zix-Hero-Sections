// ============================================================
// Service — Shopify Metafield Sync
// Writes hero section configuration to a shop-level metafield
// so the theme app extension block can read it via Liquid:
//   shop.metafields.zix_hero['section_{id}'].value
// ============================================================

const API_VERSION = "2026-07";

interface MetafieldRecord {
  id: number;
  namespace: string;
  key: string;
}

interface MetafieldListResponse {
  metafields: MetafieldRecord[];
}

/**
 * Upserts a shop-level metafield containing the full section config JSON.
 * Soft-fails with a console.warn so a metafield write failure never crashes
 * the section save operation.
 */
export async function syncSectionMetafield(
  shopDomain: string,
  accessToken: string,
  sectionId: string,
  config: Record<string, unknown>
): Promise<void> {
  try {
    const base = `https://${shopDomain}/admin/api/${API_VERSION}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    };
    const key = `section_${sectionId}`;
    const value = JSON.stringify(config);

    // ---- 1. Check if metafield already exists ----
    const searchRes = await fetch(
      `${base}/metafields.json?namespace=zix_hero&key=${key}&metafield[owner_resource]=shop`,
      { headers }
    );

    if (!searchRes.ok) {
      console.warn(
        `[MetafieldService] Failed to search metafield for section ${sectionId}: ${searchRes.status}`
      );
      return;
    }

    const { metafields } = (await searchRes.json()) as MetafieldListResponse;
    const existing = metafields?.[0];

    // ---- 2. Update or create ----
    if (existing) {
      const putRes = await fetch(`${base}/metafields/${existing.id}.json`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          metafield: { id: existing.id, value, type: "json" },
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.text();
        console.warn(`[MetafieldService] PUT failed for section ${sectionId}: ${err}`);
      }
    } else {
      const postRes = await fetch(`${base}/metafields.json`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          metafield: {
            namespace: "zix_hero",
            key,
            value,
            type: "json",
          },
        }),
      });
      if (!postRes.ok) {
        const err = await postRes.text();
        console.warn(`[MetafieldService] POST failed for section ${sectionId}: ${err}`);
      }
    }
  } catch (err) {
    // Never crash the save operation because of a metafield sync failure
    console.warn(`[MetafieldService] Unexpected error for section ${sectionId}:`, err);
  }
}

/**
 * Deletes the metafield for a section when it is deleted from the app.
 */
export async function deleteSectionMetafield(
  shopDomain: string,
  accessToken: string,
  sectionId: string
): Promise<void> {
  try {
    const base = `https://${shopDomain}/admin/api/${API_VERSION}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    };
    const key = `section_${sectionId}`;

    const searchRes = await fetch(
      `${base}/metafields.json?namespace=zix_hero&key=${key}&metafield[owner_resource]=shop`,
      { headers }
    );
    if (!searchRes.ok) return;

    const { metafields } = (await searchRes.json()) as MetafieldListResponse;
    const existing = metafields?.[0];
    if (!existing) return;

    await fetch(`${base}/metafields/${existing.id}.json`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.warn(`[MetafieldService] Delete error for section ${sectionId}:`, err);
  }
}
