import * as fs from 'fs';
import * as path from 'path';
import { PersonalVectorStore } from '../src/types';
import { createAdapter } from '../src/adapters';
import { 
  BenchmarkQuestion, 
  BenchmarkResult, 
  BenchmarkSuite, 
  BenchmarkReport,
  BenchmarkScore,
  ModelConfig
} from './types';
import { logger } from './console_utils';
import { ResponseEvaluator, EvaluationCriteria } from './response_evaluator';
import { TokenEstimator } from '../src/token_estimator';

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private readonly suite: BenchmarkSuite;
  private readonly pvs: PersonalVectorStore;
  private readonly tokenEstimator: TokenEstimator;
  private evaluator: ResponseEvaluator | null = null;

  constructor(suitePath: string, pvsPath: string, private readonly evaluationCriteria?: EvaluationCriteria) {
    this.suite = this.loadSuite(suitePath);
    this.pvs = JSON.parse(fs.readFileSync(pvsPath, 'utf-8'));
    this.tokenEstimator = new TokenEstimator();
    // Don't initialize evaluator here - create it lazily when needed for scoring
    // this.evaluator = new ResponseEvaluator(this.pvs, evaluationCriteria);
  }

  private loadSuite(suitePath: string): BenchmarkSuite {
    if (suitePath.endsWith('.json')) {
      const questions = JSON.parse(fs.readFileSync(suitePath, 'utf-8'));
      return {
        name: path.basename(suitePath, '.json'),
        description: 'Default benchmark suite',
        questions,
        pvs_path: ''
      };
    }
    return JSON.parse(fs.readFileSync(suitePath, 'utf-8'));
  }

  async runBenchmark(modelConfigs: ModelConfig[] = []): Promise<BenchmarkReport> {
    const startTime = Date.now();
    this.results = [];

    logger.header('🚀 Starting PVS Benchmark');
    logger.displayConfiguration(modelConfigs, this.suite.questions.length, 'PVS loaded');

    const totalTests = modelConfigs.length * this.suite.questions.length * 2; // 2 tests per question (with/without PVS)
    let currentTest = 0;

    for (const modelConfig of modelConfigs) {
      logger.subHeader(`Testing ${modelConfig.displayName}`);
      
      const adapter = createAdapter(modelConfig);
      logger.startSpinner('model', `Initializing ${modelConfig.displayName}...`);

      for (const question of this.suite.questions) {
        logger.succeedSpinner('model');
        logger.displayProgress(currentTest, totalTests, modelConfig.displayName, question.id);
        
        // Test without PVS (baseline)
        logger.startSpinner('baseline', 'Running baseline test...');
        await this.runSingleTest(adapter, question, false, modelConfig);
        logger.succeedSpinner('baseline', 'Baseline test completed');
        logger.displayTestResult(this.results[this.results.length - 1], true);
        currentTest++;
        
        // Test with PVS
        logger.startSpinner('pvs', 'Running PVS test...');
        await this.runSingleTest(adapter, question, true, modelConfig);
        logger.succeedSpinner('pvs', 'PVS test completed');
        logger.displayTestResult(this.results[this.results.length - 1], false);
        currentTest++;
      }
    }

    logger.stopAllSpinners();

    // Calculate improvements for each question and overall average
    const scores = await this.calculateQuestionImprovements();
    const avgImprovement = this.calculateAverageImprovement(scores);
    const bestProvider = this.getBestProvider(scores);
    const mostImprovedCategory = this.getMostImprovedCategory(scores);

    const report: BenchmarkReport = {
      suite_name: this.suite.name,
      pvs_used: this.pvs.owner.name,
      total_questions: this.suite.questions.length,
      total_providers: modelConfigs.length,
      results: this.results,
      scores,
      summary: {
        avg_improvement: avgImprovement,
        best_provider: bestProvider,
        most_improved_category: mostImprovedCategory,
        execution_time_ms: Date.now() - startTime
      },
      generated_at: new Date().toISOString()
    };

    return report;
  }

  private async runSingleTest(
    adapter: any, 
    question: BenchmarkQuestion, 
    withPvs: boolean, 
    modelConfig: ModelConfig
  ): Promise<void> {
    const testStart = Date.now();
    
    try {
      let context = '';
      let systemPromptTokens: number | undefined;
      let totalInputTokens: number | undefined;

      if (withPvs) {
        context = await adapter.inject(this.pvs);
        // Calculate token counts for PVS system prompt
        const tokenBreakdown = this.tokenEstimator.estimateWithQuery(this.pvs, question.prompt);
        systemPromptTokens = tokenBreakdown.systemPrompt;
        totalInputTokens = tokenBreakdown.totalInput;
      }

      const response = await adapter.query(question.prompt, context);
      
      // Calculate response token count
      const responseTokens = this.tokenEstimator.estimateTextTokens(response);
      
      this.results.push({
        question_id: question.id,
        provider: modelConfig.provider,
        model: modelConfig.model,
        with_pvs: withPvs,
        response,
        response_length: response.length,
        response_tokens: responseTokens,
        system_prompt_tokens: systemPromptTokens,
        total_input_tokens: totalInputTokens,
        response_time_ms: Date.now() - testStart,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.results.push({
        question_id: question.id,
        provider: modelConfig.provider,
        model: modelConfig.model,
        with_pvs: withPvs,
        response: '',
        response_length: 0,
        response_tokens: 0,
        response_time_ms: Date.now() - testStart,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private getEvaluator(): ResponseEvaluator {
    this.evaluator ??= new ResponseEvaluator(this.pvs, this.evaluationCriteria);
    return this.evaluator;
  }

  private async calculateQuestionImprovements(): Promise<BenchmarkScore[]> {
    const scores: BenchmarkScore[] = [];
    
    logger.subHeader('🎯 Calculating Quality Scores');
    
    const resultsByQuestion = this.groupResultsByQuestion();
    const validResults = this.getValidResultPairs(resultsByQuestion);
    const total = validResults.length;
    
    let evaluated = 0;
    for (const results of validResults) {
      const score = await this.processResultPair(results, evaluated, total);
      if (score) {
        scores.push(score);
      }
      evaluated++;
    }
    
    return scores;
  }

  private groupResultsByQuestion(): Map<string, BenchmarkResult[]> {
    const resultsByQuestion = new Map<string, BenchmarkResult[]>();
    
    for (const result of this.results) {
      const key = `${result.question_id}_${result.provider}_${result.model}`;
      if (!resultsByQuestion.has(key)) {
        resultsByQuestion.set(key, []);
      }
      resultsByQuestion.get(key)!.push(result);
    }
    
    return resultsByQuestion;
  }

  private getValidResultPairs(resultsByQuestion: Map<string, BenchmarkResult[]>): BenchmarkResult[][] {
    return Array.from(resultsByQuestion.values()).filter(results => results.length === 2);
  }

  private async processResultPair(results: BenchmarkResult[], evaluated: number, total: number): Promise<BenchmarkScore | null> {
    const baseline = results.find(r => !r.with_pvs);
    const pvsResult = results.find(r => r.with_pvs);
    
    if (!baseline || !pvsResult) return null;
    
    const question = this.suite.questions.find(q => q.id === baseline.question_id);
    if (!question) return null;

    logger.displayProgress(evaluated, total, 'Evaluating', question.id);
    
    try {
      return await this.evaluateSuccessfulResponse(question, baseline, pvsResult);
    } catch (error) {
      return this.createFallbackScore(baseline, pvsResult, error);
    }
  }

  private async evaluateSuccessfulResponse(
    question: BenchmarkQuestion, 
    baseline: BenchmarkResult, 
    pvsResult: BenchmarkResult
  ): Promise<BenchmarkScore> {
    const evaluator = this.getEvaluator();
    const detailedScore = await evaluator.evaluateResponse(question, baseline, pvsResult);
    const improvement = this.calculateImprovementMetrics(baseline, pvsResult);
    
    // Display the scores in console
    logger.info(`   📊 ${question.id}: A:${detailedScore.alignment_score.toFixed(1)} C:${detailedScore.consistency_score.toFixed(1)} R:${detailedScore.relevance_score.toFixed(1)} (${improvement.toFixed(1)}% improvement)`);
    
    return {
      question_id: baseline.question_id,
      provider: baseline.provider,
      alignment_score: Math.round(detailedScore.alignment_score * 10) / 10,
      consistency_score: Math.round(detailedScore.consistency_score * 10) / 10,
      relevance_score: Math.round(detailedScore.relevance_score * 10) / 10,
      improvement_over_baseline: improvement,
      notes: `${detailedScore.reasoning}\n\nPerformance: ${baseline.response_time_ms}ms → ${pvsResult.response_time_ms}ms, ` +
             `Tokens: ${baseline.response_tokens || 0} → ${pvsResult.response_tokens || 0}, ` +
             `Length: ${baseline.response_length} → ${pvsResult.response_length} chars`
    };
  }

  private createFallbackScore(baseline: BenchmarkResult, pvsResult: BenchmarkResult, error: unknown): BenchmarkScore {
    logger.error(`   ⚠️  Failed to evaluate ${baseline.question_id}: ${error instanceof Error ? error.message : String(error)}`);
    
    const improvement = this.calculateImprovementMetrics(baseline, pvsResult);
    return {
      question_id: baseline.question_id,
      provider: baseline.provider,
      alignment_score: 2.5, // Neutral fallback
      consistency_score: 2.5,
      relevance_score: 2.5,
      improvement_over_baseline: improvement,
      notes: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}\n\n` +
             `Performance: ${baseline.response_time_ms}ms → ${pvsResult.response_time_ms}ms, ` +
             `Tokens: ${baseline.response_tokens || 0} → ${pvsResult.response_tokens || 0}, ` +
             `Length: ${baseline.response_length} → ${pvsResult.response_length} chars`
    };
  }

  private calculateImprovementMetrics(baseline: BenchmarkResult, pvsResult: BenchmarkResult): number {
    // Calculate multiple improvement metrics and combine them
    
    // 1. Response time improvement (faster is better, so negative % is good)
    const timeImprovement = baseline.response_time_ms > 0 
      ? ((baseline.response_time_ms - pvsResult.response_time_ms) / baseline.response_time_ms) * 100
      : 0;
    
    // 2. Token efficiency improvement (fewer tokens for similar quality is good)
    const tokenImprovement = (baseline.response_tokens || 0) > 0
      ? ((baseline.response_tokens - (pvsResult.response_tokens || 0)) / baseline.response_tokens) * 100
      : 0;
    
    // 3. Conciseness improvement (shorter responses can be better if they're more focused)
    // But we'll weight this less since longer responses might be more comprehensive
    const lengthImprovement = baseline.response_length > 0
      ? ((baseline.response_length - pvsResult.response_length) / baseline.response_length) * 100
      : 0;
    
    // Weighted combination: prioritize time improvement, then token efficiency
    // Time gets 50% weight, tokens 35%, length 15%
    const weightedImprovement = (timeImprovement * 0.5) + (tokenImprovement * 0.35) + (lengthImprovement * 0.15);
    
    return Math.round(weightedImprovement * 100) / 100; // Round to 2 decimal places
  }

  private calculateAverageImprovement(scores: BenchmarkScore[]): number {
    if (scores.length === 0) return 0;
    
    const totalImprovement = scores.reduce((sum, score) => sum + score.improvement_over_baseline, 0);
    return Math.round((totalImprovement / scores.length) * 100) / 100;
  }

  private getBestProvider(scores: BenchmarkScore[]): string {
    if (scores.length === 0) return 'none';
    
    const providerAverages = new Map<string, number[]>();
    
    // Group scores by provider
    for (const score of scores) {
      if (!providerAverages.has(score.provider)) {
        providerAverages.set(score.provider, []);
      }
      providerAverages.get(score.provider)!.push(score.improvement_over_baseline);
    }
    
    // Calculate average improvement per provider
    let bestProvider = 'none';
    let bestImprovement = -Infinity;
    
    for (const [provider, improvements] of providerAverages) {
      const avgImprovement = improvements.reduce((sum, val) => sum + val, 0) / improvements.length;
      if (avgImprovement > bestImprovement) {
        bestImprovement = avgImprovement;
        bestProvider = provider;
      }
    }
    
    return bestProvider;
  }

  private getMostImprovedCategory(scores: BenchmarkScore[]): string {
    if (scores.length === 0) return 'technical';
    
    const categoryAverages = new Map<string, number[]>();
    
    // Group scores by category
    for (const score of scores) {
      const question = this.suite.questions.find(q => q.id === score.question_id);
      if (!question) continue;
      
      if (!categoryAverages.has(question.category)) {
        categoryAverages.set(question.category, []);
      }
      categoryAverages.get(question.category)!.push(score.improvement_over_baseline);
    }
    
    // Find category with highest average improvement
    let bestCategory = 'technical';
    let bestImprovement = -Infinity;
    
    for (const [category, improvements] of categoryAverages) {
      const avgImprovement = improvements.reduce((sum, val) => sum + val, 0) / improvements.length;
      if (avgImprovement > bestImprovement) {
        bestImprovement = avgImprovement;
        bestCategory = category;
      }
    }
    
    return bestCategory;
  }

  async saveReport(report: BenchmarkReport, outputPath?: string): Promise<void> {
    const fileName = outputPath || `benchmark_${Date.now()}.json`;
    const fullPath = path.join('benchmarks', 'results', fileName);
    
    // Create results directory if it doesn't exist
    const resultsDir = path.dirname(fullPath);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    logger.startSpinner('save', 'Saving benchmark report...');
    fs.writeFileSync(fullPath, JSON.stringify(report, null, 2));
    logger.succeedSpinner('save', `Benchmark report saved to: ${fullPath}`);
    
    logger.displaySummary(report);
  }
}
