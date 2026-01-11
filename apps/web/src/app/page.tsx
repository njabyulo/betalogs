'use client'

import { useState } from 'react'
import { CommentInput } from '~/components/activity-log/CommentInput'
import { ActivityTimeline } from '~/components/activity-log/ActivityTimeline'
import { SummaryCard } from '~/components/activity-log/SummaryCard'
import type { ActivityEvent } from '~/components/activity-log/EventItem'
import type { StoryOutput } from '~/lib/schemas'

export default function Home() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [storySummary, setStorySummary] = useState<StoryOutput['story'] | null>(null)

  const handleChatSubmit = async (message: string) => {
    setIsLoading(true)
    // Clear previous summary and events on new chat
    setStorySummary(null)
    setEvents([])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Read the streamed JSON response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is null')
      }

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
      }

      // Parse the final content as JSON (StoryOutput)
      const story = JSON.parse(fullContent) as StoryOutput

      try {
        // Store the summary separately (will be displayed in SummaryCard)
        setStorySummary(story.story)

        // Convert ONLY timeline entries to activity events (overwrite, don't append)
        const newEvents: ActivityEvent[] = story.story.timeline.map((entry) => ({
          id: `story-${entry.id}`,
          type: 'comment' as const,
          user: {
            name: entry.service,
            initial: entry.service.charAt(0).toUpperCase(),
          },
          action: entry.action,
          content: entry.message,
          timestamp: new Date(entry.timestamp),
          citations: entry.citations,
        }))

        // Overwrite events with new timeline (no summary event, no appending)
        setEvents(newEvents)
      } catch (parseError) {
        console.error('Failed to parse story response:', parseError)
        // Add a simple text event if parsing fails (overwrite)
        const textEvent: ActivityEvent = {
          id: `chat-${Date.now()}`,
          type: 'comment',
          user: {
            name: 'AI Assistant',
            initial: 'AI',
          },
          action: 'Response',
          content: fullContent,
          timestamp: new Date(),
        }
        setEvents([textEvent])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorEvent: ActivityEvent = {
        id: `error-${Date.now()}`,
        type: 'comment',
        user: {
          name: 'System',
          initial: 'S',
        },
        action: 'Error',
        content: `Failed to process request: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      }
      setEvents([errorEvent])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {storySummary && (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <SummaryCard story={storySummary} />
          </div>
        )}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <ActivityTimeline events={events} />
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <CommentInput onSubmit={handleChatSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
