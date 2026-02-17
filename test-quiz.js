const mongoose = require('mongoose');
require('dotenv').config();
const Note = require('./models/Note');

async function testQuizEndpoint() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/oceanx');

        const note = await Note.findOne();
        if (!note) {
            console.log('No notes found to test.');
            process.exit(0);
        }

        console.log(`Testing quiz generation for note: ${note.title} (${note._id})`);

        // Use a dynamic import or just require if it's a commonjs project
        const { generateQuiz } = require('./services/aiService');
        const quiz = await generateQuiz(note);

        console.log('✅ Quiz Generated Successfully!');
        console.log(`Number of questions: ${quiz.length}`);
        console.log('First Question Preview:', quiz[0].question);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

testQuizEndpoint();
