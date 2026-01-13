"use client";

import { BookIcon, ChevronDownIcon } from "lucide-react";
import { memo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useSource } from "~/features/story/hooks/useSource";
import type {
  TSourcesProps,
  TSourcesTriggerProps,
  TSourcesContentProps,
  TSourceProps,
} from "~/features/story/types";

export const Sources = ({ className, ...props }: TSourcesProps) => (
  <Collapsible
    className={cn("not-prose mb-4 text-primary text-xs", className)}
    {...props}
  />
);

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: TSourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn("flex items-center gap-2", className)}
    {...props}
  >
    {children ?? (
      <>
        <p className="font-medium">
          Used {count} source{count !== 1 ? "s" : ""}
        </p>
        <ChevronDownIcon className="h-4 w-4" />
      </>
    )}
  </CollapsibleTrigger>
);

export const SourcesContent = ({
  className,
  ...props
}: TSourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-fit flex-col gap-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

const SourceComponent = ({
  citation,
  href,
  title,
  children,
  className,
  ...props
}: TSourceProps) => {
  const { linkHref, displayTitle, formattedDate, tooltipContent } = useSource({
    citation,
    href,
    title,
  });

  return (
    <a
      className={cn("flex items-center gap-2", className)}
      href={linkHref}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children ?? (
        <>
          <BookIcon className="h-4 w-4 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="block font-medium truncate">{displayTitle}</span>
            {formattedDate && (
              <span className="text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger>{formattedDate}</TooltipTrigger>
                  <TooltipContent>{tooltipContent}</TooltipContent>
                </Tooltip>
              </span>
            )}
          </div>
        </>
      )}
    </a>
  );
};

export const Source = memo(SourceComponent);
