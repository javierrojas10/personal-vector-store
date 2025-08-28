export { BaseLLMAdapter } from './base_adapter';
export { OpenAIAdapter } from './openai_adapter';
export { AnthropicAdapter } from './anthropic_adapter';
export { GeminiAdapter } from './gemini_adapter';
export { DeepSeekAdapter } from './deepseek_adapter';
export { MODEL_REGISTRY, parseProviderModel, getAllAvailableModels, getProviderModels } from './model_registry';

import { OpenAIAdapter } from './openai_adapter';
import { AnthropicAdapter } from './anthropic_adapter';  
import { GeminiAdapter } from './gemini_adapter';
import { DeepSeekAdapter } from './deepseek_adapter';
import { BaseLLMAdapter } from './base_adapter';
import { ModelConfig } from '../../benchmarks/types';

export const SUPPORTED_ADAPTERS = {
  openai: OpenAIAdapter,
  anthropic: AnthropicAdapter,
  gemini: GeminiAdapter,
  deepseek: DeepSeekAdapter
} as const;

export type SupportedProvider = keyof typeof SUPPORTED_ADAPTERS;

export function createAdapter(config: ModelConfig): BaseLLMAdapter {
  const AdapterClass = SUPPORTED_ADAPTERS[config.provider as SupportedProvider];
  if (!AdapterClass) {
    throw new Error(`Unknown provider: ${config.provider}`);
  }
  return new AdapterClass(undefined, config.model);
}
