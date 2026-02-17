const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'oceanx_secret_key';
const NOTE_ID = '698cc0542698d14d3f7ee73a';
const USER_ID = '698b8093825a4a75697b744f2';

const testQuiz = async () => {
    try {
        console.log('--- Starting Quiz Generation Test (User ID: ' + NOTE_ID + ') ---');

        const token = jwt.sign({ id: USER_ID }, JWT_SECRET, { expiresIn: '1h' });
        console.log('Token generated successfully');

        console.log('Calling API: POST /notes/' + NOTE_ID + '/quiz');
        const start = Date.now();

        const response = await axios.post(`${API_URL}/notes/${NOTE_ID}/quiz`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 60000
        });

        const duration = (Date.now() - start) / 1000;
        console.log(`Response received in ${duration}s`);
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Test Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
};

testQuiz();
