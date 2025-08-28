# PVS Usage Documentation

## Overview

Personal Vector Store (PVS) is a standardized format for representing your identity, expertise, and communication style in a way that can be injected into various LLMs for consistent personalization.

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Set up environment variables

```bash
# Copy the example environment file
cp .env.example .env

# Add your API keys
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
# ... etc
```

### 3. Generate your first PVS

```bash
# Generate embeddings for the example PVS
npm run generate

# Or specify custom files
npm run generate -- --input examples/developer_profile.json --output my_pvs.json
```

### 4. Run benchmarks

```bash
# Test with default OpenAI model
npm run benchmark

# Test with specific models
npm run benchmark -- --models openai:gpt-4o,anthropic:claude-3-5-sonnet-20241022

# List all available models
npm run benchmark:list
```

## API Reference

### Core Classes

#### `PVS`

Main class for working with Personal Vector Stores.

```typescript
import { PVS } from './src';

// Load from file
const pvs = await PVS.fromFile('generated_pvs.json');

// Get system prompt for OpenAI
const context = await pvs.injectInto('openai');

// Query with context
const adapter = pvs.getAdapter('openai');
const response = await adapter.query('Your question here', context);
```

#### `PVSGenerator`

Generates embeddings for PVS files.

```typescript
import { PVSGenerator } from './src';

const generator = new PVSGenerator();
const completePVS = await generator.generateFromFile({
  inputPath: 'my_profile.json',
  outputPath: 'my_pvs_with_embeddings.json'
});
```

### LLM Adapters

#### Supported Providers

- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-20240620`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Google**: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`, `gemini-1.0-pro`
- **DeepSeek**: `deepseek-chat`, `deepseek-coder`

#### Basic Usage

```typescript
import { OpenAIAdapter } from './src/adapters';

const adapter = new OpenAIAdapter(apiKey, 'gpt-4o-mini');
const context = await adapter.inject(pvs);
const response = await adapter.query('Your question', context);
```

## PVS File Format

### Basic Structure

```json
{
  "pvs_version": "0.1",
  "owner": {
    "name": "Your Name",
    "role": "Your Role",
    "location": "Your Location"
  },
  "identity": {
    "bio": "Brief bio",
    "skills": ["skill1", "skill2"],
    "interests": ["interest1", "interest2"],
    "expertise_areas": ["area1", "area2"],
    "achievements": ["achievement1"]
  },
  "communication_style": {
    "tone": "direct|friendly|formal|casual|technical",
    "languages": ["en", "es"],
    "preferences": {
      "answers": "short + rationale",
      "code": "no comments",
      "explanations": "always include the why"
    }
  },
  "embedding": {
    "model": "text-embedding-3-large",
    "vector": [0.123, -0.456, ...],
    "generated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Field Descriptions

#### `owner`
- `name`: Your full name
- `role`: Professional role or title
- `location`: Geographic location

#### `identity`  
- `bio`: Brief professional bio (2-3 sentences)
- `skills`: Technical skills and tools
- `interests`: Professional interests and focus areas
- `expertise_areas`: Domains where you have deep knowledge
- `achievements`: Notable accomplishments

#### `communication_style`
- `tone`: Overall communication style
- `languages`: Languages you communicate in  
- `preferences`: Specific preferences for how responses should be formatted

## Examples

### Developer Profile

See `examples/developer_profile.json` for a technical professional focused on code quality and performance.

### Entrepreneur Profile  

See `examples/entrepreneur_profile.json` for a business-focused profile emphasizing ROI and market impact.

## Benchmarking

The benchmark system compares responses with and without PVS injection across multiple LLMs.

### Custom Question Sets

Create your own question sets:

```json
[
  {
    "id": "unique_id",
    "category": "technical|personal|advice|creative", 
    "prompt": "Your question here",
    "expected_style": ["style1", "style2"],
    "context": "Additional context"
  }
]
```

### Running Benchmarks

```bash
# Basic benchmark (uses default OpenAI model)
npm run benchmark

# Test specific models
npm run benchmark -- --models openai:gpt-4o,anthropic:claude-3-5-sonnet-20241022

# List all available models
npm run benchmark:list

# Show benchmark help
npm run benchmark:help
```

## Token Management

### Understanding Token Consumption

**Important**: The embedding vector (e.g., 3,072 dimensions) is **NOT** sent to the LLM. Only the text-based system prompt consumes tokens.

#### What Uses Tokens

1. **System Prompt**: Generated from your PVS data (~100-300 tokens typically)
2. **User Query**: Your actual question/request
3. **LLM Response**: The model's answer

#### Token Analysis Tool

```bash
# Analyze your PVS token usage
npm run analyze-tokens

# Test with specific models
npm run analyze-tokens -- --model claude-3-5-sonnet-20241022

# Include a sample query
npm run analyze-tokens -- --query "Help me build an API" --model gpt-4o

# Get optimization suggestions
npm run analyze-tokens -- --optimize

# Comprehensive token demo
npm run token-demo
```

#### Model Context Limits

| Model | Context Window | Recommended PVS | Warning Threshold |
|-------|----------------|-----------------|-------------------|
| GPT-4o | 128,000 | 2,000 | 3,000 |
| GPT-4o-mini | 128,000 | 2,000 | 3,000 |
| Claude-3.5 Sonnet | 200,000 | 3,000 | 5,000 |
| Gemini 1.5 Pro | 2,000,000 | 5,000 | 10,000 |
| DeepSeek Chat | 32,000 | 1,500 | 2,500 |

#### Token Optimization Tips

1. **Keep bios concise**: 1-2 sentences (under 200 characters)
2. **Limit skills**: Top 8-10 most relevant skills
3. **Prioritize achievements**: 3 most impactful accomplishments
4. **Remove optional fields**: Skip expertise_areas if skills cover it

```typescript
// Example: Estimate tokens programmatically
import { TokenEstimator } from './src/token_estimator';

const estimator = new TokenEstimator();
const analysis = estimator.analyzeForModel(pvs, 'gpt-4o-mini', userQuery);

console.log(`System prompt: ${analysis.breakdown.systemPrompt} tokens`);
console.log(`Total estimated: ${analysis.breakdown.totalEstimated} tokens`);
```

## Advanced Usage

### Custom Embedding Models

```typescript
const generator = new PVSGenerator(apiKey, 'text-embedding-3-small');
```

### Custom System Prompts

```typescript
const customPrompt = "Additional instructions for the LLM";
const context = await adapter.inject(pvs, customPrompt);
```

### Programmatic PVS Creation

```typescript
import { PersonalVectorStore } from './src/types';

const pvs: PersonalVectorStore = {
  pvs_version: "0.1",
  owner: {
    name: "John Doe",
    role: "Software Engineer"
  },
  // ... rest of the structure
};
```

## Best Practices

1. **Keep bios concise** - 2-3 sentences maximum
2. **Be specific with skills** - Use exact technology names
3. **Update regularly** - Regenerate embeddings when your profile changes
4. **Test across providers** - Different LLMs may respond differently to the same PVS
5. **Version your PVS files** - Keep track of changes over time

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all required API keys are set in your `.env` file
2. **Embedding Generation Fails**: Check OpenAI API key and quota
3. **Large Response Times**: Consider using smaller models or reducing context length
4. **Inconsistent Results**: Try regenerating embeddings or adjusting your PVS content

### Getting Help

- Check the examples in `/examples`
- Review benchmark results in `/benchmarks/results`
- Open an issue on the GitHub repository
