import { PersonalVectorStore } from '../types';
import { BaseLLMAdapter } from './base_adapter';

export class AnthropicAdapter extends BaseLLMAdapter {
  name = 'Anthropic Claude';
  private readonly apiKey: string;
  readonly model: string;

  constructor(apiKey?: string, model = 'claude-3-sonnet-20240229') {
    super();
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = model;
  }

  async inject(pvs: PersonalVectorStore, additionalPrompt?: string): Promise<string> {
    return this.createSystemPrompt(pvs, additionalPrompt);
  }

  async query(prompt: string, context: string): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          system: context,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || 'No response generated';
    } catch (error) {
      throw new Error(`Anthropic API error: ${error}`);
    }
  }
}
