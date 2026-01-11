'use client'

import { useState, useRef, useCallback, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import {
  Sparkles,
  Send,
  Loader2,
  Paperclip,
  Mic,
} from 'lucide-react'
import { cn } from '~/lib/utils'

interface CommentInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  icon?: React.ReactNode
}

export function CommentInput({
  onSubmit,
  isLoading = false,
  placeholder = "Comment or type '/' for comments",
  icon,
}: CommentInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, 164) // max 164px (4 lines)
    textarea.style.height = `${Math.max(newHeight, 48)}px` // min 48px
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Allow newline with Shift+Enter
          return
        }
        // Submit on Enter (without Shift)
        e.preventDefault()
        const currentValue = message.trim()
        if (currentValue && !isLoading) {
          onSubmit(currentValue)
          setMessage('')
          if (textareaRef.current) {
            textareaRef.current.style.height = '48px'
          }
        }
      }
      if (e.key === 'Escape') {
        setMessage('')
        textareaRef.current?.blur()
      }
    },
    [message, isLoading, onSubmit]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
      adjustTextareaHeight()
    },
    [adjustTextareaHeight]
  )

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      const currentValue = message.trim()
      if (!currentValue || isLoading) return
      onSubmit(currentValue)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px'
      }
    },
    [message, isLoading, onSubmit]
  )

  const handleAttachment = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const displayIcon = icon || <Sparkles className="h-4 w-4" />

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit}
      className={cn(
        'divide-y overflow-hidden rounded-xl border bg-background shadow-lg'
      )}
    >
      <div className="flex items-end gap-2 p-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
          {displayIcon}
        </div>
        <textarea
          ref={textareaRef}
          name="message"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex-1 resize-none rounded-lg border-none bg-transparent p-2 text-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0',
            'min-h-[48px] max-h-[164px] overflow-y-auto',
            'field-sizing-content'
          )}
          style={{
            height: '48px',
          }}
          autoFocus
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          variant="default"
          className={cn(
            'h-8 w-8 shrink-0 rounded-lg',
            'bg-primary hover:bg-primary/90 text-primary-foreground',
            (!message.trim() || isLoading) && 'opacity-50 cursor-not-allowed'
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

      {/* Toolbar with attachment and voice */}
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
              'h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground',
              '[&:first-child]:rounded-bl-xl'
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
              'h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground'
            )}
            title="Voice input"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
