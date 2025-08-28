import { PersonalVectorStore } from '../types';
import { BaseLLMAdapter } from './base_adapter';

export class DeepSeekAdapter extends BaseLLMAdapter {
  name = 'DeepSeek';
  private readonly apiKey: string;
  readonly model: string;

  constructor(apiKey?: string, model = 'deepseek-chat') {
    super();
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.model = model;
  }

  async inject(pvs: PersonalVectorStore, additionalPrompt?: string): Promise<string> {
    return this.createSystemPrompt(pvs, additionalPrompt);
  }

  async query(prompt: string, context: string): Promise<string> {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: context },
            { role: 'user', content: prompt }
          ],
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response generated';
    } catch (error) {
      throw new Error(`DeepSeek API error: ${error}`);
    }
  }
}
