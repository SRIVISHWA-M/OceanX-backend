const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

function listModels() {
    console.log('--- Listing Available Models via REST ---');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log('Available Models:');
                    json.models.forEach(m => {
                        console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
                    });
                } else {
                    console.log('Unexpected response:', json);
                }
            } catch (e) {
                console.error('Parse error:', e.message);
                console.log('Raw data:', data);
            }
        });
    }).on('error', (err) => {
        console.error('Request error:', err.message);
    });
}

listModels();
