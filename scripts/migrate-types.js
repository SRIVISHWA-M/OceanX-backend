const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Note = require('../models/Note');

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        // 1. Update 'handwritten' to 'text' (Order matters!)
        const textRes = await Note.updateMany(
            { type: 'handwritten' },
            { $set: { type: 'text' } }
        );
        console.log(`Updated ${textRes.modifiedCount} notes from 'handwritten' to 'text'`);

        // 2. Update 'image' to 'handwritten'
        const handRes = await Note.updateMany(
            { type: 'image' },
            { $set: { type: 'handwritten' } }
        );
        console.log(`Updated ${handRes.modifiedCount} notes from 'image' to 'handwritten'`);

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
