#!/usr/bin/env ts-node
import { config } from 'dotenv';
import { BenchmarkRunner } from './benchmark_runner';
import { parseProviderModel, getProviderModels, MODEL_REGISTRY } from '../src/adapters';
import { ModelConfig } from './types';
import { logger } from './console_utils';
import { EvaluationCriteria } from './response_evaluator';

config();

interface BenchmarkOptions {
  models?: string[];
  questions?: string;
  pvs?: string;
  output?: string;
  listModels?: boolean;
  noAiEval?: boolean;        // Disable AI-powered evaluation
  evalWeights?: string;      // Custom evaluation weights (alignment:consistency:relevance)
}

async function main() {
  const args = process.argv.slice(2);
  
  const options: BenchmarkOptions = {
    models: ['openai'], // Default to just openai with default model
    questions: 'benchmarks/questions.json',
    pvs: 'generated_pvs.json',
    output: undefined,
    listModels: false,
    noAiEval: false,
    evalWeights: undefined
  };

  // Parse command line arguments
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--models':
        options.models = args[i + 1]?.split(',') || [];
        i += 2;
        break;
      case '--questions':
        options.questions = args[i + 1];
        i += 2;
        break;
      case '--pvs':
        options.pvs = args[i + 1];
        i += 2;
        break;
      case '--output':
        options.output = args[i + 1];
        i += 2;
        break;
      case '--list-models':
        options.listModels = true;
        i += 1;
        break;
      case '--no-ai-eval':
        options.noAiEval = true;
        i += 1;
        break;
      case '--eval-weights':
        options.evalWeights = args[i + 1];
        i += 2;
        break;
      case '--help':
        showHelp();
        return;
      default:
        i++;
        break;
    }
  }

  try {
    // Handle list models option
    if (options.listModels) {
      showAvailableModels();
      return;
    }

    // Parse model configurations
    const modelConfigs: ModelConfig[] = [];
    for (const modelString of options.models || []) {
      try {
        const config = parseProviderModel(modelString);
        modelConfigs.push(config);
      } catch (error) {
        logger.error(`Invalid model specification: ${modelString}`);
        logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }

    if (modelConfigs.length === 0) {
      logger.error('No valid models specified. Use --list-models to see available options.');
      process.exit(1);
    }
    
    // Create evaluation criteria from options
    const evaluationCriteria = createEvaluationCriteria(options);
    
    const runner = new BenchmarkRunner(options.questions!, options.pvs!, evaluationCriteria);
    const report = await runner.runBenchmark(modelConfigs);
    
    await runner.saveReport(report, options.output);
    
    logger.success('Benchmark completed successfully!');
    
  } catch (error) {
    logger.error(`Benchmark failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function parseWeightString(weightString: string): number[] {
  const weights = weightString.split(':').map(w => parseFloat(w.trim()));
  
  if (weights.length !== 3 || weights.some(w => isNaN(w) || w < 0 || w > 1)) {
    throw new Error('Evaluation weights must be three numbers between 0-1, separated by colons (e.g., "0.4:0.3:0.3")');
  }
  
  return weights;
}

function validateWeightSum(weights: number[]): void {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.01) {
    throw new Error(`Evaluation weights must sum to 1.0, got ${sum}`);
  }
}

function applyCustomWeights(criteria: EvaluationCriteria, weights: number[]): void {
  criteria.alignment_weight = weights[0];
  criteria.consistency_weight = weights[1];
  criteria.relevance_weight = weights[2];
  logger.info(`📊 Using custom evaluation weights: A:${weights[0]} C:${weights[1]} R:${weights[2]}`);
}

function createEvaluationCriteria(options: BenchmarkOptions): EvaluationCriteria {
  const criteria: EvaluationCriteria = {
    alignment_weight: 0.4,
    consistency_weight: 0.3,
    relevance_weight: 0.3,
    use_ai_evaluation: !options.noAiEval
  };

  // Apply custom evaluation weights if provided
  if (options.evalWeights) {
    try {
      const weights = parseWeightString(options.evalWeights);
      validateWeightSum(weights);
      applyCustomWeights(criteria, weights);
    } catch (error) {
      logger.error(`Failed to parse evaluation weights: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  // Log evaluation mode
  const evaluationMode = options.noAiEval 
    ? '🤖 AI-powered evaluation disabled - using algorithmic scoring only'
    : '🧠 AI-powered evaluation enabled - using hybrid algorithmic + AI scoring';
  logger.info(evaluationMode);

  return criteria;
}

function showHelp() {
  console.log(`
${'═'.repeat(60)}
PVS Benchmark Runner
${'═'.repeat(60)}

Usage: npm run benchmark [options]

Options:
  --models <list>       Comma-separated list of provider:model combinations
                        Use 'provider' for default model or 'provider:model' for specific model
  --questions <path>    Path to questions file (default: benchmarks/questions.json)
  --pvs <path>         Path to generated PVS file (default: generated_pvs.json)
  --output <path>      Output file name (default: auto-generated)
  --no-ai-eval         Disable AI-powered evaluation (use algorithmic scoring only)
  --eval-weights <w>   Custom evaluation weights as alignment:consistency:relevance (e.g., 0.5:0.3:0.2)
  --list-models        Show all available models and exit
  --help               Show this help message

Examples:
  npm run benchmark
  npm run benchmark -- --models openai,anthropic
  npm run benchmark -- --models openai:gpt-4o,anthropic:claude-3-5-sonnet-20241022
  npm run benchmark -- --models gemini:gemini-1.5-pro --output my_benchmark.json
  npm run benchmark -- --no-ai-eval --models openai
  npm run benchmark -- --eval-weights 0.5:0.3:0.2 --models anthropic
  npm run benchmark -- --list-models

Model Format:
  - 'openai' - Uses default OpenAI model (${MODEL_REGISTRY.openai.default})
  - 'openai:gpt-4o' - Uses specific OpenAI model
  - Multiple models: 'openai:gpt-4o,anthropic:claude-3-opus-20240229'
  `);
}

function showAvailableModels() {
  const modelsByProvider: { [provider: string]: ModelConfig[] } = {};
  
  for (const provider of Object.keys(MODEL_REGISTRY)) {
    modelsByProvider[provider] = getProviderModels(provider);
  }
  
  logger.displayAvailableModels(modelsByProvider);
}

if (require.main === module) {
  main();
}
