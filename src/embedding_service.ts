import OpenAI from 'openai';
import { EmbeddingConfig, PersonalVectorStore } from './types';

export class EmbeddingService {
  private readonly openai: OpenAI;
  private readonly config: EmbeddingConfig;

  constructor(apiKey?: string, config: EmbeddingConfig = { model: 'text-embedding-3-large' }) {
    this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    this.config = config;
  }

  private createEmbeddingText(pvs: PersonalVectorStore): string {
    const { identity, communication_style, owner } = pvs;
    
    const embeddingText = [
      `Person: ${owner.name}`,
      owner.role && `Role: ${owner.role}`,
      owner.location && `Location: ${owner.location}`,
      `Bio: ${identity.bio}`,
      `Skills: ${identity.skills.join(', ')}`,
      `Interests: ${identity.interests.join(', ')}`,
      identity.expertise_areas && `Expertise: ${identity.expertise_areas.join(', ')}`,
      identity.achievements && `Achievements: ${identity.achievements.join(', ')}`,
      `Communication tone: ${communication_style.tone}`,
      `Languages: ${communication_style.languages.join(', ')}`,
      `Answer style: ${communication_style.preferences.answers}`,
      `Code style: ${communication_style.preferences.code}`,
      `Explanation style: ${communication_style.preferences.explanations}`
    ].filter(Boolean).join('. ');

    return embeddingText;
  }

  async generateEmbedding(pvs: PersonalVectorStore): Promise<number[]> {
    const text = this.createEmbeddingText(pvs);
    
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.model,
        input: text,
        dimensions: this.config.dimensions,
        encoding_format: this.config.encoding_format || 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }
}
