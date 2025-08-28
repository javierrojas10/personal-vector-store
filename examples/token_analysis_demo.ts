#!/usr/bin/env ts-node
import { config } from 'dotenv';
import * as fs from 'fs';
import { TokenEstimator } from '../src/token_estimator';
import { PersonalVectorStore } from '../src/types';

config();

async function compareTokenUsage() {
  console.log('🔍 PVS Token Consumption Comparison');
  console.log('=====================================\n');

  const tokenEstimator = new TokenEstimator();

  // Load different PVS profiles
  const profiles = [
    { name: 'Current PVS (Javier)', path: 'generated_pvs.json' },
    { name: 'Developer Profile (Alex)', path: 'examples/developer_profile.json' },
    { name: 'Entrepreneur Profile (Maria)', path: 'examples/entrepreneur_profile.json' }
  ];

  const testQuery = "I'm building a Node.js API. Should I use Express or Fastify?";
  const models = ['gpt-5-mini', 'gpt-5-turbo', 'claude-3-sonnet', 'gemini-1.5-pro'];

  for (const profile of profiles) {
    if (!fs.existsSync(profile.path)) {
      console.log(`⚠️  Skipping ${profile.name} - file not found: ${profile.path}`);
      continue;
    }

    console.log(`📊 ${profile.name}`);
    console.log('─'.repeat(40));

    try {
      const pvs: PersonalVectorStore = JSON.parse(fs.readFileSync(profile.path, 'utf-8'));
      
      // Basic system prompt analysis
      const breakdown = tokenEstimator.estimateSystemPromptTokens(pvs);
      console.log(`System Prompt: ${breakdown.systemPrompt} tokens`);
      console.log(`  • Header: ${breakdown.sections.header} tokens`);
      console.log(`  • Identity: ${breakdown.sections.identity} tokens`);
      console.log(`  • Communication: ${breakdown.sections.communication} tokens`);
      console.log(`  • Footer: ${breakdown.sections.footer} tokens`);

      // Show with query
      const withQuery = tokenEstimator.estimateWithQuery(pvs, testQuery);
      console.log(`\\nWith sample query: ${withQuery.totalInput} tokens (${withQuery.userQuery} query + ${withQuery.systemPrompt} system)`);

      // Model compatibility
      console.log('\\nModel compatibility:');
      for (const modelName of models) {
        const analysis = tokenEstimator.analyzeForModel(pvs, modelName, testQuery);
        let status: string;
        if (analysis.analysis.status === 'optimal') {
          status = '✅';
        } else if (analysis.analysis.status === 'warning') {
          status = '⚠️';
        } else {
          status = '❌';
        }
        const usage = `${analysis.breakdown.totalInput}/${analysis.modelLimits.contextWindow}`;
        console.log(`  ${status} ${modelName}: ${usage} tokens`);
      }

      console.log('\\n');

    } catch (error) {
      console.log(`❌ Error loading ${profile.name}: ${error}\\n`);
    }
  }
}

async function demonstrateOptimization() {
  console.log('🔧 Token Optimization Demonstration');
  console.log('====================================\\n');

  if (!fs.existsSync('examples/developer_profile.json')) {
    console.log('⚠️  Developer profile not found, skipping optimization demo');
    return;
  }

  const tokenEstimator = new TokenEstimator();
  const pvs: PersonalVectorStore = JSON.parse(fs.readFileSync('examples/developer_profile.json', 'utf-8'));

  console.log('📋 Original Profile Token Usage:');
  const original = tokenEstimator.estimateSystemPromptTokens(pvs);
  console.log(`Total: ${original.systemPrompt} tokens`);

  // Simulate optimization by creating a shortened version
  const optimizedPVS: PersonalVectorStore = {
    ...pvs,
    identity: {
      ...pvs.identity,
      bio: 'Full-stack developer with 8 years experience specializing in React and Node.js.',
      skills: pvs.identity.skills.slice(0, 6), // Limit to top 6 skills
      achievements: pvs.identity.achievements?.slice(0, 2) // Limit to top 2 achievements
    }
  };

  console.log('\\n📋 Optimized Profile Token Usage:');
  const optimized = tokenEstimator.estimateSystemPromptTokens(optimizedPVS);
  console.log(`Total: ${optimized.systemPrompt} tokens`);
  console.log(`Savings: ${original.systemPrompt - optimized.systemPrompt} tokens (${Math.round((1 - optimized.systemPrompt / original.systemPrompt) * 100)}% reduction)`);

  console.log('\\n💡 Key Takeaways:');
  console.log('  • Vectors are NOT sent to LLMs - only text prompts consume tokens');
  console.log('  • Short, focused bios are more token-efficient');
  console.log('  • Limit skills/achievements to most relevant ones');
  console.log('  • Different models have vastly different context limits');
  console.log('  • Most PVS profiles use <200 tokens - very efficient!');
}

async function showRealWorldScenarios() {
  console.log('\\n🌍 Real-World Token Usage Scenarios');
  console.log('=====================================\\n');

  const scenarios = [
    {
      name: 'Code Review',
      query: 'Please review this TypeScript function and suggest improvements:\\n\\nfunction processUser(data: any) {\\n  if (data.name && data.email) {\\n    return { success: true, user: data };\\n  }\\n  return { success: false };\\n}',
      additional: 'Focus on type safety and error handling.'
    },
    {
      name: 'Architecture Decision',
      query: 'I need to choose between microservices and monolith for a new e-commerce platform. What factors should I consider?',
      additional: 'Consider scalability, team size, and maintenance overhead.'
    },
    {
      name: 'Simple Question',
      query: 'What is the difference between REST and GraphQL?'
    }
  ];

  if (!fs.existsSync('generated_pvs.json')) {
    console.log('⚠️  No generated PVS found. Run "npm run generate" first.');
    return;
  }

  const pvs: PersonalVectorStore = JSON.parse(fs.readFileSync('generated_pvs.json', 'utf-8'));
  const tokenEstimator = new TokenEstimator();

  for (const scenario of scenarios) {
    console.log(`📝 Scenario: ${scenario.name}`);
    
    const breakdown = tokenEstimator.estimateWithQuery(pvs, scenario.query, scenario.additional);
    
    console.log(`  Query: ${breakdown.userQuery} tokens`);
    console.log(`  System Prompt: ${breakdown.systemPrompt} tokens`);
    if (scenario.additional) {
      console.log(`  Additional Context: ${breakdown.sections.additional} tokens`);
    }
    console.log(`  Total Input: ${breakdown.totalInput} tokens`);
    console.log(`  Est. Total (with response): ${breakdown.totalEstimated} tokens\\n`);
  }

  console.log('💡 Notice how the PVS system prompt stays constant (~156 tokens)');
  console.log('   while query complexity varies significantly.');
}

if (require.main === module) {
  (async () => {
    await compareTokenUsage();
    await demonstrateOptimization();
    await showRealWorldScenarios();
  })();
}
