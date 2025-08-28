#!/usr/bin/env ts-node
import { config } from 'dotenv';
import * as fs from 'fs';
import { PersonalVectorStore } from './types';
import { TokenEstimator, MODEL_LIMITS } from './token_estimator';

config();

interface AnalyzerOptions {
  pvsPath?: string;
  model?: string;
  query?: string;
  additional?: string;
  optimize?: boolean;
}

function parseArgs(): AnalyzerOptions {
  const args = process.argv.slice(2);
  const options: AnalyzerOptions = {
    pvsPath: 'generated_pvs.json',
    model: 'gpt-5-mini'
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--pvs':
        options.pvsPath = args[i + 1];
        i += 2;
        break;
      case '--model':
        options.model = args[i + 1];
        i += 2;
        break;
      case '--query':
        options.query = args[i + 1];
        i += 2;
        break;
      case '--additional':
        options.additional = args[i + 1];
        i += 2;
        break;
      case '--optimize':
        options.optimize = true;
        i++;
        break;
      case '--help':
        showHelp();
        process.exit(0);
      default:
        i++;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
PVS Token Analyzer

Estimates token consumption for your Personal Vector Store when used with LLMs.

Usage: npx ts-node src/cli_token_analyzer.ts [options]

Options:
  --pvs <path>         Path to PVS file (default: generated_pvs.json)
  --model <name>       Model to analyze for (default: gpt-5-mini)
                      Options: gpt-5-mini, gpt-5-turbo, gpt-3.5-turbo, 
                               claude-3-sonnet, claude-3-haiku, 
                               gemini-1.5-pro, deepseek-chat
  --query <text>       Include a sample user query in analysis
  --additional <text>  Additional system prompt to include
  --optimize          Show optimization suggestions
  --help              Show this help

Examples:
  npx ts-node src/cli_token_analyzer.ts
  npx ts-node src/cli_token_analyzer.ts --model claude-3-sonnet --optimize
  npx ts-node src/cli_token_analyzer.ts --query "Help me build an API" --model gpt-5-turbo
  `);
}

function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'optimal': return '✅';
    case 'warning': return '⚠️';
    case 'critical': return '❌';
    default: return 'ℹ️';
  }
}

async function main() {
  const options = parseArgs();

  if (!fs.existsSync(options.pvsPath!)) {
    console.error(`❌ PVS file not found: ${options.pvsPath}`);
    console.log('Run "npm run generate" first to create a PVS file.');
    process.exit(1);
  }

  try {
    const pvs: PersonalVectorStore = JSON.parse(fs.readFileSync(options.pvsPath!, 'utf-8'));
    const estimator = new TokenEstimator();

    console.log('🔍 PVS Token Analysis');
    console.log('===================\\n');

    // Basic PVS info
    console.log(`📊 Profile: ${pvs.owner.name}`);
    console.log(`🤖 Model: ${options.model}`);
    console.log(`📄 PVS File: ${options.pvsPath}\\n`);

    // Model limits
    const modelLimits = MODEL_LIMITS[options.model!] || MODEL_LIMITS['gpt-5-mini'];
    console.log('📋 Model Limits:');
    console.log(`   Context Window: ${formatTokens(modelLimits.contextWindow)} tokens`);
    console.log(`   Recommended System Prompt: ${formatTokens(modelLimits.recommendedSystemPrompt)} tokens`);
    console.log(`   Warning Threshold: ${formatTokens(modelLimits.warningThreshold)} tokens\\n`);

    // Analyze tokens
    const analysis = estimator.analyzeForModel(
      pvs,
      options.model!,
      options.query,
      options.additional
    );

    const { breakdown, analysis: result } = analysis;

    // Token breakdown
    console.log('🎯 Token Breakdown:');
    console.log(`   Header: ${formatTokens(breakdown.sections.header)} tokens`);
    console.log(`   Identity & Expertise: ${formatTokens(breakdown.sections.identity)} tokens`);
    console.log(`   Communication Style: ${formatTokens(breakdown.sections.communication)} tokens`);
    console.log(`   Footer: ${formatTokens(breakdown.sections.footer)} tokens`);
    if (breakdown.sections.additional) {
      console.log(`   Additional Prompt: ${formatTokens(breakdown.sections.additional)} tokens`);
    }
    console.log(`   ─────────────────────────`);
    console.log(`   Total System Prompt: ${formatTokens(breakdown.systemPrompt)} tokens`);

    if (options.query) {
      console.log(`   User Query: ${formatTokens(breakdown.userQuery)} tokens`);
      console.log(`   Total Input: ${formatTokens(breakdown.totalInput)} tokens`);
      console.log(`   Max Response: ${formatTokens(breakdown.maxResponse)} tokens`);
      console.log(`   Total Estimated: ${formatTokens(breakdown.totalEstimated)} tokens`);
    }

    console.log('\\n');

    // Status analysis
    console.log(`${getStatusIcon(result.status)} Status: ${result.status.toUpperCase()}`);
    console.log(`   ${result.message}\\n`);

    if (result.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      result.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion}`);
      });
      console.log('');
    }

    // Optimization report
    if (options.optimize) {
      console.log('🔧 Optimization Report:');
      console.log('======================\\n');

      const optimizationReport = estimator.generateOptimizationReport(pvs);
      
      if (optimizationReport.optimizationTips.length === 0) {
        console.log('✅ Your PVS is already well-optimized for token efficiency!\\n');
      } else {
        console.log('Potential optimizations:\\n');
        
        let totalPotentialSavings = 0;
        optimizationReport.optimizationTips.forEach(tip => {
          console.log(`📝 ${tip.field}:`);
          console.log(`   Current: ${formatTokens(tip.currentTokens)} tokens`);
          console.log(`   Suggestion: ${tip.suggestion}`);
          console.log(`   Potential savings: ${formatTokens(tip.potentialSavings)} tokens\\n`);
          totalPotentialSavings += tip.potentialSavings;
        });

        if (totalPotentialSavings > 0) {
          console.log(`💰 Total potential savings: ${formatTokens(totalPotentialSavings)} tokens`);
          console.log(`📉 Optimized system prompt would be ~${formatTokens(breakdown.systemPrompt - totalPotentialSavings)} tokens\\n`);
        }
      }
    }

    // Vector info (clarification)
    console.log(`ℹ️  Note: The embedding vector (${pvs.embedding.vector.length.toLocaleString()} dimensions) is NOT sent to the LLM.`);
    console.log('   Only the text-based system prompt above consumes tokens.\n');

    // Usage examples
    console.log('📚 Example Usage:');
    console.log('  # Analyze different models:');
    console.log('  npx ts-node src/cli_token_analyzer.ts --model claude-3-sonnet');
    console.log('  npx ts-node src/cli_token_analyzer.ts --model gpt-5-turbo');
    console.log('  ');
    console.log('  # Test with a query:');
    console.log('  npx ts-node src/cli_token_analyzer.ts --query "Help me design an API"');
    console.log('  ');
    console.log('  # Get optimization tips:');
    console.log('  npx ts-node src/cli_token_analyzer.ts --optimize');

  } catch (error) {
    console.error('❌ Error analyzing PVS:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
