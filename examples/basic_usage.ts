#!/usr/bin/env ts-node
import { config } from 'dotenv';
import { PVSGenerator } from '../src/generate_pvs';
import { OpenAIAdapter } from '../src/adapters';
import { PersonalVectorStore } from '../src/types';

config();

async function basicUsageExample() {
  console.log('=== PVS Basic Usage Example ===\\n');

  try {
    // Step 1: Generate PVS from JSON
    console.log('1. Generating PVS from JSON...');
    const generator = new PVSGenerator();
    const pvs: PersonalVectorStore = await generator.generateFromFile({
      inputPath: 'pvs.json',
      outputPath: 'examples/generated_example.json',
      overwrite: true
    });

    // Step 2: Initialize LLM adapter
    console.log('\\n2. Initializing OpenAI adapter...');
    const adapter = new OpenAIAdapter();

    // Step 3: Test without PVS
    console.log('\\n3. Testing question WITHOUT PVS...');
    const question = "I'm building a Node.js API. Should I use Express or Fastify?";
    
    const baselineResponse = await adapter.query(question, '');
    console.log('Baseline Response:', baselineResponse.substring(0, 200) + '...');

    // Step 4: Test with PVS
    console.log('\\n4. Testing same question WITH PVS...');
    const pvsContext = await adapter.inject(pvs);
    const pvsResponse = await adapter.query(question, pvsContext);
    console.log('PVS-Enhanced Response:', pvsResponse.substring(0, 200) + '...');

    // Step 5: Compare
    console.log('\\n5. Comparison Summary:');
    console.log(`- Baseline length: ${baselineResponse.length} chars`);
    console.log(`- PVS-enhanced length: ${pvsResponse.length} chars`);
    console.log(`- PVS adds personal context: ${pvsContext.includes(pvs.owner.name) ? '✓' : '✗'}`);

  } catch (error) {
    console.error('Error in basic usage example:', error);
  }
}

async function showPVSContent() {
  console.log('\\n=== Example PVS Content ===\\n');
  
  try {
    const generator = new PVSGenerator();
    const pvs = await generator.generateFromFile({
      inputPath: 'pvs.json',
      outputPath: 'examples/temp_pvs.json',
      overwrite: true
    });

    console.log('PVS Structure:');
    console.log(`- Owner: ${pvs.owner.name} (${pvs.owner.role})`);
    console.log(`- Skills: ${pvs.identity.skills.join(', ')}`);
    console.log(`- Interests: ${pvs.identity.interests.join(', ')}`);
    console.log(`- Communication Style: ${pvs.communication_style.tone}`);
    console.log(`- Vector Dimensions: ${pvs.embedding.vector.length}`);
    console.log(`- Model Used: ${pvs.embedding.model}`);

    // Cleanup
    require('fs').unlinkSync('examples/temp_pvs.json');
    
  } catch (error) {
    console.error('Error showing PVS content:', error);
  }
}

if (require.main === module) {
  (async () => {
    await showPVSContent();
    await basicUsageExample();
  })();
}
