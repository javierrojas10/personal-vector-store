export * from './types';
export * from './embedding_service';
export * from './generate_pvs';
export * from './adapters';
export * from './token_estimator';

// Main PVS class for easy usage
import { PersonalVectorStore, EmbeddingConfig } from './types';
import { EmbeddingService } from './embedding_service';
import { SUPPORTED_ADAPTERS, SupportedProvider } from './adapters';

export class PVS {
  private pvs: PersonalVectorStore;
  private embeddingService: EmbeddingService;

  constructor(pvs: PersonalVectorStore, embeddingConfig?: EmbeddingConfig) {
    this.pvs = pvs;
    this.embeddingService = new EmbeddingService(undefined, embeddingConfig);
  }

  static async fromFile(filePath: string, embeddingConfig?: EmbeddingConfig): Promise<PVS> {
    const fs = require('fs');
    const pvs: PersonalVectorStore = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return new PVS(pvs, embeddingConfig);
  }

  async regenerateEmbedding(): Promise<void> {
    const vector = await this.embeddingService.generateEmbedding(this.pvs);
    this.pvs.embedding = {
      model: this.embeddingService['config'].model,
      vector,
      generated_at: new Date().toISOString()
    };
  }

  getAdapter(provider: SupportedProvider, apiKey?: string, model?: string): any {
    const AdapterClass = SUPPORTED_ADAPTERS[provider];
    return new AdapterClass(apiKey, model);
  }

  async injectInto(provider: SupportedProvider, additionalPrompt?: string, apiKey?: string, model?: string): Promise<string> {
    const adapter = this.getAdapter(provider, apiKey, model);
    return await adapter.inject(this.pvs, additionalPrompt);
  }

  getPVS(): PersonalVectorStore {
    return this.pvs;
  }

  getEmbedding(): number[] {
    return this.pvs.embedding.vector;
  }

  save(filePath: string): void {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(this.pvs, null, 2));
  }
}
