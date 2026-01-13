import type { TActivityEvent } from "@betalogs/core/domain";
import { ActivityCategory, ActivityOutcome } from "@betalogs/shared/constants";

// Simple UUID v4 generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Transform log chunks to ActivityEvents
function logToActivityEvent(log: {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
}): TActivityEvent {
  // Map level to outcome
  const outcome =
    log.level === "ERROR"
      ? ActivityOutcome.FAILURE
      : log.level === "WARN"
        ? ActivityOutcome.UNKNOWN
        : ActivityOutcome.SUCCESS;

  // Extract action from message (first few words) or use default
  const action =
    log.message.split(" ").slice(0, 3).join(" ") || "checkout_event";

  // Determine category based on service and metadata
  const category = ActivityCategory.TECH; // Default to TECH for checkout service

  // Extract actor information
  const actor = log.metadata?.user_id
    ? {
        userId: String(log.metadata.user_id),
        emailHash: log.metadata.user_email
          ? String(log.metadata.user_email).split("@")[0]
          : undefined,
      }
    : undefined;

  // Extract object information
  const object: {
    orderId?: string;
    requestId?: string;
    resourceId?: string;
  } = {};
  if (log.metadata?.order_id) {
    object.orderId = String(log.metadata.order_id);
  }
  if (log.metadata?.request_id) {
    object.requestId = String(log.metadata.request_id);
  }
  if (log.metadata?.shipment_id) {
    object.resourceId = String(log.metadata.shipment_id);
  }

  // Extract correlation information
  const correlation = log.metadata?.request_id
    ? {
        correlationId: String(log.metadata.request_id),
      }
    : undefined;

  // Create a test tenant ID (in real usage, this would come from auth context)
  const tenantId = "00000000-0000-0000-0000-000000000000";

  return {
    schemaVersion: "1.0.0",
    tenantId,
    eventId: generateUUID(), // Generate new UUID for each event
    occurredAt: log.timestamp,
    category,
    action,
    outcome,
    source: log.service,
    message: log.message,
    actor,
    object: Object.keys(object).length > 0 ? object : undefined,
    correlation,
    metadata: log.metadata,
  };
}

const rawLogs = [
  // Order 1: Failed initial attempt, retry succeeds, then full lifecycle
  {
    id: "1",
    timestamp: "2024-06-19T10:00:00Z",
    level: "ERROR",
    service: "shipping",
    message:
      "Shipment label creation failed for order ord_xyz456. Carrier API timeout after 3 attempts.",
    metadata: {
      request_id: "req_abc123",
      user_id: "user_alice_789",
      user_email: "alice@example.com",
      user_subscription: "premium",
      account_age_days: 245,
      lifetime_value_cents: 125000,
      shipment_id: "ship_xyz456",
      order_id: "ord_xyz456",
      tracking_id: null,
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 3.2,
        dimensions: "30x20x15",
        carrier: "fedex",
      },
      carrier: {
        provider: "fedex",
        api_latency_ms: 8500,
        attempt: 3,
        status: "timeout",
      },
      error: {
        type: "CarrierAPITimeout",
        message: "Carrier API did not respond within 8s timeout",
        code: "CARRIER_TIMEOUT",
        retriable: true,
      },
      duration_ms: 12500,
      status_code: 500,
    },
  },
  {
    id: "1b",
    timestamp: "2024-06-19T10:02:30Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment label created successfully for order ord_xyz456. Retry attempt succeeded.",
    metadata: {
      request_id: "req_abc123",
      user_id: "user_alice_789",
      user_email: "alice@example.com",
      user_subscription: "premium",
      account_age_days: 245,
      lifetime_value_cents: 125000,
      shipment_id: "ship_xyz456",
      order_id: "ord_xyz456",
      tracking_id: "TRACK987654321",
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 3.2,
        dimensions: "30x20x15",
        carrier: "fedex",
      },
      carrier: {
        provider: "fedex",
        api_latency_ms: 1200,
        attempt: 4,
        status: "success",
      },
      duration_ms: 1850,
      status_code: 200,
    },
  },
  {
    id: "1c",
    timestamp: "2024-06-19T14:30:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment picked up for order ord_xyz456. Package collected by carrier.",
    metadata: {
      request_id: "req_abc123",
      user_id: "user_alice_789",
      user_email: "alice@example.com",
      shipment_id: "ship_xyz456",
      order_id: "ord_xyz456",
      tracking_id: "TRACK987654321",
      status: "picked_up",
      location: "warehouse_nyc",
    },
  },
  {
    id: "1d",
    timestamp: "2024-06-19T18:45:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment in transit for order ord_xyz456. Package departed sorting facility.",
    metadata: {
      request_id: "req_abc123",
      user_id: "user_alice_789",
      shipment_id: "ship_xyz456",
      order_id: "ord_xyz456",
      tracking_id: "TRACK987654321",
      status: "in_transit",
      location: "sorting_facility_nj",
    },
  },
  {
    id: "1e",
    timestamp: "2024-06-20T10:15:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_xyz456. Package signed for by recipient.",
    metadata: {
      request_id: "req_abc123",
      user_id: "user_alice_789",
      shipment_id: "ship_xyz456",
      order_id: "ord_xyz456",
      tracking_id: "TRACK987654321",
      status: "delivered",
      location: "delivery_address_ca",
      signed_by: "Alice Smith",
    },
  },
  // Order 2: Successful express shipment with delay
  {
    id: "2",
    timestamp: "2024-06-19T10:05:23Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment created successfully for order ord_uvw789. Express shipping label generated.",
    metadata: {
      request_id: "req_def456",
      user_id: "user_bob_123",
      user_email: "bob@example.com",
      user_subscription: "free",
      account_age_days: 12,
      lifetime_value_cents: 0,
      shipment_id: "ship_uvw789",
      order_id: "ord_uvw789",
      tracking_id: "TRACK123456789",
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: true,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 0.8,
        dimensions: "20x15x10",
        carrier: "ups",
      },
      carrier: {
        provider: "ups",
        api_latency_ms: 1200,
        attempt: 1,
        status: "success",
      },
      duration_ms: 1850,
      status_code: 200,
    },
  },
  {
    id: "2b",
    timestamp: "2024-06-19T11:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment picked up for order ord_uvw789. Express package collected.",
    metadata: {
      request_id: "req_def456",
      user_id: "user_bob_123",
      shipment_id: "ship_uvw789",
      order_id: "ord_uvw789",
      tracking_id: "TRACK123456789",
      status: "picked_up",
      location: "warehouse_nyc",
    },
  },
  {
    id: "2c",
    timestamp: "2024-06-19T15:30:00Z",
    level: "WARN",
    service: "shipping",
    message:
      "Shipment delay detected for order ord_uvw789. Package delayed at sorting facility.",
    metadata: {
      request_id: "req_def456",
      user_id: "user_bob_123",
      shipment_id: "ship_uvw789",
      order_id: "ord_uvw789",
      tracking_id: "TRACK123456789",
      status: "delayed",
      location: "sorting_facility_nj",
      delay_reason: "weather_conditions",
    },
  },
  {
    id: "2d",
    timestamp: "2024-06-19T20:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment in transit for order ord_uvw789. Package resumed movement.",
    metadata: {
      request_id: "req_def456",
      user_id: "user_bob_123",
      shipment_id: "ship_uvw789",
      order_id: "ord_uvw789",
      tracking_id: "TRACK123456789",
      status: "in_transit",
      location: "transit_center_pa",
    },
  },
  {
    id: "2e",
    timestamp: "2024-06-20T08:30:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_uvw789. Express delivery completed.",
    metadata: {
      request_id: "req_def456",
      user_id: "user_bob_123",
      shipment_id: "ship_uvw789",
      order_id: "ord_uvw789",
      tracking_id: "TRACK123456789",
      status: "delivered",
      location: "delivery_address_tx",
      signed_by: "Bob Johnson",
    },
  },
  // Order 3: Address issue, correction, then successful delivery
  {
    id: "3",
    timestamp: "2024-06-19T10:12:15Z",
    level: "ERROR",
    service: "shipping",
    message:
      "Shipment failed for order ord_rst012. Invalid shipping address provided.",
    metadata: {
      request_id: "req_ghi789",
      user_id: "user_charlie_456",
      user_email: "charlie@example.com",
      user_subscription: "premium",
      account_age_days: 890,
      lifetime_value_cents: 450000,
      shipment_id: "ship_rst012",
      order_id: "ord_rst012",
      tracking_id: null,
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 5.5,
        dimensions: "40x30x25",
        carrier: "dhl",
      },
      carrier: {
        provider: "dhl",
        api_latency_ms: 450,
        attempt: 1,
        status: "invalid_address",
      },
      error: {
        type: "InvalidShippingAddress",
        message: "Shipping address validation failed",
        code: "INVALID_ADDRESS",
        retriable: false,
      },
      duration_ms: 650,
      status_code: 400,
    },
  },
  {
    id: "3b",
    timestamp: "2024-06-19T10:45:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Address corrected for order ord_rst012. User updated shipping address.",
    metadata: {
      request_id: "req_ghi789",
      user_id: "user_charlie_456",
      shipment_id: "ship_rst012",
      order_id: "ord_rst012",
      status: "address_corrected",
    },
  },
  {
    id: "3c",
    timestamp: "2024-06-19T11:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment label created successfully for order ord_rst012. Address correction applied.",
    metadata: {
      request_id: "req_ghi789",
      user_id: "user_charlie_456",
      shipment_id: "ship_rst012",
      order_id: "ord_rst012",
      tracking_id: "TRACK555666777",
      status: "label_created",
    },
  },
  {
    id: "3d",
    timestamp: "2024-06-19T16:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment picked up for order ord_rst012. Package collected by carrier.",
    metadata: {
      request_id: "req_ghi789",
      user_id: "user_charlie_456",
      shipment_id: "ship_rst012",
      order_id: "ord_rst012",
      tracking_id: "TRACK555666777",
      status: "picked_up",
      location: "warehouse_nyc",
    },
  },
  {
    id: "3e",
    timestamp: "2024-06-21T14:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_rst012. Package delivered to corrected address.",
    metadata: {
      request_id: "req_ghi789",
      user_id: "user_charlie_456",
      shipment_id: "ship_rst012",
      order_id: "ord_rst012",
      tracking_id: "TRACK555666777",
      status: "delivered",
      location: "delivery_address_fl",
      signed_by: "Charlie Brown",
    },
  },
  // Order 4: High latency but successful, then lost package investigation
  {
    id: "4",
    timestamp: "2024-06-19T09:45:00Z",
    level: "WARN",
    service: "shipping",
    message:
      "Shipment created with high latency for order ord_mno345. Response time 3.2s exceeds threshold.",
    metadata: {
      request_id: "req_jkl012",
      user_id: "user_diana_789",
      user_email: "diana@example.com",
      user_subscription: "premium",
      account_age_days: 156,
      lifetime_value_cents: 78000,
      shipment_id: "ship_mno345",
      order_id: "ord_mno345",
      tracking_id: "TRACK444555666",
      feature_flags: {
        new_shipping_enabled: false,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.0.8",
      service_version: "2.0.8",
      region: "us-west-2",
      package: {
        weight_kg: 2.1,
        dimensions: "25x20x12",
        carrier: "usps",
      },
      carrier: {
        provider: "usps",
        api_latency_ms: 3100,
        attempt: 1,
        status: "success",
      },
      duration_ms: 3200,
      status_code: 200,
    },
  },
  {
    id: "4b",
    timestamp: "2024-06-19T13:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment picked up for order ord_mno345. Package collected by carrier.",
    metadata: {
      request_id: "req_jkl012",
      user_id: "user_diana_789",
      shipment_id: "ship_mno345",
      order_id: "ord_mno345",
      tracking_id: "TRACK444555666",
      status: "picked_up",
      location: "warehouse_ca",
    },
  },
  {
    id: "4c",
    timestamp: "2024-06-22T10:00:00Z",
    level: "ERROR",
    service: "shipping",
    message:
      "Shipment lost investigation started for order ord_mno345. Package not scanned for 3 days.",
    metadata: {
      request_id: "req_jkl012",
      user_id: "user_diana_789",
      shipment_id: "ship_mno345",
      order_id: "ord_mno345",
      tracking_id: "TRACK444555666",
      status: "lost",
      location: "unknown",
      investigation_started: true,
    },
  },
  {
    id: "4d",
    timestamp: "2024-06-23T15:30:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment found for order ord_mno345. Package located at wrong sorting facility.",
    metadata: {
      request_id: "req_jkl012",
      user_id: "user_diana_789",
      shipment_id: "ship_mno345",
      order_id: "ord_mno345",
      tracking_id: "TRACK444555666",
      status: "found",
      location: "sorting_facility_wa",
    },
  },
  {
    id: "4e",
    timestamp: "2024-06-24T11:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment in transit for order ord_mno345. Package rerouted to correct destination.",
    metadata: {
      request_id: "req_jkl012",
      user_id: "user_diana_789",
      shipment_id: "ship_mno345",
      order_id: "ord_mno345",
      tracking_id: "TRACK444555666",
      status: "in_transit",
      location: "transit_center_or",
    },
  },
  {
    id: "4f",
    timestamp: "2024-06-25T09:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_mno345. Package delivered after investigation.",
    metadata: {
      request_id: "req_jkl012",
      user_id: "user_diana_789",
      shipment_id: "ship_mno345",
      order_id: "ord_mno345",
      tracking_id: "TRACK444555666",
      status: "delivered",
      location: "delivery_address_or",
      signed_by: "Diana Prince",
    },
  },
  // Order 5: Overweight package, split into multiple shipments
  {
    id: "5",
    timestamp: "2024-06-19T10:18:42Z",
    level: "ERROR",
    service: "shipping",
    message:
      "Shipment failed for order ord_stu678. Carrier returned insufficient weight capacity error.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      user_email: "eve@example.com",
      user_subscription: "free",
      account_age_days: 5,
      lifetime_value_cents: 0,
      shipment_id: "ship_stu678",
      order_id: "ord_stu678",
      tracking_id: null,
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 25.0,
        dimensions: "60x40x30",
        carrier: "fedex",
      },
      carrier: {
        provider: "fedex",
        api_latency_ms: 890,
        attempt: 1,
        status: "overweight",
      },
      error: {
        type: "PackageOverweight",
        message: "Package exceeds carrier weight limit",
        code: "OVERWEIGHT",
        retriable: false,
      },
      duration_ms: 1100,
      status_code: 400,
    },
  },
  {
    id: "5b",
    timestamp: "2024-06-19T11:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Order ord_stu678 split into multiple shipments. Package divided to meet weight limits.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      order_id: "ord_stu678",
      split_shipments: ["ship_stu678a", "ship_stu678b"],
    },
  },
  {
    id: "5c",
    timestamp: "2024-06-19T11:15:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment label created for order ord_stu678 shipment A. First package ready.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      shipment_id: "ship_stu678a",
      order_id: "ord_stu678",
      tracking_id: "TRACK111222333",
      package: {
        weight_kg: 12.5,
        dimensions: "40x30x20",
      },
    },
  },
  {
    id: "5d",
    timestamp: "2024-06-19T11:20:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment label created for order ord_stu678 shipment B. Second package ready.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      shipment_id: "ship_stu678b",
      order_id: "ord_stu678",
      tracking_id: "TRACK444555666",
      package: {
        weight_kg: 12.5,
        dimensions: "40x30x20",
      },
    },
  },
  {
    id: "5e",
    timestamp: "2024-06-20T10:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Both shipments picked up for order ord_stu678. Packages collected by carrier.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      order_id: "ord_stu678",
      status: "both_picked_up",
    },
  },
  {
    id: "5f",
    timestamp: "2024-06-22T14:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment A delivered for order ord_stu678. First package delivered.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      shipment_id: "ship_stu678a",
      order_id: "ord_stu678",
      tracking_id: "TRACK111222333",
      status: "delivered",
    },
  },
  {
    id: "5g",
    timestamp: "2024-06-22T16:30:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment B delivered for order ord_stu678. Second package delivered.",
    metadata: {
      request_id: "req_pqr345",
      user_id: "user_eve_234",
      shipment_id: "ship_stu678b",
      order_id: "ord_stu678",
      tracking_id: "TRACK444555666",
      status: "delivered",
    },
  },
  // Order 6: Smooth express shipment
  {
    id: "6",
    timestamp: "2024-06-19T10:25:10Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment created successfully for order ord_yza901. Used new shipping flow with express option.",
    metadata: {
      request_id: "req_vwx678",
      user_id: "user_frank_567",
      user_email: "frank@example.com",
      user_subscription: "premium",
      account_age_days: 423,
      lifetime_value_cents: 234000,
      shipment_id: "ship_yza901",
      order_id: "ord_yza901",
      tracking_id: "TRACK456789012",
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: true,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 4.2,
        dimensions: "35x25x18",
        carrier: "ups",
      },
      carrier: {
        provider: "ups",
        api_latency_ms: 680,
        attempt: 1,
        status: "success",
      },
      duration_ms: 920,
      status_code: 200,
    },
  },
  {
    id: "6b",
    timestamp: "2024-06-19T12:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Express shipment picked up for order ord_yza901. Package collected.",
    metadata: {
      request_id: "req_vwx678",
      user_id: "user_frank_567",
      shipment_id: "ship_yza901",
      order_id: "ord_yza901",
      tracking_id: "TRACK456789012",
      status: "picked_up",
    },
  },
  {
    id: "6c",
    timestamp: "2024-06-19T18:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Express shipment in transit for order ord_yza901. Fast tracking enabled.",
    metadata: {
      request_id: "req_vwx678",
      user_id: "user_frank_567",
      shipment_id: "ship_yza901",
      order_id: "ord_yza901",
      tracking_id: "TRACK456789012",
      status: "in_transit",
    },
  },
  {
    id: "6d",
    timestamp: "2024-06-20T09:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Express shipment delivered for order ord_yza901. Next-day delivery completed.",
    metadata: {
      request_id: "req_vwx678",
      user_id: "user_frank_567",
      shipment_id: "ship_yza901",
      order_id: "ord_yza901",
      tracking_id: "TRACK456789012",
      status: "delivered",
      signed_by: "Frank Miller",
    },
  },
  // Order 7: Standard shipment with return request
  {
    id: "7",
    timestamp: "2024-06-19T09:30:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment created successfully for order ord_efg234. Standard shipping flow used.",
    metadata: {
      request_id: "req_bcd901",
      user_id: "user_grace_890",
      user_email: "grace@example.com",
      user_subscription: "free",
      account_age_days: 78,
      lifetime_value_cents: 15000,
      shipment_id: "ship_efg234",
      order_id: "ord_efg234",
      tracking_id: "TRACK789012345",
      feature_flags: {
        new_shipping_enabled: false,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.0.8",
      service_version: "2.0.8",
      region: "us-west-2",
      package: {
        weight_kg: 1.2,
        dimensions: "18x12x8",
        carrier: "usps",
      },
      carrier: {
        provider: "usps",
        api_latency_ms: 1450,
        attempt: 1,
        status: "success",
      },
      duration_ms: 2100,
      status_code: 200,
    },
  },
  {
    id: "7b",
    timestamp: "2024-06-19T14:00:00Z",
    level: "INFO",
    service: "shipping",
    message: "Shipment picked up for order ord_efg234. Package collected.",
    metadata: {
      request_id: "req_bcd901",
      user_id: "user_grace_890",
      shipment_id: "ship_efg234",
      order_id: "ord_efg234",
      tracking_id: "TRACK789012345",
      status: "picked_up",
    },
  },
  {
    id: "7c",
    timestamp: "2024-06-21T10:00:00Z",
    level: "INFO",
    service: "shipping",
    message: "Shipment delivered for order ord_efg234. Package delivered.",
    metadata: {
      request_id: "req_bcd901",
      user_id: "user_grace_890",
      shipment_id: "ship_efg234",
      order_id: "ord_efg234",
      tracking_id: "TRACK789012345",
      status: "delivered",
      signed_by: "Grace Lee",
    },
  },
  {
    id: "7d",
    timestamp: "2024-06-22T08:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Return requested for order ord_efg234. Customer initiated return process.",
    metadata: {
      request_id: "req_bcd901",
      user_id: "user_grace_890",
      shipment_id: "ship_efg234",
      order_id: "ord_efg234",
      tracking_id: "TRACK789012345",
      status: "return_requested",
      return_reason: "wrong_item",
    },
  },
  {
    id: "7e",
    timestamp: "2024-06-23T10:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Return label created for order ord_efg234. Return shipment initiated.",
    metadata: {
      request_id: "req_bcd901",
      user_id: "user_grace_890",
      shipment_id: "ship_efg234",
      order_id: "ord_efg234",
      return_tracking_id: "RETURN123456",
      status: "return_label_created",
    },
  },
  // Order 8: Database timeout, retry succeeds, then delivery
  {
    id: "8",
    timestamp: "2024-06-19T10:35:22Z",
    level: "ERROR",
    service: "shipping",
    message:
      "Shipment failed for order ord_klm567. Database connection timeout during label generation.",
    metadata: {
      request_id: "req_hij234",
      user_id: "user_henry_123",
      user_email: "henry@example.com",
      user_subscription: "premium",
      account_age_days: 312,
      lifetime_value_cents: 189000,
      shipment_id: "ship_klm567",
      order_id: "ord_klm567",
      tracking_id: null,
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 2.8,
        dimensions: "28x22x15",
        carrier: "dhl",
      },
      carrier: {
        provider: "dhl",
        api_latency_ms: 1200,
        attempt: 1,
        status: "success",
      },
      error: {
        type: "DatabaseTimeout",
        message: "Database connection pool exhausted, timeout after 5s",
        code: "DB_TIMEOUT",
        retriable: true,
      },
      duration_ms: 5200,
      status_code: 500,
    },
  },
  {
    id: "8b",
    timestamp: "2024-06-19T10:40:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment label created successfully for order ord_klm567. Database connection restored.",
    metadata: {
      request_id: "req_hij234",
      user_id: "user_henry_123",
      shipment_id: "ship_klm567",
      order_id: "ord_klm567",
      tracking_id: "TRACK777888999",
      status: "label_created",
    },
  },
  {
    id: "8c",
    timestamp: "2024-06-19T15:00:00Z",
    level: "INFO",
    service: "shipping",
    message: "Shipment picked up for order ord_klm567. Package collected.",
    metadata: {
      request_id: "req_hij234",
      user_id: "user_henry_123",
      shipment_id: "ship_klm567",
      order_id: "ord_klm567",
      tracking_id: "TRACK777888999",
      status: "picked_up",
    },
  },
  {
    id: "8d",
    timestamp: "2024-06-21T12:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_klm567. Package delivered successfully.",
    metadata: {
      request_id: "req_hij234",
      user_id: "user_henry_123",
      shipment_id: "ship_klm567",
      order_id: "ord_klm567",
      tracking_id: "TRACK777888999",
      status: "delivered",
      signed_by: "Henry Ford",
    },
  },
  // Order 9: Fast processing, smooth delivery
  {
    id: "9",
    timestamp: "2024-06-19T10:40:15Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment created successfully for order ord_qrs890. New shipping flow with fast label processing.",
    metadata: {
      request_id: "req_nop567",
      user_id: "user_isabel_456",
      user_email: "isabel@example.com",
      user_subscription: "premium",
      account_age_days: 201,
      lifetime_value_cents: 98000,
      shipment_id: "ship_qrs890",
      order_id: "ord_qrs890",
      tracking_id: "TRACK345678901",
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: true,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 3.5,
        dimensions: "32x24x16",
        carrier: "fedex",
      },
      carrier: {
        provider: "fedex",
        api_latency_ms: 520,
        attempt: 1,
        status: "success",
      },
      duration_ms: 750,
      status_code: 200,
    },
  },
  {
    id: "9b",
    timestamp: "2024-06-19T13:00:00Z",
    level: "INFO",
    service: "shipping",
    message: "Shipment picked up for order ord_qrs890. Fast pickup completed.",
    metadata: {
      request_id: "req_nop567",
      user_id: "user_isabel_456",
      shipment_id: "ship_qrs890",
      order_id: "ord_qrs890",
      tracking_id: "TRACK345678901",
      status: "picked_up",
    },
  },
  {
    id: "9c",
    timestamp: "2024-06-20T08:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_qrs890. Fast delivery completed.",
    metadata: {
      request_id: "req_nop567",
      user_id: "user_isabel_456",
      shipment_id: "ship_qrs890",
      order_id: "ord_qrs890",
      tracking_id: "TRACK345678901",
      status: "delivered",
      signed_by: "Isabel Martinez",
    },
  },
  // Order 10: Rate limit, retry after delay, then successful
  {
    id: "10",
    timestamp: "2024-06-19T10:45:33Z",
    level: "ERROR",
    service: "shipping",
    message:
      "Shipment failed for order ord_wxy123. Carrier API rate limit exceeded.",
    metadata: {
      request_id: "req_tuv890",
      user_id: "user_jack_789",
      user_email: "jack@example.com",
      user_subscription: "free",
      account_age_days: 23,
      lifetime_value_cents: 5000,
      shipment_id: "ship_wxy123",
      order_id: "ord_wxy123",
      tracking_id: null,
      feature_flags: {
        new_shipping_enabled: true,
        express_shipping_enabled: false,
      },
      deployment_id: "deploy_v2.1.3",
      service_version: "2.1.3",
      region: "us-east-1",
      package: {
        weight_kg: 1.5,
        dimensions: "22x16x10",
        carrier: "ups",
      },
      carrier: {
        provider: "ups",
        api_latency_ms: 320,
        attempt: 1,
        status: "rate_limited",
      },
      error: {
        type: "RateLimitExceeded",
        message: "Carrier API rate limit exceeded, retry after 60s",
        code: "RATE_LIMIT",
        retriable: true,
      },
      duration_ms: 450,
      status_code: 429,
    },
  },
  {
    id: "10b",
    timestamp: "2024-06-19T10:47:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment label created successfully for order ord_wxy123. Retry after rate limit delay succeeded.",
    metadata: {
      request_id: "req_tuv890",
      user_id: "user_jack_789",
      shipment_id: "ship_wxy123",
      order_id: "ord_wxy123",
      tracking_id: "TRACK999888777",
      status: "label_created",
    },
  },
  {
    id: "10c",
    timestamp: "2024-06-19T16:00:00Z",
    level: "INFO",
    service: "shipping",
    message: "Shipment picked up for order ord_wxy123. Package collected.",
    metadata: {
      request_id: "req_tuv890",
      user_id: "user_jack_789",
      shipment_id: "ship_wxy123",
      order_id: "ord_wxy123",
      tracking_id: "TRACK999888777",
      status: "picked_up",
    },
  },
  {
    id: "10d",
    timestamp: "2024-06-21T10:00:00Z",
    level: "INFO",
    service: "shipping",
    message:
      "Shipment delivered for order ord_wxy123. Package delivered successfully.",
    metadata: {
      request_id: "req_tuv890",
      user_id: "user_jack_789",
      shipment_id: "ship_wxy123",
      order_id: "ord_wxy123",
      tracking_id: "TRACK999888777",
      status: "delivered",
      signed_by: "Jack Wilson",
    },
  },
];

// Transform logs to ActivityEvents
export const activityEvents = rawLogs.map(logToActivityEvent);
