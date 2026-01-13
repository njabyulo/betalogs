import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getMetadataRegistryService } from "../compose";
import { SMetadataType, SMetadataPromoteTo } from "@betalogs/core/domain";

const metadataRegistry = new Hono();

// Request body schema for POST /v1/metadata/keys
const SCreateMetadataKeyRequest = z.object({
  key: z.string().min(1, { message: "key must be a non-empty string" }),
  type: SMetadataType,
  constraintsJson: z.record(z.string(), z.unknown()).optional(),
  promoteTo: SMetadataPromoteTo.optional(),
});

// GET /v1/metadata/keys
metadataRegistry.get("/v1/metadata/keys", async (c) => {
  try {
    // TODO: Extract tenantId from auth context
    // For now, using a placeholder - this should come from JWT token or session
    const tenantId = c.req.query("tenantId") || c.req.header("x-tenant-id");
    if (!tenantId) {
      return c.json({ error: "tenantId is required" }, 400);
    }

    const metadataRegistryService = getMetadataRegistryService();
    const keys = await metadataRegistryService.listKeys(tenantId);

    return c.json(keys, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// POST /v1/metadata/keys
metadataRegistry.post(
  "/v1/metadata/keys",
  zValidator("json", SCreateMetadataKeyRequest),
  async (c) => {
    try {
      // TODO: Extract tenantId from auth context
      const tenantId = c.req.query("tenantId") || c.req.header("x-tenant-id");
      if (!tenantId) {
        return c.json({ error: "tenantId is required" }, 400);
      }

      const body = c.req.valid("json");
      const metadataRegistryService = getMetadataRegistryService();

      const entry = await metadataRegistryService.registerKey(
        tenantId,
        body.key,
        body.type,
        body.constraintsJson,
        body.promoteTo
      );

      return c.json(entry, 201);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already exists")) {
        return c.json({ error: errorMessage }, 409);
      }
      if (errorMessage.includes("does not match")) {
        return c.json({ error: errorMessage }, 400);
      }
      return c.json({ error: errorMessage }, 500);
    }
  }
);

// DELETE /v1/metadata/keys/:key
metadataRegistry.delete("/v1/metadata/keys/:key", async (c) => {
  try {
    // TODO: Extract tenantId from auth context
    const tenantId = c.req.query("tenantId") || c.req.header("x-tenant-id");
    if (!tenantId) {
      return c.json({ error: "tenantId is required" }, 400);
    }

    const key = c.req.param("key");
    if (!key) {
      return c.json({ error: "key parameter is required" }, 400);
    }

    const metadataRegistryService = getMetadataRegistryService();
    await metadataRegistryService.deleteKey(tenantId, key);

    return c.body(null, 204);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found")) {
      return c.json({ error: errorMessage }, 404);
    }
    return c.json({ error: errorMessage }, 500);
  }
});

export default metadataRegistry;
