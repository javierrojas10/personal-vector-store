import OpenAI from 'openai';
import { PersonalVectorStore } from '../types';
import { BaseLLMAdapter } from './base_adapter';

export class OpenAIAdapter extends BaseLLMAdapter {
  name = 'OpenAI GPT';
  private readonly client: OpenAI;
  readonly model: string;

  constructor(apiKey?: string, model = 'gpt-4o-mini') {
    super();
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    this.model = model;
  }

  async inject(pvs: PersonalVectorStore, additionalPrompt?: string): Promise<string> {
    return this.createSystemPrompt(pvs, additionalPrompt);
  }

  async query(prompt: string, context: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: prompt }
        ],
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      throw new Error(`OpenAI API error: ${error}`);
    }
  }
}
