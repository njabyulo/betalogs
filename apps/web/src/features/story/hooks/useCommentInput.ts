import { useState, useRef, useCallback, type FormEvent } from "react";
import type { IUseCommentInputProps } from "~/features/story/types";

export function useCommentInput({
  onSubmit,
  isLoading = false,
}: IUseCommentInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 164);
    textarea.style.height = `${Math.max(newHeight, 48)}px`;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          return;
        }
        e.preventDefault();
        const currentValue = message.trim();
        if (currentValue && !isLoading) {
          onSubmit(currentValue);
          setMessage("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "48px";
          }
        }
      }
      if (e.key === "Escape") {
        setMessage("");
        textareaRef.current?.blur();
      }
    },
    [message, isLoading, onSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      adjustTextareaHeight();
    },
    [adjustTextareaHeight]
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const currentValue = message.trim();
      if (!currentValue || isLoading) return;
      onSubmit(currentValue);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
      }
    },
    [message, isLoading, onSubmit]
  );

  const handleAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    message,
    textareaRef,
    containerRef,
    fileInputRef,
    handleKeyDown,
    handleChange,
    handleSubmit,
    handleAttachment,
  };
}
