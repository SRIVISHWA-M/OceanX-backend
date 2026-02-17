// Test script to check API key with direct REST call
const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

// Try the v1 API instead of v1beta
const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1/models/gemini-pro:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

const data = JSON.stringify({
    contents: [{
        parts: [{
            text: 'Say hello in one word'
        }]
    }]
});

console.log('Testing with v1 API endpoint...\n');

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);

        if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS! The v1 API works!');
        } else {
            console.log('\n❌ Failed with v1 API too');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request Error:', error);
});

req.write(data);
req.end();
