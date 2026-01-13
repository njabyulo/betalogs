import type {
  IMetadataRegistryService,
  IMetadataRegistryServiceOptions,
  ICreateMetadataRegistryServiceOptions,
} from "../interfaces";
import type {
  TMetadataRegistryEntry,
  TMetadataType,
} from "@betalogs/shared/types";
import { MetadataType, MetadataPromoteTo } from "@betalogs/shared/constants";
import { createMetadataRegistryRepository } from "../../repositories/metadata-registry";

export class MetadataRegistryService implements IMetadataRegistryService {
  private metadataRegistryRepository: IMetadataRegistryServiceOptions["metadataRegistryRepository"];

  constructor(options: IMetadataRegistryServiceOptions) {
    this.metadataRegistryRepository = options.metadataRegistryRepository;
  }

  async listKeys(tenantId: string): Promise<TMetadataRegistryEntry[]> {
    return await this.metadataRegistryRepository.findByTenantId(tenantId);
  }

  async registerKey(
    tenantId: string,
    key: string,
    type: TMetadataType,
    constraintsJson?: Record<string, unknown>,
    promoteTo?: string
  ): Promise<TMetadataRegistryEntry> {
    let finalPromoteTo: string;
    if (promoteTo) {
      finalPromoteTo = promoteTo;
    } else {
      const typeToPromoteMap: Record<string, string> = {
        [MetadataType.NUMBER]: MetadataPromoteTo.META_NUM,
        [MetadataType.DATE]: MetadataPromoteTo.META_DATE,
        [MetadataType.BOOLEAN]: MetadataPromoteTo.META_BOOL,
        [MetadataType.KEYWORD]: MetadataPromoteTo.META_KW,
        [MetadataType.TEXT]: MetadataPromoteTo.META_TEXT,
      };
      finalPromoteTo = typeToPromoteMap[type];
      if (!finalPromoteTo) {
        throw new Error(`Invalid metadata type: ${type}`);
      }
    }

    const typeToPromoteMap: Record<string, string> = {
      [MetadataType.NUMBER]: MetadataPromoteTo.META_NUM,
      [MetadataType.DATE]: MetadataPromoteTo.META_DATE,
      [MetadataType.BOOLEAN]: MetadataPromoteTo.META_BOOL,
      [MetadataType.KEYWORD]: MetadataPromoteTo.META_KW,
      [MetadataType.TEXT]: MetadataPromoteTo.META_TEXT,
    };
    if (typeToPromoteMap[type] !== finalPromoteTo) {
      throw new Error(
        `promoteTo (${finalPromoteTo}) does not match type (${type}). Expected: ${typeToPromoteMap[type]}`
      );
    }

    const existing = await this.metadataRegistryRepository.findByKey(
      tenantId,
      key
    );
    if (existing) {
      throw new Error(`Metadata key "${key}" already exists for this tenant`);
    }

    return await this.metadataRegistryRepository.create({
      tenantId,
      key,
      type,
      constraintsJson,
      promoteTo: finalPromoteTo as any,
    });
  }

  async deleteKey(tenantId: string, key: string): Promise<void> {
    const existing = await this.metadataRegistryRepository.findByKey(
      tenantId,
      key
    );
    if (!existing) {
      throw new Error(`Metadata key "${key}" not found for this tenant`);
    }

    await this.metadataRegistryRepository.delete(tenantId, key);
  }

  async getRegistryForTenant(
    tenantId: string
  ): Promise<Map<string, TMetadataRegistryEntry>> {
    const entries =
      await this.metadataRegistryRepository.findByTenantId(tenantId);
    const map = new Map<string, TMetadataRegistryEntry>();
    for (const entry of entries) {
      map.set(entry.key, entry);
    }
    return map;
  }
}

export const createMetadataRegistryService = (
  options: ICreateMetadataRegistryServiceOptions
) => {
  const metadataRegistryRepository = createMetadataRegistryRepository({
    db: options.db,
  });
  return new MetadataRegistryService({
    metadataRegistryRepository,
  });
};
