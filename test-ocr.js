const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { extractTextFromFile } = require('./services/aiService');

async function testOCR() {
    try {
        console.log('Testing OCR extraction...');

        // Find a file to test with
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.error('Uploads directory not found');
            return;
        }

        // Use a known larger file or first non-empty file
        const files = fs.readdirSync(uploadsDir).filter(f => {
            const stats = fs.statSync(path.join(uploadsDir, f));
            return stats.size > 1000 && (f.endsWith('.pdf') || f.endsWith('.jpg') || f.endsWith('.png'));
        });

        if (files.length === 0) {
            console.log('No suitable files found in uploads directory to test OCR.');
            return;
        }

        const testFile = files[0];
        console.log(`Using file: ${testFile}`);

        const mockNote = {
            fileUrl: `/uploads/${testFile}`,
            mimeType: testFile.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
        };

        const extractedText = await extractTextFromFile(mockNote);

        console.log('✅ Extraction successful!');
        console.log('--- Extracted Text Preview ---');
        console.log(extractedText.substring(0, 500) + '...');
        console.log('------------------------------');

    } catch (error) {
        console.error('❌ OCR Test Failed:', error.message);
    }
}

testOCR();
