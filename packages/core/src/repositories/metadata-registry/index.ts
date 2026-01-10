import { eq, and } from 'drizzle-orm'
import { metadataRegistry } from '@betalogs/database/schema'
import type {
  IMetadataRegistryRepository,
  IMetadataRegistryRepositoryOptions,
  ICreateMetadataRegistryRepositoryOptions,
} from '../interfaces'
import type {
  TMetadataRegistryEntry,
  TCreateMetadataRegistryEntry,
} from '@betalogs/shared/types'

export class MetadataRegistryRepository implements IMetadataRegistryRepository {
  private db: IMetadataRegistryRepositoryOptions['db']

  constructor(options: IMetadataRegistryRepositoryOptions) {
    this.db = options.db
  }

  async findByTenantId(tenantId: string): Promise<TMetadataRegistryEntry[]> {
    const results = await this.db
      .select()
      .from(metadataRegistry)
      .where(eq(metadataRegistry.tenantId, tenantId))

    return results.map((row) => ({
      tenantId: row.tenantId,
      key: row.key,
      type: row.type,
      constraintsJson: row.constraintsJson ?? null,
      promoteTo: row.promoteTo,
      createdAt: row.createdAt,
    }))
  }

  async findByKey(
    tenantId: string,
    key: string
  ): Promise<TMetadataRegistryEntry | null> {
    const results = await this.db
      .select()
      .from(metadataRegistry)
      .where(
        and(
          eq(metadataRegistry.tenantId, tenantId),
          eq(metadataRegistry.key, key)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    const row = results[0]!
    return {
      tenantId: row.tenantId,
      key: row.key,
      type: row.type,
      constraintsJson: row.constraintsJson ?? null,
      promoteTo: row.promoteTo,
      createdAt: row.createdAt,
    }
  }

  async create(
    entry: TCreateMetadataRegistryEntry
  ): Promise<TMetadataRegistryEntry> {
    const results = await this.db
      .insert(metadataRegistry)
      .values({
        tenantId: entry.tenantId,
        key: entry.key,
        type: entry.type,
        constraintsJson: entry.constraintsJson ?? null,
        promoteTo: entry.promoteTo,
      })
      .returning()

    const row = results[0]!
    return {
      tenantId: row.tenantId,
      key: row.key,
      type: row.type,
      constraintsJson: row.constraintsJson ?? null,
      promoteTo: row.promoteTo,
      createdAt: row.createdAt,
    }
  }

  async delete(tenantId: string, key: string): Promise<void> {
    await this.db
      .delete(metadataRegistry)
      .where(
        and(
          eq(metadataRegistry.tenantId, tenantId),
          eq(metadataRegistry.key, key)
        )
      )
  }
}

export const createMetadataRegistryRepository = (
  options: ICreateMetadataRegistryRepositoryOptions
) => {
  return new MetadataRegistryRepository({
    db: options.db,
  })
}
