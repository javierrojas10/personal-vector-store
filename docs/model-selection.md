# Model Selection Guide

## Overview
This guide covers model selection capabilities, supported providers, and the enhanced console output features of the PVS benchmark system.

## New Features

### 1. Model Selection System
- **Provider:Model Format**: You can now specify exact models using `provider:model` format
- **Default Models**: Use just `provider` to get the default model for that provider
- **Multi-Model Support**: Test multiple models in a single benchmark run
- **Model Registry**: Centralized registry with all supported models and their display names

#### Available Models
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-20240620`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Google**: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`, `gemini-1.0-pro`
- **DeepSeek**: `deepseek-chat`, `deepseek-coder`

### 2. Enhanced Console Output
- **Structured Tables**: Beautiful tables for configuration and results
- **Loading Spinners**: Real-time progress indicators during API calls
- **Progress Bars**: Visual progress tracking with percentages
- **Color-Coded Output**: Different colors for success, error, warning, and info messages
- **Summary Reports**: Detailed breakdown of results by provider and model

### 3. New CLI Options
- `--models`: Specify comma-separated list of provider:model combinations
- `--list-models`: Display all available models and exit
- `--help`: Show detailed usage information

## Usage Examples

### List All Available Models
```bash
npm run benchmark:list
# or
npx ts-node benchmarks/run_benchmark.ts --list-models
```

### Run Benchmark with Specific Models
```bash
# Single model with specific version
npm run benchmark -- --models openai:gpt-4o

# Multiple models
npm run benchmark -- --models openai:gpt-4o,anthropic:claude-3-5-sonnet-20241022

# Mix of default and specific models
npm run benchmark -- --models openai,anthropic:claude-3-opus-20240229,gemini:gemini-1.5-pro
```

### Convenience Scripts
```bash
# List models
npm run benchmark:list

# Show help
npm run benchmark:help

# Run default benchmark (OpenAI with default model)
npm run benchmark
```

## Console Output Features

### Configuration Display
- Tabular view of selected models with display names
- Summary of benchmark parameters
- Clear section headers and formatting

### Real-Time Progress
- Spinner indicators during API calls
- Progress bars showing completion percentage
- Current test information (model and question)
- Pass/fail status with response times

### Results Summary
- Overview table with key metrics
- Breakdown by provider and model
- Error reporting with detailed information
- Execution time tracking

## Technical Implementation

### Model Registry System
- Centralized model configuration in `src/adapters/model_registry.ts`
- Support for default models per provider
- Display name mapping for user-friendly output
- Validation of model availability

### Console Utilities
- Dedicated `ConsoleLogger` class in `benchmarks/console_utils.ts`
- Integration with `chalk` for colors, `ora` for spinners, and `cli-table3` for tables
- Spinner lifecycle management
- Structured formatting methods

### Enhanced Benchmark Runner
- Updated to work with `ModelConfig` objects instead of simple provider strings
- Improved error handling and reporting
- Real-time progress updates
- Better integration with console utilities

## Migration from Previous Version

### Current Usage (Provider:Model Format)
```bash
# Specific models
npm run benchmark -- --models openai:gpt-4o,anthropic:claude-3-5-sonnet-20241022

# Use provider defaults
npm run benchmark -- --models openai,anthropic

# Single model
npm run benchmark -- --models openai:gpt-4o-mini
```

## Current Model Support Status

### Fully Supported ✅
- **OpenAI**: All listed models tested and working reliably for benchmarking
- **System Prompt Generation**: Works consistently across all providers

### Partially Supported ⚠️  
- **Anthropic Claude**: Basic functionality works, but benchmarking may have occasional issues
- **Google Gemini**: API integration present but needs more thorough testing
- **DeepSeek**: Basic support implemented, comprehensive testing in progress

### Token Analysis Accuracy 📊
- **OpenAI**: Highly accurate token estimation
- **Other Providers**: Estimates may vary; use as approximate guidance

## Benefits

1. **Precision**: Test specific model versions for accurate benchmarks
2. **Visibility**: Clear, structured output makes results easier to understand
3. **Progress Tracking**: Real-time feedback during long benchmark runs
4. **Error Handling**: Better error reporting and debugging information
5. **User Experience**: Professional-looking output with proper formatting
6. **Flexibility**: Mix and match any combination of providers and models

## Dependencies Added
- `chalk@^4.1.2`: Terminal colors and styling
- `ora@^5.4.1`: Loading spinners
- `cli-table3@^0.6.3`: ASCII tables for structured output
