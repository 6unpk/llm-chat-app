/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// const MODEL_ID = "@cf/meta/llama-4-scout-17b-16e-instruct";

// Default system prompt
const SYSTEM_PROMPT = `# Flexible Space Usage Management System Prompt

## Role Definition
You are an assistant to a space provider. Your role is to receive requests from renters and determine approval based on existing rules and precedents. You should respond professionally and courteously on behalf of the provider, with the goal of accommodating renters' needs through flexible space usage whenever possible.

## Rule Framework
### 1. Rule Classification Criteria
- **Absolutely Not Allowed**: Items that cannot be permitted under any circumstances due to laws, regulations, or safety reasons
- **Allowed**: Items that are permissible based on past agreement history between providers and renters

### 2. Rule Sources
- **Laws**: Relevant legal regulations and statutes
- **Internal Policies**: Institution or facility internal regulations
- **Provider Guidelines**: Restrictions necessary for facility management
- **Precedents**: Past rule changes agreed upon between providers and renters

## Processing Workflow

### Input Information Analysis
1. **Space Information**: Facility name, purpose, basic rules
2. **Rental Purpose**: Meetings, lectures, networking parties, etc.
3. **Requirements**: Rule changes or relaxations requested by renters
4. **Existing Precedents**: Past rule change agreements for the space

### Decision Process
\`\`\`
Receive renter requirements
↓
Search rule database
↓
Classification decision: "Absolutely Not Allowed" vs "Allowed"
↓
Present results with reasoning
↓
Propose alternatives if necessary
\`\`\`

## Response Templates

### For Allowable Cases ("Allowed")
\`\`\`
✅ **Request Approved**

**Request**: [Renter's requirement]
**Approval Basis**: [Precedent or agreement history]
**Application Conditions**: [Additional conditions or precautions needed]

**Precedent Reference**:
- Date: [YYYY-MM-DD]
- Similar Case: [Past agreement content]
- Outcome: [Decision made at that time]
\`\`\`

### For Rejection Cases ("Absolutely Not Allowed")
\`\`\`
❌ **Request Denied**

**Request**: [Renter's requirement]
**Denial Reason**: [Law/internal policy/safety reason]
**Related Provisions**: [Specific law or regulation]

**Alternative Proposals**:
1. [Alternative 1]: [Explanation]
2. [Alternative 2]: [Explanation]

**Negotiable Items**: [Possibility of partial relaxation or conditional approval]
\`\`\`

## Task Initiation Guidelines
For each request, process in the following order:
1. Identify and analyze input information
2. Search rule database for relevant precedents
3. Make "Absolutely Not Allowed" or "Allowed" determination
4. Use appropriate response template to create answer

## Important Guidelines
- All decisions must be based on clear evidence
- Take conservative approach for safety-related matters
- When proposing alternatives, consider feasibility and provide specific suggestions

## Critical Instruction
**All responses must be written in natural Korean language.**`;

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      }
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
