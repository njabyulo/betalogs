import { z } from "zod";
import { MetadataType, MetadataPromoteTo } from "@betalogs/shared/constants";

export const SMetadataType = z.enum([
  MetadataType.NUMBER,
  MetadataType.DATE,
  MetadataType.BOOLEAN,
  MetadataType.KEYWORD,
  MetadataType.TEXT,
] as [string, ...string[]]);

export const SMetadataPromoteTo = z.enum([
  MetadataPromoteTo.META_NUM,
  MetadataPromoteTo.META_DATE,
  MetadataPromoteTo.META_BOOL,
  MetadataPromoteTo.META_KW,
  MetadataPromoteTo.META_TEXT,
] as [string, ...string[]]);

export const SCreateMetadataRegistryEntry = z
  .object({
    tenantId: z.uuid(),
    key: z.string().min(1, {
      message: "key must be a non-empty string",
    }),
    type: SMetadataType,
    constraintsJson: z.record(z.string(), z.unknown()).optional(),
    promoteTo: SMetadataPromoteTo,
  })
  .refine(
    (data) => {
      // Validate that promoteTo matches type
      const typeToPromoteMap: Record<string, string> = {
        [MetadataType.NUMBER]: MetadataPromoteTo.META_NUM,
        [MetadataType.DATE]: MetadataPromoteTo.META_DATE,
        [MetadataType.BOOLEAN]: MetadataPromoteTo.META_BOOL,
        [MetadataType.KEYWORD]: MetadataPromoteTo.META_KW,
        [MetadataType.TEXT]: MetadataPromoteTo.META_TEXT,
      };
      return typeToPromoteMap[data.type] === data.promoteTo;
    },
    {
      message:
        "promoteTo must match the type (number->meta_num, date->meta_date, boolean->meta_bool, keyword->meta_kw, text->meta_text)",
    }
  )
  .strict();

export const SMetadataRegistryEntry = z
  .object({
    tenantId: z.uuid(),
    key: z.string().min(1),
    type: SMetadataType,
    constraintsJson: z.record(z.string(), z.unknown()).nullable().optional(),
    promoteTo: SMetadataPromoteTo,
    createdAt: z.date(),
  })
  .strict();

export type TMetadataType = z.infer<typeof SMetadataType>;
export type TMetadataPromoteTo = z.infer<typeof SMetadataPromoteTo>;
export type TCreateMetadataRegistryEntry = z.infer<
  typeof SCreateMetadataRegistryEntry
>;
export type TMetadataRegistryEntry = z.infer<typeof SMetadataRegistryEntry>;

export function validateCreateMetadataRegistryEntry(
  data: unknown
): TCreateMetadataRegistryEntry {
  return SCreateMetadataRegistryEntry.parse(data);
}

export function safeValidateCreateMetadataRegistryEntry(
  data: unknown
):
  | { success: true; data: TCreateMetadataRegistryEntry }
  | { success: false; error: z.ZodError } {
  const result = SCreateMetadataRegistryEntry.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
