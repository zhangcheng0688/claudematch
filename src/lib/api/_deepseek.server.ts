/**
 * Backward-compatibility re-export.
 *
 * The canonical LLM client now lives in `./_llm.server.ts` and supports
 * multi-provider fallback (DeepSeek -> MiniMax -> Kimi), per-provider retry,
 * and request-level deadlines.
 *
 * Existing imports of `deepseekChat` continue to work but now route through
 * the unified provider chain under the hood.
 */

export {
  llmChat as deepseekChat,
  safeParseJSON,
  type LLMMessage as DSMessage,
  type LLMCallOptions as DeepseekCallOptions,
  type LLMError as DeepseekError,
  type LLMErrorReason,
} from "./_llm.server";
