"use client";

import { memo } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Sparkles, Send, Loader2, Paperclip, Mic } from "lucide-react";
import { cn } from "~/lib/utils";
import { useCommentInput } from "~/features/story/hooks/useCommentInput";
import type { ICommentInputProps } from "~/features/story/types";

function CommentInputComponent({
  onSubmit,
  isLoading = false,
  placeholder = "Search activity logs by identifier (orderId, ticketId, etc.) or ask a question...",
  icon,
}: ICommentInputProps) {
  const {
    message,
    textareaRef,
    containerRef,
    fileInputRef,
    handleKeyDown,
    handleChange,
    handleSubmit,
    handleAttachment,
  } = useCommentInput({ onSubmit, isLoading });

  const displayIcon = icon || <Sparkles className="h-4 w-4" />;

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit}
      className={cn(
        "divide-y overflow-hidden rounded-xl border bg-background shadow-lg"
      )}
    >
      <div className="flex items-end gap-2 p-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
          {displayIcon}
        </div>
        <Textarea
          ref={textareaRef}
          name="message"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex-1 resize-none border-none bg-transparent shadow-none",
            "min-h-[48px] max-h-[164px] overflow-y-auto",
            "field-sizing-content"
          )}
          style={{
            height: "48px",
          }}
          autoFocus
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          variant="default"
          className={cn(
            "h-8 w-8 shrink-0 rounded-lg",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            (!message.trim() || isLoading) && "opacity-50 cursor-not-allowed"
          )}
          disabled={!message.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between p-1">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground",
              "[&:first-child]:rounded-bl-xl"
            )}
            onClick={handleAttachment}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
            )}
            title="Voice input"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

export const CommentInput = memo(CommentInputComponent);
