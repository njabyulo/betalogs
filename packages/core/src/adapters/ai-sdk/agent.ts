import { google } from '@ai-sdk/google'
import { LanguageModel, Output, ToolLoopAgent, ToolSet } from 'ai'
import {
  IAgentAdapterGenerateTextArgs,
  IAgentAdapterGenerateTextResult,
  IAgentAdapterOptions,
  ICreateAgentAdapterOptions,
  TAgentAdapterModelOptions,
  TAgentAdapterModelType,
} from '../interfaces'
import { z } from 'zod'

export class AgentAdapter<D, T extends ToolSet, TSchema extends z.ZodTypeAny | undefined = undefined> {
  private provider: 'google'
  private model: TAgentAdapterModelOptions<D, T>
  private activeModelType: TAgentAdapterModelType<D, T>
  private agent: ToolLoopAgent<never, T, never>
  private schema: TSchema

  constructor(options: ICreateAgentAdapterOptions<D, T>) {
    this.provider = options.provider
    this.model = options.model
    this.activeModelType = options.activeModelType
    this.schema = (options.output as any)?.schema as TSchema
    const agentConfig: any = {
      model: this.getModel(this.provider, this.activeModelType),
      instructions: options.instructions,
      tools: options.tools as T,
      stopWhen: options.stopWhen,
      onStepFinish: (step: any) => {
        console.log('================================================')
        step.content.forEach((part: any) => {
          if (part.type === 'text') {
            console.log({
              text: part.text,
            })
          } else if (part.type === 'tool-result') {
            console.log({
              output: part.output,
            })
          } else if (part.type === 'tool-call') {
            console.log({
              toolName: part.toolName,
              input: part.input,
            })
          }
        })
        console.log('================================================\n\n')
      },
    }
    // Google API doesn't support structured output (responseMimeType: 'application/json')
    // with function calling (tools). We must parse JSON from text response instead.
    // Do NOT set output on the agent when using Google with tools.
    this.agent = new ToolLoopAgent<never, T, never>(agentConfig)
  }

  private getModel(
    provider: IAgentAdapterOptions<D, T>['provider'],
    type: keyof IAgentAdapterOptions<D, T>['model']
  ): LanguageModel {
    if (provider === 'google') {
      return google(this.model[type])
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  /**
   * Enhanced JSON extraction with multiple strategies
   * Handles various formats the LLM might return JSON in
   */
  private extractJsonFromText(text: string): string | null {
    const trimmed = text.trim()

    // Strategy 1: JSON in code blocks (```json ... ``` or ``` ... ```)
    const codeBlockPatterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/i,
      /```\s*(\{[\s\S]*?\})\s*```/,
    ]

    for (const pattern of codeBlockPatterns) {
      const match = trimmed.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    // Strategy 2: Find first complete JSON object (balanced braces)
    // Properly handles braces inside string values by tracking string state
    let braceCount = 0
    let startIdx = -1
    let inString = false
    let stringChar: '"' | "'" | null = null
    let escapeNext = false

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }

      if ((char === '"' || char === "'") && !escapeNext) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
          stringChar = null
        }
        continue
      }

      // Only count braces when not inside a string
      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) startIdx = i
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0 && startIdx !== -1) {
            return trimmed.substring(startIdx, i + 1)
          }
        }
      }
    }

    // Strategy 3: Try parsing the entire text as JSON
    // (in case it's pure JSON without any wrapper)
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      // Not valid JSON, continue
    }

    // Strategy 4: Look for JSON after common prefixes
    const prefixPatterns = [
      /^Here (?:is|are) (?:the|a) (?:result|response|output|data)[:\s]*(\{[\s\S]*\})/i,
      /^JSON[:\s]*(\{[\s\S]*\})/i,
      /^Output[:\s]*(\{[\s\S]*\})/i,
    ]

    for (const pattern of prefixPatterns) {
      const match = trimmed.match(pattern)
      if (match && match[1]) {
        // Try to extract complete JSON object
        const jsonCandidate = match[1]
        const jsonMatch = jsonCandidate.match(/(\{[\s\S]*\})/)
        if (jsonMatch) {
          return jsonMatch[1]
        }
      }
    }

    return null
  }

  async generateText(
    input: IAgentAdapterGenerateTextArgs<D, T>
  ): Promise<IAgentAdapterGenerateTextResult<TSchema>> {
    const result = await this.agent.generate({
      prompt: input.prompt,
    })

    // Google API doesn't support structured output with function calling
    // Parse JSON from text response and validate against schema
    let parsedOutput: any = undefined

    if (this.schema) {
      try {
        const jsonStr = this.extractJsonFromText(result.text)

        if (!jsonStr) {
          throw new Error(
            `No JSON found in response. Response text: ${result.text.substring(0, 300)}...`
          )
        }

        // Parse JSON
        let parsed: unknown
        try {
          parsed = JSON.parse(jsonStr)
        } catch (parseError) {
          throw new Error(
            `Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}. Extracted text: ${jsonStr.substring(0, 200)}...`
          )
        }

        // Validate against schema
        try {
          parsedOutput = this.schema.parse(parsed)
        } catch (validationError) {
          // Provide detailed validation error
          let errorDetails: string
          let helpfulHint = ''

          if (validationError instanceof z.ZodError) {
            errorDetails = validationError.issues
              .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
              .join('; ')

            // Add helpful hint if "story" field is missing
            const missingStory = errorDetails.includes('story') &&
              (errorDetails.includes('undefined') || errorDetails.includes('required'))
            if (missingStory && typeof parsed === 'object' && parsed !== null && !('story' in parsed)) {
              helpfulHint = '\n\nHINT: The output must be wrapped in a "story" object. Expected structure: { "story": { ... } }'
            }
          } else if (validationError instanceof Error) {
            errorDetails = validationError.message
          } else {
            errorDetails = String(validationError)
          }

          throw new Error(
            `Schema validation failed: ${errorDetails}.${helpfulHint}\n\nParsed JSON: ${JSON.stringify(parsed, null, 2).substring(0, 500)}...`
          )
        }
      } catch (error) {
        // Enhanced error message with context
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        throw new Error(
          `Failed to extract and validate structured output: ${errorMessage}\n\n` +
          `Original response text (first 1000 chars):\n${result.text.substring(0, 1000)}`
        )
      }
    } else if (result.output) {
      // If we got structured output directly (non-Google providers)
      parsedOutput = result.output
    }

    return {
      text: result.text,
      output: parsedOutput as TSchema extends z.ZodTypeAny ? z.infer<TSchema> : never,
    }
  }
}

export const createAgentAdapter = <D, T extends ToolSet, TSchema extends z.ZodTypeAny | undefined = undefined>(
  options: ICreateAgentAdapterOptions<D, T>
) => {
  return new AgentAdapter<D, T, TSchema>(options)
}
