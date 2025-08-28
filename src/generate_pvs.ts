import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { PersonalVectorStore } from './types';
import { EmbeddingService } from './embedding_service';

config();

interface GeneratorOptions {
  inputPath?: string;
  outputPath?: string;
  model?: string;
  overwrite?: boolean;
}

export class PVSGenerator {
  private readonly embeddingService: EmbeddingService;

  constructor(apiKey?: string, model = 'text-embedding-3-large') {
    this.embeddingService = new EmbeddingService(apiKey, { model });
  }

  async generateFromFile(options: GeneratorOptions = {}): Promise<PersonalVectorStore> {
    const {
      inputPath = 'pvs.json',
      outputPath = 'generated_pvs.json',
      overwrite = false
    } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    if (fs.existsSync(outputPath) && !overwrite) {
      throw new Error(`Output file exists: ${outputPath}. Use --overwrite flag to replace.`);
    }

    const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as PersonalVectorStore;
    
    if (!inputData.pvs_version) {
      inputData.pvs_version = '0.1';
    }

    console.log('Generating embedding...');
    const vector = await this.embeddingService.generateEmbedding(inputData);

    const completePVS: PersonalVectorStore = {
      ...inputData,
      embedding: {
        model: this.embeddingService['config'].model,
        vector,
        generated_at: new Date().toISOString()
      },
      metadata: {
        created_at: inputData.metadata?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: path.basename(inputPath)
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(completePVS, null, 2));
    console.log(`✓ Generated PVS saved to: ${outputPath}`);
    console.log(`✓ Vector dimensions: ${vector.length}`);
    console.log(`✓ Model used: ${completePVS.embedding.model}`);

    return completePVS;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  const modelIndex = args.indexOf('--model');
  
  const options: GeneratorOptions = {
    inputPath: inputIndex !== -1 ? args[inputIndex + 1] : 'pvs.json',
    outputPath: outputIndex !== -1 ? args[outputIndex + 1] : 'generated_pvs.json',
    model: modelIndex !== -1 ? args[modelIndex + 1] : 'text-embedding-3-large',
    overwrite: args.includes('--overwrite')
  };

  try {
    const generator = new PVSGenerator(process.env.OPENAI_API_KEY, options.model);
    await generator.generateFromFile(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
