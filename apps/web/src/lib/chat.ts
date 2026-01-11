/**
 * SSE Chat Client Utility
 * Handles Server-Sent Events connection for streaming chat responses
 */

export interface ChatMessage {
  type: 'start' | 'chunk' | 'done' | 'error'
  data?: string
  error?: string
}

export interface ChatStreamCallbacks {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onDone?: (fullData: unknown) => void
  onError?: (error: string) => void
}

/**
 * Stream chat response using Server-Sent Events
 */
export async function streamChat(
  prompt: string,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as ChatMessage

              switch (data.type) {
                case 'start':
                  callbacks.onStart?.()
                  break
                case 'chunk':
                  if (data.data) {
                    callbacks.onChunk?.(data.data)
                  }
                  break
                case 'done':
                  if (data.data) {
                    callbacks.onDone?.(data.data)
                  }
                  break
                case 'error':
                  if (data.error) {
                    callbacks.onError?.(data.error)
                  }
                  break
              }
            } catch (parseError) {
              console.error('Failed to parse SSE message:', parseError)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    callbacks.onError?.(errorMessage)
  }
}
