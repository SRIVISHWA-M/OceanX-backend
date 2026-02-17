const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function testUploads() {
    try {
        console.log('🚀 Starting Backend Upload Verification...');

        // 1. Register a test user
        console.log('\n--- 1. Registering Test User ---');
        const userEmail = `test_${Date.now()}@example.com`;
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test User',
            email: userEmail,
            password: 'password123'
        });
        const token = registerRes.data.token;
        console.log('✅ User registered successfully');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Test Text Note Upload
        console.log('\n--- 2. Testing Text Note Upload ---');
        const textNoteRes = await axios.post(`${API_URL}/notes/text`, {
            title: 'Test Text Note',
            content: 'This is a test note content for verified manual entry.',
            type: 'handwritten'
        }, config);
        console.log('✅ Text note created:', textNoteRes.data.data.title);

        // 3. Test File Upload (Dummy PDF)
        console.log('\n--- 3. Testing File Upload ---');
        const dummyFilePath = path.join(__dirname, 'test.pdf');
        fs.writeFileSync(dummyFilePath, '%PDF-1.4 dummy content');

        const form = new FormData();
        form.append('title', 'Test PDF Note');
        form.append('type', 'pdf');
        form.append('file', fs.createReadStream(dummyFilePath));

        const fileNoteRes = await axios.post(`${API_URL}/notes/upload`, form, {
            headers: {
                ...config.headers,
                ...form.getHeaders()
            }
        });
        console.log('✅ File note uploaded:', fileNoteRes.data.data.fileName);

        // Clean up dummy file
        fs.unlinkSync(dummyFilePath);

        // 4. Test Getting Notes
        console.log('\n--- 4. Fetching All Notes ---');
        const notesRes = await axios.get(`${API_URL}/notes`, config);
        console.log(`✅ Fetched ${notesRes.data.count} notes`);

        console.log('\n✨ All tests passed! Backend upload system is ready.');

    } catch (error) {
        console.error('\n❌ Verification Failed:');
        if (error.response) {
            console.error('Response Error:', error.response.data);
        } else {
            console.error('Network/Internal Error:', error.message);
        }
    }
}

testUploads();
