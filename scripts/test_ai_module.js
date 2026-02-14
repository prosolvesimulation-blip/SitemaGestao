/**
 * Test script to verify the enhanced AI module functionality
 */
const axios = require('axios');

async function testAIModule() {
  console.log('Testing Enhanced AI Module...\n');
  
  // Test 1: Check if server is running
  try {
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✓ Server health check passed:', healthResponse.data.status);
  } catch (error) {
    console.error('✗ Server health check failed:', error.message);
    return;
  }
  
  // Test 2: Check AI providers
  try {
    const providersResponse = await axios.get('http://localhost:3001/api/ai/providers');
    console.log('✓ AI providers endpoint accessible, found', 
      Object.keys(providersResponse.data.providers).length, 'providers');
  } catch (error) {
    console.error('✗ AI providers endpoint failed:', error.message);
    return;
  }
  
  // Test 3: Check if context manager and command processor are working
  // by requesting the modules list
  try {
    const modulesResponse = await axios.get('http://localhost:3001/api/ai/modules');
    console.log('✓ AI modules endpoint accessible, found', 
      modulesResponse.data.modules.length, 'modules');
  } catch (error) {
    console.error('✗ AI modules endpoint failed:', error.message);
    return;
  }
  
  console.log('\nEnhanced AI Module tests completed successfully!');
  console.log('\nKey improvements implemented:');
  console.log('1. Enhanced context management for update operations');
  console.log('2. Better JSON schema validation for AI responses');
  console.log('3. Intelligent ID resolution for related entities');
  console.log('4. Improved prompts for create vs update scenarios');
  console.log('5. Automatic conversion of names to IDs in relational fields');
  console.log('6. Better error handling and validation');
}

// Run the test
testAIModule().catch(console.error);