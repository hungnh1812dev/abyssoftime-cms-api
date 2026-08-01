import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const aiSection: KnowledgeSection = {
  id: "ai",
  title: "AI Overview",
  icon: "Sparkles",
  description: "AI Agents, language models, prompt engineering, and safety control architectures.",
  style: {
    iconColor: "text-pink-500",
    headerBg: "bg-pink-500/10 dark:bg-pink-500/[0.08]",
    headerBorder: "border-pink-500/20 dark:border-pink-500/30",
    accentBorder: "border-pink-500/50 dark:border-pink-500/30",
    sidebarBg: "bg-pink-500/10",
    sidebarText: "text-pink-700 dark:text-pink-300",
  },
  items: [
    {
      id: "ai-agents",
      title: "AI Agents",
      summary: "Agents are AI systems capable of planning and executing actions through tools.",
      tags: ["agents", "tool use", "ReAct", "multi-agent", "agentic loop"],
      body: "**AI Agents** are systems combining a Large Language Model (LLM) with tool access to accomplish complex tasks beyond simple one-shot generation. An agent plans, executes actions, observes results, and iterates dynamically.\n\n**ReAct Pattern** (Reasoning + Acting):\n1. **Thought**: The LLM reasons about the next step or task requirement.\n2. **Action**: Invokes a tool (e.g., search, shell command, database query, API request).\n3. **Observation**: Captures and processes the output returned by the tool.\n4. Repeats the loop until the overall task is accomplished.\n\n**Agentic Loop**: The agent continuously cycles through planning → acting → observing. It requires clear termination criteria (e.g., max iterations, task completion checks, human approval requests).\n\n**Multi-agent Architectures**: Multiple specialized agents collaborate. Common patterns include: orchestrator-subagent, peer-to-peer, and sequential pipelines. This increases system capability at the expense of complexity and API token cost.",
      subtopics: [
        {
          title: "Tool Use (Function Calling)",
          body: "The LLM is provided with schemas representing available tools (usually structured as JSON Schemas). The LLM determines when to call a tool and with what arguments. The application runtime then executes the tool on the model's behalf and returns the outcome to the LLM's conversation context.",
          codeExample: {
            language: "typescript",
            code: `// Anthropic Claude API — tool use
const response = await anthropic.messages.create({
  model: "claude-opus-4-7",
  tools: [{
    name: "search_web",
    description: "Search the web for current information",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" }
      },
      required: ["query"]
    }
  }],
  messages: [{ role: "user", content: "What's the latest React version?" }]
});

// Handle tool use
if (response.stop_reason === "tool_use") {
  const toolUse = response.content.find(b => b.type === "tool_use");
  const result = await executeSearch(toolUse.input.query);
  // Continue conversation with tool result...
}`,
          },
        },
        {
          title: "Human-in-the-Loop",
          body: "When actions carry high risk (e.g. running code on host systems, sending emails, mutating databases), the agent should pause execution and request human authorization. This mitigates the blast radius of model errors.",
        },
      ],
    },
    {
      id: "ai-models",
      title: "Language Models",
      summary: "Transformer architectures, context windows, tokenization, and inference parameters.",
      tags: ["LLM", "transformer", "context window", "temperature", "tokenization"],
      body: "**Large Language Models (LLMs)** are deep neural networks based on the Transformer architecture, trained to predict the next token in a sequence. They lack reasoning engines; instead, they generate the token with the highest probability relative to the prompt and training weights.\n\n**Transformer Architecture**: Relies on attention mechanisms to learn relationships between tokens across long spans. Key elements include self-attention, multi-head attention, and positional encoding.\n\n**Context Window**: The maximum number of tokens a model can process in a single request/response cycle. Claude 3.x offers up to 200k tokens; GPT-4o supports 128k. Larger contexts incur higher costs and latency.\n\n**Tokenization**: Text is split into tokens (sub-word units). One token is approximately 4 characters in English, or 1-2 characters in Vietnamese/CJK languages. API pricing is calculated based on token counts.",
      subtopics: [
        {
          title: "Inference Parameters",
          body: "**Temperature** (0-1): Higher values increase randomness and creativity, while lower values make output deterministic. **Top-p (nucleus sampling)**: Limits sampling to the top p% probability mass. **Top-k**: Limits sampling to the k highest-probability tokens. **Max tokens**: Sets a strict limit on output length.",
          codeExample: {
            language: "typescript",
            code: `// Conservative: code generation, factual Q&A
{ temperature: 0.1, top_p: 0.9 }

// Balanced: general tasks
{ temperature: 0.7, top_p: 0.9 }

// Creative: brainstorming, creative writing
{ temperature: 1.0, top_p: 0.95 }`,
          },
        },
        {
          title: "Model Families (2025)",
          body: "**Claude** (Anthropic): Opus 4.7 (highly capable), Sonnet 4.6 (balanced speed and intelligence), Haiku 4.5 (fast and cheap). **GPT** (OpenAI): GPT-4o, o1/o3 (reasoning models). **Gemini** (Google): 1.5 Pro/Flash, 2.0 Flash. **Llama** (Meta): Open-source and self-hostable.\n\nTrending: Reasoning models (o1, Claude with extended thinking) run internal chain-of-thought steps before returning responses.",
        },
      ],
    },
    {
      id: "ai-prompt-engineering",
      title: "Prompt Engineering",
      summary: "Techniques to design effective prompts to get the best outputs from LLMs.",
      tags: ["prompting", "few-shot", "chain-of-thought", "system prompt", "structured output"],
      body: "Prompt engineering is the practice of structuring inputs to guide LLM behavior to produce reliable outputs.\n\n**System Prompt**: Establishes the model's persona, context, constraints, and output format for the entire conversation. It runs prior to user-provided messages.\n\n**Few-shot Prompting**: Provides examples of inputs and desired outputs in the prompt, dramatically increasing performance on structured tasks compared to zero-shot queries.\n\n**Chain-of-Thought (CoT)**: Commands the model to 'think step by step'. This improves performance in reasoning, math, and logical synthesis tasks.\n\n**Structured Output**: Instructs the model to output data formatted in JSON/YAML matching a strict schema. Implemented via system parameters like `response_format` or by explicit prompt definitions.",
      subtopics: [
        {
          title: "Prompt Injection",
          body: "An attack vector where users embed rogue instructions inside input values to override system prompts. Mitigate by sanitizing inputs, maintaining separate system/user message turns, and practicing privilege separation (e.g. preventing user inputs from accessing agent system tools directly).",
        },
        {
          title: "Prompt Caching",
          body: "Supported by models like Claude to cache static portions of prompts (such as system instructions or long document contexts). This reduces costs by up to 90% and latency by up to 85% for cached segments. Configured using parameters like `cache_control: { type: 'ephemeral' }`.",
          codeExample: {
            language: "typescript",
            code: `const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  system: [
    {
      type: "text",
      text: longSystemPrompt, // 10k+ tokens
      cache_control: { type: "ephemeral" }, // cache this
    }
  ],
  messages: [{ role: "user", content: userQuery }] // dynamic
});`,
          },
        },
      ],
    },
    {
      id: "ai-control",
      title: "Control & Safety",
      summary: "Guardrails, sandboxing, model evaluations, and responsible AI deployment.",
      tags: ["guardrails", "safety", "evaluation", "sandboxing", "alignment"],
      body: "Deploying AI agents in production environments requires robust control mechanisms.\n\n**Input/Output Guardrails**: Filters user inputs prior to processing and verifies outputs before executing or displaying them. You can use separate, cheaper LLM instances to judge output safety.\n\n**Sandboxing**: Executes generated code in isolated virtual environments (e.g. Docker, WASM, e2b.dev) to limit filesystem, network, and system access.\n\n**Reversibility**: Prioritize actions that can be undone. Stage changes before committing and keep backups prior to destructive operations.\n\n**Model Evaluation (Evals)**: Implement automated test suites to measure performance on task-specific benchmarks. Use LLM-as-a-judge approaches for open-ended text evaluation.\n\n**Observability**: Log all API details (inputs, outputs, tokens, latency, cost) and track multi-step flows to detect anomalies.",
      subtopics: [
        {
          title: "Minimal Footprint Principle",
          body: "Agents should request only the minimum permissions needed to fulfill a task, prefer reversible changes, and verify execution scopes with users when uncertainties arise.",
        },
        {
          title: "Context Window Management",
          body: "Long agent sessions exhaust the context window, degrading performance and increasing costs. Strategies include summarizing historical logs, storing long-term context in vector databases, and pruning unimportant system messages.",
        },
      ],
    },
    {
      id: "ai-frontend-integration",
      title: "AI in Frontend",
      summary: "Integrating AI features into React applications: response streaming, UI patterns, and UX considerations.",
      tags: ["streaming", "Vercel AI SDK", "useChat", "streaming UI", "React"],
      body: "Integrating AI interactions into web applications introduces specific interface design challenges:\n\n**Streaming Responses**: Models output text tokens incrementally. Streaming updates to the client provides a responsive UX compared to waiting for the full generation. Implemented via Server-Sent Events (SSE) or Fetch streams.\n\n**Vercel AI SDK**: Provides custom hooks like `useChat()` and `useCompletion()` to handle message history, streaming, and loading indicators, alongside server utility helpers like `streamText()`.\n\n**Optimistic UI**: Renders user queries immediately and displays typing indicator states during network streaming.\n\n**Error Handling**: Gracefully degrades the experience and implements retries when encountering rate limits or server timeouts.",
      codeExample: {
        language: "typescript",
        code: `// Vercel AI SDK usage example
import { useChat } from "ai/react";

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    onError: (error) => console.error(error),
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
          {m.content}
        </div>
      ))}
      {isLoading && <TypingIndicator />}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}`,
      },
    },
  ],
};
