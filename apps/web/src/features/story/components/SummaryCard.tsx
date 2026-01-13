"use client";

import { memo } from "react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "~/features/story/components/Sources";
import { Badge } from "~/components/ui/badge";
import { CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { useSummaryCard } from "~/features/story/hooks/useSummaryCard";
import type { ISummaryCardProps } from "~/features/story/types";

function SummaryCardComponent({ story }: ISummaryCardProps) {
  const {
    formatDate,
    getCategoryColor,
    outcomeCounts,
    categories,
    services,
    uniqueSources,
  } = useSummaryCard({ story });

  return (
    <div className="space-y-4">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <CardTitle>Summary</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{story.eventCount} events</span>
            {story.duration && <span>• {story.duration}</span>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Identifier</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{story.identifierType}</Badge>
              <span className="font-mono text-xs">{story.identifier}</span>
            </div>
          </div>

          <div>
            <p className="text-gray-600 mb-1">Time Range</p>
            <div className="text-xs space-y-0.5">
              <div>
                <span className="text-gray-500">From: </span>
                {formatDate(story.timeRange.from)}
              </div>
              <div>
                <span className="text-gray-500">To: </span>
                {formatDate(story.timeRange.to)}
              </div>
            </div>
          </div>

          <div>
            <p className="text-gray-600 mb-1">Outcomes</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(outcomeCounts).map(([outcome, count]) => (
                <Badge
                  key={outcome}
                  variant={
                    outcome === "success"
                      ? "default"
                      : outcome === "failure"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {outcome}: {count}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-gray-600 mb-1">Categories</p>
            <div className="flex flex-wrap gap-1">
              {categories.map((category) => (
                <Badge
                  key={category}
                  className={`text-xs ${getCategoryColor(category)}`}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {services.length > 0 && (
            <div className="col-span-2">
              <p className="text-gray-600 mb-1">Services</p>
              <div className="flex flex-wrap gap-1">
                {services.map((service) => (
                  <Badge key={service} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t mt-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Summary</p>
            <p className="text-sm text-gray-900 leading-relaxed">
              {story.summary}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Impact</p>
            <p className="text-sm text-gray-900 leading-relaxed">
              {story.impact}
            </p>
          </div>

          {uniqueSources.length > 0 && (
            <div className="pt-4 border-t mt-4">
              <Sources>
                <SourcesTrigger count={uniqueSources.length} />
                <SourcesContent>
                  {uniqueSources.map((source) => (
                    <Source key={source.id} citation={source} />
                  ))}
                </SourcesContent>
              </Sources>
            </div>
          )}
        </div>
      </CardContent>
    </div>
  );
}

export const SummaryCard = memo(SummaryCardComponent);
