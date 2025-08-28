import { ModelConfig } from '../../benchmarks/types';

export interface ProviderModels {
  [provider: string]: {
    default: string;
    available: string[];
    displayNames: { [model: string]: string };
  };
}

export const MODEL_REGISTRY: ProviderModels = {
  openai: {
    default: 'gpt-4o-mini',
    available: [
      'gpt-5-mini',
      'gpt-5',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ],
    displayNames: {
      'gpt-5-mini': 'GPT-5 Mini',
      'gpt-5': 'GPT-5',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    }
  },
  anthropic: {
    default: 'claude-sonnet-4-20250514',
    available: [
      'claude-sonnet-4-20250514'
    ],
    displayNames: {
      'claude-sonnet-4-20250514': 'Claude Sonnet 4 (Latest)'
    }
  },
  gemini: {
    default: 'gemini-1.5-pro',
    available: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro'
    ],
    displayNames: {
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B',
      'gemini-1.0-pro': 'Gemini 1.0 Pro'
    }
  },
  deepseek: {
    default: 'deepseek-chat',
    available: [
      'deepseek-chat',
      'deepseek-coder'
    ],
    displayNames: {
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder'
    }
  }
};

export function parseProviderModel(input: string): ModelConfig {
  const parts = input.split(':');
  
  if (parts.length === 1) {
    // Just provider, use default model
    const provider = parts[0];
    if (!(provider in MODEL_REGISTRY)) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    const model = MODEL_REGISTRY[provider].default;
    return {
      provider,
      model,
      displayName: MODEL_REGISTRY[provider].displayNames[model]
    };
  }
  
  if (parts.length === 2) {
    // Provider:model format
    const [provider, model] = parts;
    if (!(provider in MODEL_REGISTRY)) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    if (!MODEL_REGISTRY[provider].available.includes(model)) {
      throw new Error(`Model '${model}' not available for provider '${provider}'. Available models: ${MODEL_REGISTRY[provider].available.join(', ')}`);
    }
    
    return {
      provider,
      model,
      displayName: MODEL_REGISTRY[provider].displayNames[model] || model
    };
  }
  
  throw new Error(`Invalid provider:model format: ${input}. Use 'provider' or 'provider:model'`);
}

export function getAllAvailableModels(): ModelConfig[] {
  const models: ModelConfig[] = [];
  
  for (const [provider, config] of Object.entries(MODEL_REGISTRY)) {
    for (const model of config.available) {
      models.push({
        provider,
        model,
        displayName: config.displayNames[model] || model
      });
    }
  }
  
  return models;
}

export function getProviderModels(provider: string): ModelConfig[] {
  if (!(provider in MODEL_REGISTRY)) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  const config = MODEL_REGISTRY[provider];
  return config.available.map(model => ({
    provider,
    model,
    displayName: config.displayNames[model] || model
  }));
}
