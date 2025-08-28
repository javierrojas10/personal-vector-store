import { PersonalVectorStore } from './types';
import { BaseLLMAdapter } from './adapters/base_adapter';

export interface TokenBreakdown {
  systemPrompt: number;
  userQuery: number;
  totalInput: number;
  totalEstimated: number;
  maxResponse: number;
  sections: {
    header: number;
    identity: number;
    communication: number;
    footer: number;
    additional?: number;
  };
}

export interface ModelLimits {
  name: string;
  contextWindow: number;
  recommendedSystemPrompt: number;
  warningThreshold: number;
}

export const MODEL_LIMITS: Record<string, ModelLimits> = {
  'gpt-5-mini': {
    name: 'GPT-5',
    contextWindow: 8192,
    recommendedSystemPrompt: 1000,
    warningThreshold: 1500
  },
  'gpt-5-turbo': {
    name: 'GPT-5 Turbo',
    contextWindow: 128000,
    recommendedSystemPrompt: 2000,
    warningThreshold: 3000
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    contextWindow: 16384,
    recommendedSystemPrompt: 800,
    warningThreshold: 1200
  },
  'claude-3-sonnet': {
    name: 'Claude-3 Sonnet',
    contextWindow: 200000,
    recommendedSystemPrompt: 3000,
    warningThreshold: 5000
  },
  'claude-3-haiku': {
    name: 'Claude-3 Haiku',
    contextWindow: 200000,
    recommendedSystemPrompt: 2000,
    warningThreshold: 3000
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    recommendedSystemPrompt: 5000,
    warningThreshold: 10000
  },
  'deepseek-chat': {
    name: 'DeepSeek Chat',
    contextWindow: 32768,
    recommendedSystemPrompt: 1500,
    warningThreshold: 2500
  }
};

export class TokenEstimator {
  
  // Simple token estimation (roughly 1 token = 4 characters for English)
  // This is an approximation - real tokenizers are more complex
  private estimateTokens(text: string): number {
    // More accurate estimation considering:
    // - Average English word = ~1.3 tokens
    // - Punctuation, spaces, etc.
    return Math.ceil(text.length / 3.5);
  }

  // Public method to estimate tokens for any text
  public estimateTextTokens(text: string): number {
    return this.estimateTokens(text);
  }

  private createMockAdapter(): BaseLLMAdapter {
    // Create a mock adapter just to access the createSystemPrompt method
    return new (class extends BaseLLMAdapter {
      name = 'Mock';
      model = 'mock-model';
      async inject() { return ''; }
      async query() { return ''; }
    })();
  }

  estimateSystemPromptTokens(
    pvs: PersonalVectorStore, 
    additionalPrompt?: string
  ): TokenBreakdown {
    const adapter = this.createMockAdapter();
    const fullPrompt = adapter['createSystemPrompt'](pvs, additionalPrompt);
    
    // Break down by sections for analysis
    const { owner, identity: pvsIdentity, communication_style } = pvs;
    
    const locationText = owner.location ? ` based in ${owner.location}` : '';
    const headerSection = `You are assisting ${owner.name}, who is ${owner.role || 'a professional'}${locationText}.`;
    
    const identitySection = [
      'IDENTITY & EXPERTISE:',
      pvsIdentity.bio,
      `Skills: ${pvsIdentity.skills.join(', ')}`,
      `Interests: ${pvsIdentity.interests.join(', ')}`,
      pvsIdentity.expertise_areas && `Areas of expertise: ${pvsIdentity.expertise_areas.join(', ')}`,
      pvsIdentity.achievements && `Key achievements: ${pvsIdentity.achievements.join(', ')}`
    ].filter(Boolean).join('\n');

    const communicationSection = [
      'COMMUNICATION STYLE:',
      `- Tone: ${communication_style.tone}`,
      `- Languages: ${communication_style.languages.join(', ')}`,
      `- Answer style: ${communication_style.preferences.answers}`,
      `- Code style: ${communication_style.preferences.code}`,
      `- Explanation style: ${communication_style.preferences.explanations}`
    ].join('\n');

    const footerSection = 'Please respond in a way that aligns with this person\'s identity, expertise, and communication preferences.';

    const breakdown: TokenBreakdown = {
      systemPrompt: this.estimateTokens(fullPrompt),
      userQuery: 0, // Will be calculated when provided
      totalInput: this.estimateTokens(fullPrompt),
      totalEstimated: this.estimateTokens(fullPrompt) + 1500,
      maxResponse: 1500,
      sections: {
        header: this.estimateTokens(headerSection),
        identity: this.estimateTokens(identitySection),
        communication: this.estimateTokens(communicationSection),
        footer: this.estimateTokens(footerSection),
        additional: additionalPrompt ? this.estimateTokens(additionalPrompt) : undefined
      }
    };

    return breakdown;
  }

  estimateWithQuery(
    pvs: PersonalVectorStore,
    userQuery: string,
    additionalPrompt?: string
  ): TokenBreakdown {
    const breakdown = this.estimateSystemPromptTokens(pvs, additionalPrompt);
    const queryTokens = this.estimateTokens(userQuery);
    
    breakdown.userQuery = queryTokens;
    breakdown.totalInput = breakdown.systemPrompt + queryTokens;
    breakdown.totalEstimated = breakdown.totalInput;

    return breakdown;
  }

  analyzeForModel(
    pvs: PersonalVectorStore,
    modelName: string,
    userQuery?: string,
    additionalPrompt?: string
  ): {
    breakdown: TokenBreakdown;
    modelLimits: ModelLimits;
    analysis: {
      status: 'optimal' | 'warning' | 'critical';
      message: string;
      suggestions: string[];
    };
  } {
    const breakdown = userQuery 
      ? this.estimateWithQuery(pvs, userQuery, additionalPrompt)
      : this.estimateSystemPromptTokens(pvs, additionalPrompt);

    const modelLimits = MODEL_LIMITS[modelName] || MODEL_LIMITS['gpt-5-mini'];
    
    let status: 'optimal' | 'warning' | 'critical' = 'optimal';
    let message = '';
    const suggestions: string[] = [];

    if (breakdown.systemPrompt > modelLimits.warningThreshold) {
      status = 'critical';
      message = `System prompt (${breakdown.systemPrompt} tokens) exceeds warning threshold (${modelLimits.warningThreshold})`;
      suggestions.push('Consider shortening bio, skills, or achievements');
      suggestions.push('Remove optional fields like expertise_areas');
      suggestions.push('Use more concise communication preferences');
    } else if (breakdown.systemPrompt > modelLimits.recommendedSystemPrompt) {
      status = 'warning';
      message = `System prompt (${breakdown.systemPrompt} tokens) above recommended size (${modelLimits.recommendedSystemPrompt})`;
      suggestions.push('Consider optimizing for token efficiency');
    } else {
      message = `System prompt token usage is optimal (${breakdown.systemPrompt}/${modelLimits.recommendedSystemPrompt} recommended)`;
    }

    if (breakdown.totalEstimated > modelLimits.contextWindow * 0.9) {
      status = 'critical';
      suggestions.push(`Total estimated tokens (${breakdown.totalEstimated}) approaching context limit (${modelLimits.contextWindow})`);
    }

    return {
      breakdown,
      modelLimits,
      analysis: {
        status,
        message,
        suggestions
      }
    };
  }

  generateOptimizationReport(pvs: PersonalVectorStore): {
    currentSize: TokenBreakdown;
    optimizationTips: Array<{
      field: string;
      currentTokens: number;
      suggestion: string;
      potentialSavings: number;
    }>;
  } {
    const currentSize = this.estimateSystemPromptTokens(pvs);
    const optimizationTips = [];

    // Analyze each section for optimization opportunities
    if (pvs.identity.skills.length > 10) {
      optimizationTips.push({
        field: 'skills',
        currentTokens: this.estimateTokens(pvs.identity.skills.join(', ')),
        suggestion: 'Limit to top 8-10 most relevant skills',
        potentialSavings: this.estimateTokens(pvs.identity.skills.slice(10).join(', '))
      });
    }

    if (pvs.identity.bio.length > 200) {
      optimizationTips.push({
        field: 'bio',
        currentTokens: this.estimateTokens(pvs.identity.bio),
        suggestion: 'Shorten bio to 1-2 sentences (under 200 chars)',
        potentialSavings: Math.ceil(this.estimateTokens(pvs.identity.bio) * 0.4)
      });
    }

    if (pvs.identity.achievements && pvs.identity.achievements.length > 3) {
      optimizationTips.push({
        field: 'achievements',
        currentTokens: this.estimateTokens(pvs.identity.achievements.join(', ')),
        suggestion: 'Limit to top 3 most impactful achievements',
        potentialSavings: this.estimateTokens(pvs.identity.achievements.slice(3).join(', '))
      });
    }

    return {
      currentSize,
      optimizationTips
    };
  }
}
