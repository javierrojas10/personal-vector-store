export interface BenchmarkQuestion {
  id: string;
  category: 'technical' | 'personal' | 'advice' | 'creative';
  prompt: string;
  expected_style?: string[];
  context?: string;
}

export interface ModelConfig {
  provider: string;
  model: string;
  displayName: string;
}

export interface BenchmarkResult {
  question_id: string;
  provider: string;
  model: string;
  with_pvs: boolean;
  response: string;
  response_length: number;
  response_tokens: number;
  system_prompt_tokens?: number;
  total_input_tokens?: number;
  response_time_ms: number;
  timestamp: string;
  error?: string;
}

export interface BenchmarkScore {
  question_id: string;
  provider: string;
  alignment_score: number;
  consistency_score: number;
  relevance_score: number;
  improvement_over_baseline: number;
  notes?: string;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  questions: BenchmarkQuestion[];
  pvs_path: string;
}

export interface BenchmarkReport {
  suite_name: string;
  pvs_used: string;
  total_questions: number;
  total_providers: number;
  results: BenchmarkResult[];
  scores: BenchmarkScore[];
  summary: {
    avg_improvement: number;
    best_provider: string;
    most_improved_category: string;
    execution_time_ms: number;
  };
  generated_at: string;
}
