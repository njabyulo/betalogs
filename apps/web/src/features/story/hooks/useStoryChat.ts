import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useState, useEffect, useCallback } from 'react'
import type { IActivityEvent, TStoryOutput } from '~/features/story/types'

export function useStoryChat() {
    const [events, setEvents] = useState<IActivityEvent[]>([])
    const [storySummary, setStorySummary] = useState<TStoryOutput['story'] | null>(null)

    const { sendMessage, status, error } = useChat({
        transport: new TextStreamChatTransport({ api: '/api/chat' }),
        onFinish: ({ message }) => {
            setStorySummary(null)
            setEvents([])

            try {
                const textPart = message.parts.find((part): part is { type: 'text'; text: string } => part.type === 'text')
                const textContent = textPart?.text
                if (!textContent) {
                    throw new Error('No text content in message')
                }

                const story = JSON.parse(textContent) as TStoryOutput
                setStorySummary(story.story)

                const newEvents: IActivityEvent[] = story.story.timeline.map((entry) => ({
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

                setEvents(newEvents)
            } catch (parseError) {
                console.error('Failed to parse story response:', parseError)
                const textPart = message.parts.find((part): part is { type: 'text'; text: string } => part.type === 'text')
                const textContent = textPart?.text || ''
                const textEvent: IActivityEvent = {
                    id: `chat-${Date.now()}`,
                    type: 'comment',
                    user: {
                        name: 'AI Assistant',
                        initial: 'AI',
                    },
                    action: 'Response',
                    content: textContent,
                    timestamp: new Date(),
                }
                setEvents([textEvent])
            }
        },
        onError: (error: Error) => {
            console.error('Chat error:', error)
            const errorEvent: IActivityEvent = {
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
        },
    })

    useEffect(() => {
        if (status === 'submitted') {
            setStorySummary(null)
            setEvents([])
        }
    }, [status])

    const handleChatSubmit = useCallback(
        (message: string) => {
            sendMessage({ text: message })
        },
        [sendMessage]
    )

    const isLoading = status !== 'ready'

    return {
        events,
        storySummary,
        isLoading,
        handleChatSubmit,
        error,
    }
}
