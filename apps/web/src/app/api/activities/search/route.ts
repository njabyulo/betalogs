import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getActivityLogService } from "~/lib/compose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface IQueryParams {
  identifier: string;
  identifierType: string;
  cacheKey?: string;
  timestamp?: string;
}

interface IActivityLogResponse {
  events: Array<{
    id: string;
    timestamp: string;
    level: string;
    service: string;
    message: string;
    metadata: Record<string, unknown>;
  }>;
  total: number;
  timeRange: {
    from: string;
    to: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  cache?: {
    etag: string;
    expiresAt?: string;
  };
}

/**
 * Generate ETag from query parameters and data hash
 */
function generateETag(queryParams: IQueryParams, dataHash: string): string {
  const etagInput = JSON.stringify({ ...queryParams, dataHash });
  return createHash("sha256").update(etagInput).digest("hex").substring(0, 16);
}

/**
 * Decode and validate query string
 */
function decodeQueryString(queryString: string): IQueryParams {
  try {
    const decoded = Buffer.from(queryString, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as IQueryParams;

    if (!parsed.identifier || !parsed.identifierType) {
      throw new Error("Missing required fields: identifier and identifierType");
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `Invalid query string: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const queryParam = searchParams.get("query");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const fieldsParam = searchParams.get("fields");

    if (!queryParam) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Decode query string
    const queryParams = decodeQueryString(queryParam);

    // Extract pagination
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 50;

    if (page < 1 || pageSize < 1 || pageSize > 1000) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // TODO: Extract tenantId from auth context
    // For now, using a placeholder - this should come from JWT token or session
    const tenantId =
      req.headers.get("x-tenant-id") || "00000000-0000-0000-0000-000000000000";

    // Get activity log service
    const activityLogService = getActivityLogService();

    // Execute search query
    const results = await activityLogService.searchExact({
      identifier: queryParams.identifier,
      identifierType: queryParams.identifierType,
    });

    // Apply field selection if specified
    let filteredResults = results;
    if (fieldsParam) {
      const fields = fieldsParam.split(",").map((f) => f.trim());
      filteredResults = results.map((result) => {
        const filtered: typeof result = {
          id: result.id,
          timestamp: result.timestamp,
          level: result.level,
          service: result.service,
          message: result.message,
          metadata: {},
        };

        // Include only specified fields from metadata
        if (fields.includes("metadata")) {
          filtered.metadata = result.metadata;
        } else {
          for (const field of fields) {
            if (result.metadata[field] !== undefined) {
              filtered.metadata[field] = result.metadata[field];
            }
          }
        }

        return filtered;
      });
    }

    // Sort by timestamp
    filteredResults.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredResults.length;

    // Generate data hash for ETag
    const dataHash = createHash("sha256")
      .update(JSON.stringify(filteredResults))
      .digest("hex")
      .substring(0, 16);

    // Generate ETag
    const etag = generateETag(queryParams, dataHash);

    // Check If-None-Match header for conditional request
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch === `"${etag}"`) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: `"${etag}"`,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // Prepare response
    const timeRange = {
      from: filteredResults[0]?.timestamp || "",
      to: filteredResults[filteredResults.length - 1]?.timestamp || "",
    };

    const response: IActivityLogResponse = {
      events: paginatedResults,
      total: filteredResults.length,
      timeRange,
      pagination: {
        page,
        pageSize,
        hasMore,
        ...(hasMore && {
          nextCursor: Buffer.from(JSON.stringify({ page: page + 1 })).toString(
            "base64"
          ),
        }),
      },
      cache: {
        etag,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      },
    };

    return NextResponse.json(response, {
      headers: {
        ETag: `"${etag}"`,
        "Cache-Control": "public, max-age=300",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Activity logs API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
