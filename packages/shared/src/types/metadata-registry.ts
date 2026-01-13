import {
  MetadataType,
  MetadataPromoteTo,
} from "../constants/metadata-registry";

export type TMetadataType = (typeof MetadataType)[keyof typeof MetadataType];

export type TMetadataPromoteTo =
  (typeof MetadataPromoteTo)[keyof typeof MetadataPromoteTo];

export interface TMetadataRegistryEntry {
  tenantId: string;
  key: string;
  type: TMetadataType;
  constraintsJson?: Record<string, unknown> | null;
  promoteTo: TMetadataPromoteTo;
  createdAt: Date;
}

export interface TCreateMetadataRegistryEntry {
  tenantId: string;
  key: string;
  type: TMetadataType;
  constraintsJson?: Record<string, unknown>;
  promoteTo: TMetadataPromoteTo;
}
