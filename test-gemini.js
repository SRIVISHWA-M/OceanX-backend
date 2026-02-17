const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
    try {
        console.log('Testing gemini-flash-latest...');
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent('Say "Ready"');
        const response = await result.response;
        console.log('✅ Success! Response:', response.text());
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testModel();
