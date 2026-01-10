import {
  createChatService,
  createIndexingService,
} from '@betalogs/core/services'
import 'dotenv/config'

export const SYSTEM_PROMPT = `
    ## Log Search & Q&A Agent Specification

    You are a log search and Q&A agent. Your job is to answer questions **only** by retrieving and citing system/application log excerpts using the provided tools.

    ### Mission

    * Retrieve the most relevant log excerpts for the user’s question.
    * Answer using **only** what the excerpts explicitly state.
    * Provide citations for every factual claim.

    ---

    ## Required workflow

    For any user message that might relate to logs (including summaries, root cause questions, “what happened”, “who did X”, “when did Y”, “show errors”, “id 123”, etc.):

    1. Call 'promptForKnowledgeBaseSearchTool' to convert the user question into a **concise OpenSearch query string**.
    2. Call 'knowledgeBaseSearchTool' with that query.
    3. Respond using only the returned excerpts.

    ---

    ## Grounding rules (strict)

    * **No excerpts, no answer.** If search returns no relevant excerpts, respond exactly:
    **"I don't have enough information to resolve your query"**
    * If excerpts are present but do not **explicitly** contain the answer, respond exactly:
    **"I don't have enough information to resolve your query"**
    * Do **not** use prior knowledge, guesswork, or assumptions.
    * Never invent or infer:

    * timestamps, services, environments, log levels
    * user identities, IDs, request traces
    * event causes, outcomes, or system behavior not stated
    * Do not “connect dots” across excerpts unless the relationship is explicit in the text (e.g., same requestId shown in both excerpts).

    ---

    ## Evidence & citations

    * Every answer must include citations for the supporting excerpts.
    * Citation format:

    * Prefer: **[id: X]**
    * If 'id' is missing, use: **[service: <service> | timestamp: <timestamp>]**
    * If multiple excerpts support the answer, cite all of them.
    * If excerpts conflict:

    * Say you don’t know which is correct.
    * Cite the conflicting excerpts.
    * Optionally state what’s missing in **one short sentence**.

    ---

    ## Result handling rules

    * If the user asks to summarize an excerpt by id:

    * Search for that id.
    * If found, summarize only that excerpt.
    * If not found: **"I don't have enough information to resolve your query"**
    * If the user asks a question clearly unrelated to logs (e.g., weather, general knowledge):

    * Respond: **"I don't have enough information to resolve your query"**
    * If the user’s question is underspecified (e.g., “why did it fail?” with no timeframe/service):

    * Still run the workflow.
    * If results remain unclear: use the standard insufficient-information response.

    ---

    ## Answer style (output rules)

    * Keep responses short, direct, and actionable.
    * Prefer exact facts: event names, timestamps, levels, services, users, IDs.
    * Do **not** mention tools, prompts, searches, internal steps, or “I searched…”.
    * Do not include raw excerpt dumps unless the user asks; summarize precisely instead.

    ---

    ## Examples

    **User:** What is the weather in Tokyo?
    **Assistant:** I don't have enough information to resolve your query

    **User:** Who scheduled the meeting for tomorrow?
    **Assistant:** Alex. [id: 1]

    **User:** What was the reason for the office closure?
    **Assistant:** Severe weather conditions. [id: 3]

    **User:** Summarize the log entry with id "5".
    **Assistant:** Invoice for May was sent and support contact offered. [id: 5]
`

const logs = [
  {
    id: '1',
    timestamp: '2024-06-19T10:00:00Z',
    level: 'ERROR',
    service: 'checkout',
    message:
      'Checkout failed for user alice@example.com. Payment provider timeout after 3 attempts.',
    metadata: {
      request_id: 'req_abc123',
      user_id: 'user_alice_789',
      user_email: 'alice@example.com',
      user_subscription: 'premium',
      account_age_days: 245,
      lifetime_value_cents: 125000,
      checkout_id: 'checkout_xyz456',
      order_id: null,
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 3,
        total_cents: 8999,
        coupon_applied: 'SUMMER20',
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 8500,
        attempt: 3,
        status: 'timeout',
      },
      error: {
        type: 'PaymentProviderTimeout',
        message: 'Payment provider did not respond within 8s timeout',
        code: 'PAYMENT_TIMEOUT',
        retriable: true,
      },
      duration_ms: 12500,
      status_code: 500,
    },
  },
  {
    id: '2',
    timestamp: '2024-06-19T10:05:23Z',
    level: 'INFO',
    service: 'checkout',
    message:
      'Checkout completed successfully for user bob@example.com. Order placed with express checkout.',
    metadata: {
      request_id: 'req_def456',
      user_id: 'user_bob_123',
      user_email: 'bob@example.com',
      user_subscription: 'free',
      account_age_days: 12,
      lifetime_value_cents: 0,
      checkout_id: 'checkout_uvw789',
      order_id: 'order_ord123',
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: true,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 1,
        total_cents: 2999,
        coupon_applied: null,
      },
      payment: {
        method: 'paypal',
        provider: 'paypal',
        latency_ms: 1200,
        attempt: 1,
        status: 'success',
      },
      duration_ms: 1850,
      status_code: 200,
    },
  },
  {
    id: '3',
    timestamp: '2024-06-19T10:12:15Z',
    level: 'ERROR',
    service: 'checkout',
    message:
      'Checkout failed for user charlie@example.com. Invalid credit card number provided.',
    metadata: {
      request_id: 'req_ghi789',
      user_id: 'user_charlie_456',
      user_email: 'charlie@example.com',
      user_subscription: 'premium',
      account_age_days: 890,
      lifetime_value_cents: 450000,
      checkout_id: 'checkout_rst012',
      order_id: null,
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 5,
        total_cents: 15999,
        coupon_applied: null,
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 450,
        attempt: 1,
        status: 'invalid_card',
      },
      error: {
        type: 'InvalidPaymentMethod',
        message: 'Credit card number validation failed',
        code: 'INVALID_CARD',
        retriable: false,
      },
      duration_ms: 650,
      status_code: 400,
    },
  },
  {
    id: '4',
    timestamp: '2024-06-19T09:45:00Z',
    level: 'WARN',
    service: 'checkout',
    message:
      'Checkout completed with high latency for user diana@example.com. Response time 3.2s exceeds threshold.',
    metadata: {
      request_id: 'req_jkl012',
      user_id: 'user_diana_789',
      user_email: 'diana@example.com',
      user_subscription: 'premium',
      account_age_days: 156,
      lifetime_value_cents: 78000,
      checkout_id: 'checkout_mno345',
      order_id: 'order_ord456',
      feature_flags: {
        new_checkout_enabled: false,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.0.8',
      service_version: '2.0.8',
      region: 'us-west-2',
      cart: {
        item_count: 2,
        total_cents: 5999,
        coupon_applied: 'WELCOME10',
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 3100,
        attempt: 1,
        status: 'success',
      },
      duration_ms: 3200,
      status_code: 200,
    },
  },
  {
    id: '5',
    timestamp: '2024-06-19T10:18:42Z',
    level: 'ERROR',
    service: 'checkout',
    message:
      'Checkout failed for user eve@example.com. Payment gateway returned insufficient funds error.',
    metadata: {
      request_id: 'req_pqr345',
      user_id: 'user_eve_234',
      user_email: 'eve@example.com',
      user_subscription: 'free',
      account_age_days: 5,
      lifetime_value_cents: 0,
      checkout_id: 'checkout_stu678',
      order_id: null,
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 1,
        total_cents: 4999,
        coupon_applied: null,
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 890,
        attempt: 1,
        status: 'insufficient_funds',
      },
      error: {
        type: 'PaymentDeclined',
        message: 'Insufficient funds in account',
        code: 'INSUFFICIENT_FUNDS',
        retriable: false,
      },
      duration_ms: 1100,
      status_code: 402,
    },
  },
  {
    id: '6',
    timestamp: '2024-06-19T10:25:10Z',
    level: 'INFO',
    service: 'checkout',
    message:
      'Checkout completed successfully for user frank@example.com. Used new checkout flow with express option.',
    metadata: {
      request_id: 'req_vwx678',
      user_id: 'user_frank_567',
      user_email: 'frank@example.com',
      user_subscription: 'premium',
      account_age_days: 423,
      lifetime_value_cents: 234000,
      checkout_id: 'checkout_yza901',
      order_id: 'order_ord789',
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: true,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 4,
        total_cents: 12999,
        coupon_applied: 'PREMIUM15',
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 680,
        attempt: 1,
        status: 'success',
      },
      duration_ms: 920,
      status_code: 200,
    },
  },
  {
    id: '7',
    timestamp: '2024-06-19T09:30:00Z',
    level: 'INFO',
    service: 'checkout',
    message:
      'Checkout completed successfully for user grace@example.com. Standard checkout flow used.',
    metadata: {
      request_id: 'req_bcd901',
      user_id: 'user_grace_890',
      user_email: 'grace@example.com',
      user_subscription: 'free',
      account_age_days: 78,
      lifetime_value_cents: 15000,
      checkout_id: 'checkout_efg234',
      order_id: 'order_ord012',
      feature_flags: {
        new_checkout_enabled: false,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.0.8',
      service_version: '2.0.8',
      region: 'us-west-2',
      cart: {
        item_count: 1,
        total_cents: 1999,
        coupon_applied: null,
      },
      payment: {
        method: 'paypal',
        provider: 'paypal',
        latency_ms: 1450,
        attempt: 1,
        status: 'success',
      },
      duration_ms: 2100,
      status_code: 200,
    },
  },
  {
    id: '8',
    timestamp: '2024-06-19T10:35:22Z',
    level: 'ERROR',
    service: 'checkout',
    message:
      'Checkout failed for user henry@example.com. Database connection timeout during order creation.',
    metadata: {
      request_id: 'req_hij234',
      user_id: 'user_henry_123',
      user_email: 'henry@example.com',
      user_subscription: 'premium',
      account_age_days: 312,
      lifetime_value_cents: 189000,
      checkout_id: 'checkout_klm567',
      order_id: null,
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 2,
        total_cents: 7999,
        coupon_applied: 'SUMMER20',
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 1200,
        attempt: 1,
        status: 'success',
      },
      error: {
        type: 'DatabaseTimeout',
        message: 'Database connection pool exhausted, timeout after 5s',
        code: 'DB_TIMEOUT',
        retriable: true,
      },
      duration_ms: 5200,
      status_code: 500,
    },
  },
  {
    id: '9',
    timestamp: '2024-06-19T10:40:15Z',
    level: 'INFO',
    service: 'checkout',
    message:
      'Checkout completed successfully for user isabel@example.com. New checkout flow with fast payment processing.',
    metadata: {
      request_id: 'req_nop567',
      user_id: 'user_isabel_456',
      user_email: 'isabel@example.com',
      user_subscription: 'premium',
      account_age_days: 201,
      lifetime_value_cents: 98000,
      checkout_id: 'checkout_qrs890',
      order_id: 'order_ord345',
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: true,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 3,
        total_cents: 10999,
        coupon_applied: null,
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 520,
        attempt: 1,
        status: 'success',
      },
      duration_ms: 750,
      status_code: 200,
    },
  },
  {
    id: '10',
    timestamp: '2024-06-19T10:45:33Z',
    level: 'ERROR',
    service: 'checkout',
    message:
      'Checkout failed for user jack@example.com. Payment provider rate limit exceeded.',
    metadata: {
      request_id: 'req_tuv890',
      user_id: 'user_jack_789',
      user_email: 'jack@example.com',
      user_subscription: 'free',
      account_age_days: 23,
      lifetime_value_cents: 5000,
      checkout_id: 'checkout_wxy123',
      order_id: null,
      feature_flags: {
        new_checkout_enabled: true,
        express_checkout_enabled: false,
      },
      deployment_id: 'deploy_v2.1.3',
      service_version: '2.1.3',
      region: 'us-east-1',
      cart: {
        item_count: 1,
        total_cents: 3999,
        coupon_applied: null,
      },
      payment: {
        method: 'credit_card',
        provider: 'stripe',
        latency_ms: 320,
        attempt: 1,
        status: 'rate_limited',
      },
      error: {
        type: 'RateLimitExceeded',
        message: 'Payment provider rate limit exceeded, retry after 60s',
        code: 'RATE_LIMIT',
        retriable: true,
      },
      duration_ms: 450,
      status_code: 429,
    },
  },
]

const main = async () => {
  const indexingService = createIndexingService({
    embedding: {
      provider: 'google',
      model: 'gemini-embedding-001',
      dimension: 3072,
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE!,
      index: process.env.OPENSEARCH_INDEX!,
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    },
  })
  const chatService = createChatService({
    text: {
      provider: 'google',
      model: {
        low: 'gemini-2.5-flash-lite',
        medium: 'gemini-2.5-flash',
        high: 'gemini-2.5-flash-pro',
      },
    },
    embedding: {
      provider: 'google',
      model: 'gemini-embedding-001',
      dimension: 3072,
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE!,
      index: process.env.OPENSEARCH_INDEX!,
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    },
    systemPrompt: SYSTEM_PROMPT,
    tools: new Set(['knowledge-base-search', 'rewrite-query']),
    activeModelType: 'medium',
  })

  // await indexingService.clearIndex();
  // await indexingService.ensureIndex();

  // await indexingService.indexChunks(logs);

  const result = await chatService.chat(
    `What potential issues could be causing the checkout failure?`
  )
  console.log(result)

  console.log('done')
}

main()
