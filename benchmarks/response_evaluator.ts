import { PersonalVectorStore } from '../src/types';
import { BenchmarkQuestion, BenchmarkResult } from './types';
import { createAdapter } from '../src/adapters';
import { logger } from './console_utils';

export interface EvaluationCriteria {
  alignment_weight: number;    // 0-1, how much to weight PVS alignment
  consistency_weight: number;  // 0-1, how much to weight style consistency  
  relevance_weight: number;    // 0-1, how much to weight response relevance
  use_ai_evaluation: boolean;  // Whether to use AI for subjective scoring
}

export interface DetailedScore {
  alignment_score: number;     // 0-5
  consistency_score: number;   // 0-5
  relevance_score: number;     // 0-5
  confidence: number;          // 0-1, confidence in the scoring
  reasoning: string;           // Explanation of the scores
}

export class ResponseEvaluator {
  private readonly pvs: PersonalVectorStore;
  private readonly criteria: EvaluationCriteria;
  private readonly evaluationModel: any; // AI model for evaluation

  constructor(
    pvs: PersonalVectorStore, 
    criteria: EvaluationCriteria = {
      alignment_weight: 0.4,
      consistency_weight: 0.3,
      relevance_weight: 0.3,
      use_ai_evaluation: true
    }
  ) {
    this.pvs = pvs;
    this.criteria = criteria;
    
    // Initialize evaluation model (using a fast, cheap model)
    if (criteria.use_ai_evaluation) {
      this.evaluationModel = createAdapter({
        provider: 'openai',
        model: 'gpt-4o-mini', // Fast and cheap for evaluation
        displayName: 'GPT-4o Mini (Evaluator)'
      });
    }
  }

  /**
   * Evaluate a response against baseline and PVS context
   */
  async evaluateResponse(
    question: BenchmarkQuestion,
    baselineResult: BenchmarkResult,
    pvsResult: BenchmarkResult
  ): Promise<DetailedScore> {
    
    logger.startSpinner('eval', `Evaluating ${question.id}...`);
    
    try {
      // Combine rule-based and AI-based scoring
      const algorithmicScore = await this.calculateAlgorithmicScore(question, baselineResult, pvsResult);
      
      let aiScore: Partial<DetailedScore> = {};
      if (this.criteria.use_ai_evaluation) {
        aiScore = await this.calculateAIScore(question, baselineResult, pvsResult);
      }

      // Weighted combination of scores
      const finalScore: DetailedScore = {
        alignment_score: this.combineScores(algorithmicScore.alignment_score, aiScore.alignment_score || 0),
        consistency_score: this.combineScores(algorithmicScore.consistency_score, aiScore.consistency_score || 0),
        relevance_score: this.combineScores(algorithmicScore.relevance_score, aiScore.relevance_score || 0),
        confidence: Math.max(algorithmicScore.confidence, aiScore.confidence || 0.3),
        reasoning: this.combineReasoning(algorithmicScore.reasoning, aiScore.reasoning || '')
      };

      logger.succeedSpinner('eval', 
        `Evaluated ${question.id}: A:${finalScore.alignment_score.toFixed(1)} C:${finalScore.consistency_score.toFixed(1)} R:${finalScore.relevance_score.toFixed(1)}`
      );

      return finalScore;

    } catch (error) {
      logger.failSpinner('eval', `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to basic scoring
      return {
        alignment_score: 2.5,
        consistency_score: 2.5,
        relevance_score: 2.5,
        confidence: 0.1,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Rule-based algorithmic scoring
   */
  private async calculateAlgorithmicScore(
    question: BenchmarkQuestion,
    baseline: BenchmarkResult,
    pvs: BenchmarkResult
  ): Promise<DetailedScore> {
    
    const scores = {
      alignment: 0,
      consistency: 0,
      relevance: 0
    };

    let reasoning = "Algorithmic Analysis:\n";

    // === ALIGNMENT SCORING ===
    // Compare PVS response characteristics with user style
    const alignmentFactors = [];

    // Length preference analysis
    const lengthRatio = pvs.response_length / baseline.response_length;
    if (lengthRatio > 1.2) {
      alignmentFactors.push("More detailed/comprehensive approach");
      scores.alignment += 1;
    } else if (lengthRatio < 0.8) {
      alignmentFactors.push("More concise/direct approach");
      scores.alignment += 1;
    }

    // Token efficiency (indicates structured thinking)
    const tokenEfficiency = pvs.response_length / (pvs.response_tokens || pvs.response_length / 4);
    const baselineEfficiency = baseline.response_length / (baseline.response_tokens || baseline.response_length / 4);
    if (tokenEfficiency > baselineEfficiency) {
      alignmentFactors.push("More efficient token usage");
      scores.alignment += 0.5;
    }

    // PVS-specific content (indicates personalization)
    if (pvs.system_prompt_tokens && pvs.system_prompt_tokens > 0) {
      alignmentFactors.push("Contains PVS-specific personalization");
      scores.alignment += 1.5;
    }

    // Response time (indicates thoughtfulness vs. speed)
    const timeRatio = pvs.response_time_ms / baseline.response_time_ms;
    if (timeRatio > 0.8 && timeRatio < 1.2) {
      alignmentFactors.push("Similar response time (consistent complexity)");
      scores.alignment += 0.5;
    }

    scores.alignment = Math.min(5, scores.alignment);
    reasoning += `Alignment (${scores.alignment}/5): ${alignmentFactors.join(", ")}\n`;

    // === CONSISTENCY SCORING ===
    const consistencyFactors = [];
    
    // Check against expected style
    if (question.expected_style) {
      let styleMatches = 0;
      
      for (const style of question.expected_style) {
        switch (style.toLowerCase()) {
          case 'direct':
            if (pvs.response_length < baseline.response_length * 1.2) {
              styleMatches++;
              consistencyFactors.push("Direct style detected");
            }
            break;
          case 'technical':
            // Technical responses often have certain characteristics
            if (this.containsTechnicalTerms(pvs.response)) {
              styleMatches++;
              consistencyFactors.push("Technical terminology present");
            }
            break;
          case 'detailed':
            if (pvs.response_length > baseline.response_length) {
              styleMatches++;
              consistencyFactors.push("Detailed response provided");
            }
            break;
          case 'practical':
            if (this.containsPracticalElements(pvs.response)) {
              styleMatches++;
              consistencyFactors.push("Practical elements identified");
            }
            break;
          default:
            // Generic style matching
            styleMatches += 0.5;
        }
      }
      
      scores.consistency = (styleMatches / question.expected_style.length) * 5;
    } else {
      scores.consistency = 3; // Neutral score if no expected style
      consistencyFactors.push("No expected style defined");
    }

    scores.consistency = Math.min(5, scores.consistency);
    reasoning += `Consistency (${scores.consistency}/5): ${consistencyFactors.join(", ")}\n`;

    // === RELEVANCE SCORING ===
    const relevanceFactors = [];
    
    // Basic relevance indicators
    let relevanceScore = 3; // Start with neutral

    // Response completeness
    if (pvs.response_length > 100) {
      relevanceScore += 0.5;
      relevanceFactors.push("Substantial response provided");
    }

    // No error indicates successful completion
    if (!pvs.error && !baseline.error) {
      relevanceScore += 1;
      relevanceFactors.push("Both responses completed successfully");
    }

    // Question category alignment
    if (this.responseMatchesCategory(pvs.response, question.category)) {
      relevanceScore += 1;
      relevanceFactors.push(`Response matches ${question.category} category`);
    }

    scores.relevance = Math.min(5, relevanceScore);
    reasoning += `Relevance (${scores.relevance}/5): ${relevanceFactors.join(", ")}\n`;

    return {
      alignment_score: scores.alignment,
      consistency_score: scores.consistency,
      relevance_score: scores.relevance,
      confidence: 0.7, // Moderate confidence in algorithmic scoring
      reasoning
    };
  }

  /**
   * AI-powered subjective scoring
   */
  private async calculateAIScore(
    question: BenchmarkQuestion,
    baseline: BenchmarkResult,
    pvs: BenchmarkResult
  ): Promise<Partial<DetailedScore>> {
    
    if (!this.evaluationModel) {
      return {};
    }

    const evaluationPrompt = this.buildEvaluationPrompt(question, baseline, pvs);
    
    try {
      // Use query method with empty context since we're providing everything in the prompt
      const response = await this.evaluationModel.query(evaluationPrompt, '');
      return this.parseAIEvaluation(response);
    } catch (error) {
      logger.error(`AI evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  private buildEvaluationPrompt(
    question: BenchmarkQuestion,
    baseline: BenchmarkResult,
    pvs: BenchmarkResult
  ): string {
    return `You are an expert response evaluator. Evaluate how well the PVS-enhanced response compares to the baseline response.

CONTEXT:
Question: "${question.prompt}"
Category: ${question.category}
Expected Style: ${question.expected_style?.join(', ') || 'None specified'}
Context: ${question.context || 'None'}

BASELINE RESPONSE (${baseline.response_length} chars, ${baseline.response_time_ms}ms):
${baseline.response}

PVS-ENHANCED RESPONSE (${pvs.response_length} chars, ${pvs.response_time_ms}ms):
${pvs.response}

PERSONAL VECTOR STORE CONTEXT:
Owner: ${this.pvs.owner.name}
Role: ${this.pvs.owner.role || 'Not specified'}
Communication Style: ${this.pvs.communication_style.tone}
Languages: ${this.pvs.communication_style.languages.join(', ')}
Preferences: ${Object.entries(this.pvs.communication_style.preferences).map(([k,v]) => `${k}: ${v}`).join(', ')}

Please evaluate the PVS response on a scale of 0-5 for each criterion:

1. **ALIGNMENT SCORE (0-5)**: How well does the PVS response reflect the user's personal style, voice, and preferences compared to the generic baseline?

2. **CONSISTENCY SCORE (0-5)**: How consistent is the PVS response with the expected style attributes for this type of question?

3. **RELEVANCE SCORE (0-5)**: How relevant, helpful, and appropriately comprehensive is the PVS response to the original question?

IMPORTANT: 
- A score of 3 means "same quality as baseline"
- Above 3 means "better than baseline" 
- Below 3 means "worse than baseline"
- Consider both content quality AND personal alignment

Respond in this exact JSON format:
{
  "alignment_score": X.X,
  "consistency_score": X.X,
  "relevance_score": X.X,
  "confidence": X.X,
  "reasoning": "Brief explanation of scores focusing on specific improvements or issues"
}`;
  }

  private parseAIEvaluation(response: string): Partial<DetailedScore> {
    try {
      // Extract JSON from response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(response);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        alignment_score: Math.max(0, Math.min(5, parsed.alignment_score || 2.5)),
        consistency_score: Math.max(0, Math.min(5, parsed.consistency_score || 2.5)),
        relevance_score: Math.max(0, Math.min(5, parsed.relevance_score || 2.5)),
        confidence: Math.max(0.1, Math.min(1, parsed.confidence || 0.8)),
        reasoning: `AI Analysis: ${parsed.reasoning || 'No reasoning provided'}`
      };
    } catch (error) {
      logger.error(`Failed to parse AI evaluation: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  // Helper methods
  private combineScores(algorithmic: number, ai: number): number {
    if (ai === 0) return algorithmic; // No AI score available
    
    const algorithmicWeight = 0.4;
    const aiWeight = 0.6;
    
    return (algorithmic * algorithmicWeight + ai * aiWeight);
  }

  private combineReasoning(algorithmic: string, ai: string): string {
    if (!ai) return algorithmic;
    return `${algorithmic}\n${ai}`;
  }

  private containsTechnicalTerms(response: string): boolean {
    const technicalTerms = [
      'api', 'database', 'server', 'client', 'framework', 'library', 'algorithm',
      'function', 'class', 'method', 'variable', 'typescript', 'javascript',
      'aws', 'cloud', 'architecture', 'microservices', 'docker', 'kubernetes'
    ];
    
    const lowerResponse = response.toLowerCase();
    return technicalTerms.some(term => lowerResponse.includes(term));
  }

  private containsPracticalElements(response: string): boolean {
    const practicalIndicators = [
      'step', 'first', 'then', 'next', 'example', 'here\'s how',
      'you can', 'to do this', 'implementation', 'try', 'use',
      'install', 'configure', 'setup', 'deploy'
    ];
    
    const lowerResponse = response.toLowerCase();
    return practicalIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  private responseMatchesCategory(response: string, category: string): boolean {
    const lowerResponse = response.toLowerCase();
    
    switch (category) {
      case 'technical':
        return this.containsTechnicalTerms(response);
      case 'personal':
        return lowerResponse.includes('i ') || lowerResponse.includes('my ') || 
               lowerResponse.includes('advice') || lowerResponse.includes('experience');
      case 'creative':
        return lowerResponse.includes('creative') || lowerResponse.includes('innovative') ||
               lowerResponse.includes('unique') || lowerResponse.includes('alternative');
      case 'advice':
        return lowerResponse.includes('recommend') || lowerResponse.includes('suggest') ||
               lowerResponse.includes('consider') || lowerResponse.includes('advice');
      default:
        return true;
    }
  }
}
