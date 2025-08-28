export interface PVSOwner {
  name: string;
  role?: string;
  location?: string;
}

export interface PVSIdentity {
  bio: string;
  skills: string[];
  interests: string[];
  expertise_areas?: string[];
  achievements?: string[];
}

export interface PVSCommunicationStyle {
  tone: 'direct' | 'friendly' | 'formal' | 'casual' | 'technical';
  languages: string[];
  preferences: {
    answers: string;
    code: string;
    explanations: string;
  };
}

export interface PVSEmbedding {
  model: string;
  vector: number[];
  generated_at: string;
}

export interface PersonalVectorStore {
  pvs_version: string;
  owner: PVSOwner;
  identity: PVSIdentity;
  communication_style: PVSCommunicationStyle;
  embedding: PVSEmbedding;
  metadata?: {
    created_at: string;
    updated_at: string;
    source: string;
  };
}

export interface EmbeddingConfig {
  model: string;
  dimensions?: number;
  encoding_format?: 'float' | 'base64';
}

export interface LLMAdapter {
  name: string;
  inject(pvs: PersonalVectorStore, systemPrompt?: string): Promise<string>;
  query(prompt: string, context: string): Promise<string>;
}
