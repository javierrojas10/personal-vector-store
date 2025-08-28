import { PersonalVectorStore } from '../types';
import { BaseLLMAdapter } from './base_adapter';

export class GeminiAdapter extends BaseLLMAdapter {
  name = 'Google Gemini';
  private readonly apiKey: string;
  readonly model: string;

  constructor(apiKey?: string, model = 'gemini-1.5-pro') {
    super();
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
    this.model = model;
  }

  async inject(pvs: PersonalVectorStore, additionalPrompt?: string): Promise<string> {
    return this.createSystemPrompt(pvs, additionalPrompt);
  }

  async query(prompt: string, context: string): Promise<string> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${context}\n\nUser: ${prompt}`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 1500
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      throw new Error(`Gemini API error: ${error}`);
    }
  }
}
