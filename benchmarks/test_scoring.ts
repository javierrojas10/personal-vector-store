#!/usr/bin/env ts-node
/**
 * Test script to validate the new scoring system
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import { ResponseEvaluator } from './response_evaluator';
import { BenchmarkQuestion, BenchmarkResult } from './types';
import { PersonalVectorStore } from '../src/types';
import { logger } from './console_utils';

config();

async function testScoring() {
  try {
    // Load a sample PVS
    if (!fs.existsSync('pvs.json')) {
      logger.error('pvs.json not found. Please generate a PVS first with: npm run generate');
      return;
    }

    const pvs: PersonalVectorStore = JSON.parse(fs.readFileSync('pvs.json', 'utf-8'));
    logger.header('🧪 Testing Response Evaluator');
    logger.info(`Testing with PVS for: ${pvs.owner.name} (${pvs.owner.role})`);

    // Create test question
    const testQuestion: BenchmarkQuestion = {
      id: 'test_question',
      category: 'technical',
      prompt: 'What are the best practices for Node.js API development?',
      expected_style: ['direct', 'technical', 'practical'],
      context: 'API development guidance'
    };

    // Create mock baseline result
    const baselineResult: BenchmarkResult = {
      question_id: 'test_question',
      provider: 'test',
      model: 'test-model',
      with_pvs: false,
      response: 'Use Express.js framework. Follow RESTful conventions. Add error handling. Use middleware for authentication.',
      response_length: 105,
      response_tokens: 25,
      response_time_ms: 1500,
      timestamp: new Date().toISOString()
    };

    // Create mock PVS result
    const pvsResult: BenchmarkResult = {
      question_id: 'test_question', 
      provider: 'test',
      model: 'test-model',
      with_pvs: true,
      response: `For robust Node.js APIs in 2025, I recommend Fastify over Express for better performance and TypeScript support. Here's my practical approach:

1. **Framework**: Fastify for JSON-heavy APIs (2x faster than Express), Express for ecosystem compatibility
2. **Architecture**: Start modular monolith, extract services by load patterns
3. **Validation**: JSON Schema with Ajv for request/response validation
4. **Auth**: JWT with proper key rotation, rate limiting per endpoint
5. **Database**: Use connection pooling, prepared statements, read replicas for scale
6. **Monitoring**: Structured logging with Pino, OpenTelemetry for tracing
7. **Deployment**: Docker + AWS ECS/Fargate with proper health checks

Skip premature optimization but plan for scale from day one. Focus on clear error messages and developer experience.`,
      response_length: 687,
      response_tokens: 156,
      system_prompt_tokens: 89,
      total_input_tokens: 123,
      response_time_ms: 2300,
      timestamp: new Date().toISOString()
    };

    // Test with AI evaluation enabled
    logger.subHeader('Testing with AI-powered evaluation');
    const evaluatorWithAI = new ResponseEvaluator(pvs, {
      alignment_weight: 0.4,
      consistency_weight: 0.3,
      relevance_weight: 0.3,
      use_ai_evaluation: true
    });

    const aiScore = await evaluatorWithAI.evaluateResponse(testQuestion, baselineResult, pvsResult);
    
    logger.success('✅ AI-powered evaluation completed:');
    logger.info(`   📊 Alignment Score: ${aiScore.alignment_score.toFixed(1)}/5`);
    logger.info(`   📊 Consistency Score: ${aiScore.consistency_score.toFixed(1)}/5`);
    logger.info(`   📊 Relevance Score: ${aiScore.relevance_score.toFixed(1)}/5`);
    logger.info(`   🎯 Confidence: ${(aiScore.confidence * 100).toFixed(1)}%`);
    logger.info(`   📝 Reasoning: ${aiScore.reasoning}`);

    // Test with algorithmic evaluation only
    logger.subHeader('Testing with algorithmic evaluation only');
    const evaluatorNoAI = new ResponseEvaluator(pvs, {
      alignment_weight: 0.4,
      consistency_weight: 0.3,
      relevance_weight: 0.3,
      use_ai_evaluation: false
    });

    const algorithmicScore = await evaluatorNoAI.evaluateResponse(testQuestion, baselineResult, pvsResult);
    
    logger.success('✅ Algorithmic evaluation completed:');
    logger.info(`   📊 Alignment Score: ${algorithmicScore.alignment_score.toFixed(1)}/5`);
    logger.info(`   📊 Consistency Score: ${algorithmicScore.consistency_score.toFixed(1)}/5`);
    logger.info(`   📊 Relevance Score: ${algorithmicScore.relevance_score.toFixed(1)}/5`);
    logger.info(`   🎯 Confidence: ${(algorithmicScore.confidence * 100).toFixed(1)}%`);
    logger.info(`   📝 Reasoning: ${algorithmicScore.reasoning}`);

    // Compare scores
    logger.subHeader('Score Comparison');
    const alignmentDiff = aiScore.alignment_score - algorithmicScore.alignment_score;
    const consistencyDiff = aiScore.consistency_score - algorithmicScore.consistency_score;
    const relevanceDiff = aiScore.relevance_score - algorithmicScore.relevance_score;

    logger.info(`   🔄 Alignment difference: ${alignmentDiff > 0 ? '+' : ''}${alignmentDiff.toFixed(1)}`);
    logger.info(`   🔄 Consistency difference: ${consistencyDiff > 0 ? '+' : ''}${consistencyDiff.toFixed(1)}`);
    logger.info(`   🔄 Relevance difference: ${relevanceDiff > 0 ? '+' : ''}${relevanceDiff.toFixed(1)}`);

    logger.header('🎉 Scoring system validation completed successfully!');
    
  } catch (error) {
    logger.error(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (require.main === module) {
  testScoring();
}

export { testScoring };
