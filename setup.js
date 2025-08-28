#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Personal Vector Store (PVS)...\n');

// Check if .env exists
const envExists = fs.existsSync('.env');
const envExampleExists = fs.existsSync('.env.example');

if (!envExists) {
  if (envExampleExists) {
    console.log('📋 Creating .env file from .env.example...');
    console.log('⚠️  Please add your API keys to the .env file before running PVS commands.');
  } else {
    console.log('📋 Creating .env file...');
    const envContent = `# OpenAI API Key for embeddings
OPENAI_API_KEY=your_openai_api_key_here

# LLM API Keys for adapters
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Optional: Specify default embedding model
DEFAULT_EMBEDDING_MODEL=text-embedding-3-large`;
    
    fs.writeFileSync('.env', envContent);
  }
} else {
  console.log('✅ .env file already exists');
}

// Check project structure
const requiredDirs = ['src', 'examples', 'docs', 'benchmarks'];
let allDirsExist = true;

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`❌ Missing directory: ${dir}`);
    allDirsExist = false;
  }
}

if (allDirsExist) {
  console.log('✅ All required directories exist');
}

// Check if we have a base PVS file
if (fs.existsSync('pvs.json')) {
  console.log('✅ Base PVS file (pvs.json) found');
} else {
  console.log('⚠️  Base PVS file (pvs.json) not found');
  console.log('   You can create one using the examples as a template');
}

// Check for generated PVS
if (fs.existsSync('generated_pvs.json')) {
  console.log('✅ Generated PVS file found');
} else {
  console.log('📝 No generated PVS file found');
  console.log('   Run "npm run generate" to create one');
}

console.log('\n🎉 PVS setup complete!');
console.log('\nNext steps:');
console.log('1. Add your API keys to .env file');
console.log('2. Run "npm run generate" to create your PVS with embeddings');
console.log('3. Run "npm run benchmark" to test across LLMs');
console.log('4. Check out examples/ for usage patterns');
console.log('\nDocumentation: docs/usage.md');
