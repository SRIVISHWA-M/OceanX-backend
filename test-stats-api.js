const axios = require('axios');

async function testStats() {
    try {
        console.log('Testing Authentication and Stats API...');

        // 1. Login to get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@example.com', // Assuming this user exists from previous tasks
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Fetch Stats
        const statsRes = await axios.get('http://localhost:5000/api/auth/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Stats API returned success:', statsRes.data.success);
        console.log('Data returned:', JSON.stringify(statsRes.data.data, null, 2));

        if (statsRes.data.data.hasOwnProperty('totalUploads') &&
            statsRes.data.data.hasOwnProperty('graphData')) {
            console.log('✅ Data structure is correct');
        } else {
            console.log('❌ Data structure is invalid');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

testStats();
