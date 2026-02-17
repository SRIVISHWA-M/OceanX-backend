const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Load Note model
const Note = require('./models/Note');

async function clearAICache() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/oceanx');

        console.log('Clearing AI summary cache for all notes...');
        const result = await Note.updateMany(
            {},
            {
                $unset: { aiSummary: 1, aiSummaryGeneratedAt: 1 }
            }
        );

        console.log(`✅ Success! Cleared cache for ${result.modifiedCount} notes.`);
        console.log('You can now click "AI Insights" again to see real-time data.');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        process.exit(1);
    }
}

clearAICache();
