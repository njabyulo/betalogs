export const ActivityCategory = {
  TECH: "tech",
  LOGISTICS: "logistics",
  FINANCE: "finance",
  SECURITY: "security",
  SUPPORT: "support",
  PRODUCT: "product",
  OPS: "ops",
  HR: "hr",
  UNKNOWN: "unknown",
} as const;

export const ActivityOutcome = {
  SUCCESS: "success",
  FAILURE: "failure",
  UNKNOWN: "unknown",
} as const;

export const ActivitySeverity = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;
