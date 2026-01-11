import { NextRequest } from 'next/server'
import { getChatService } from '~/lib/compose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json()

        // Extract the last user message as the prompt
        const lastMessage = messages[messages.length - 1]
        const prompt = lastMessage?.content || ''

        if (!prompt || typeof prompt !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const chatService = getChatService()

        // Call chat service and get the result
        const result = await chatService.chat(prompt)

        // Convert the result to JSON string
        const resultText = JSON.stringify(result)

        // Create a ReadableStream to stream the JSON response
        // This follows Next.js patterns for streaming responses
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                // Stream the JSON in chunks for better UX
                const chunkSize = 1000 // bytes per chunk
                for (let i = 0; i < resultText.length; i += chunkSize) {
                    const chunk = resultText.slice(i, i + chunkSize)
                    controller.enqueue(encoder.encode(chunk))

                    // Small delay to allow streaming effect
                    await new Promise((resolve) => setTimeout(resolve, 10))
                }

                controller.close()
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Chat API error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined

        return new Response(
            JSON.stringify({
                error: errorMessage,
                stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
