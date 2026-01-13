/**
 * Composition Root
 *
 * Wires all dependencies and provides configured services.
 * Handlers should use services from here instead of importing DB clients directly.
 */

import { db } from "@betalogs/database/connection";
import { createMetadataRegistryService } from "@betalogs/core/services";

/**
 * Get configured metadata registry service
 */
export function getMetadataRegistryService() {
  return createMetadataRegistryService({ db });
}
