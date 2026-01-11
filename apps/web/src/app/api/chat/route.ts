import { NextRequest } from 'next/server'
import type { UIMessage } from 'ai'
import { getChatService } from '~/lib/compose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json()

        const lastMessage = messages[messages.length - 1]
        const textPart = lastMessage?.parts?.find((part): part is { type: 'text'; text: string } => part.type === 'text')
        const prompt = textPart?.text || ''

        if (!prompt || typeof prompt !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const chatService = getChatService()
        const result = await chatService.chat(prompt)
        const resultText = JSON.stringify(result)

        return new Response(resultText, {
            headers: {
                'Content-Type': 'text/plain',
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
