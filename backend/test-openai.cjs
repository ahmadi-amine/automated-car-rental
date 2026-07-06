// Test script to check if the OpenAI API key is valid (CommonJS version)
const OpenAI = require('openai').default;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.OPENAI_API_KEY;

console.log('Testing OpenAI API key...');
console.log(`API Key starts with: ${apiKey?.slice(0, 10)}...`);

if (!apiKey) {
  console.error('❌ Error: OPENAI_API_KEY not found in .env');
  process.exit(1);
}

async function testAPI() {
  try {
    const client = new OpenAI({
      apiKey: apiKey,
    });

    // Make a simple API call to test the key
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello! Just testing if you work.' }],
      max_tokens: 50,
    });

    console.log('✅ SUCCESS! OpenAI API key is valid and working!');
    console.log('🤖 AI Response:', response.choices[0].message.content);
    
    // Check usage
    console.log(`\n💡 Token Usage: ${response.usage?.total_tokens || 0} tokens`);
    
  } catch (error) {
    console.error('❌ Error with OpenAI API key:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
    process.exit(1);
  }
}

testAPI();
