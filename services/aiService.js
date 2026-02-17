const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key');
const Groq = require('groq-sdk');

// Initialize Groq AI (Fallback)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Generate AI summary for a note
 * @param {Object} note - Note object from database
 * @returns {Promise<string>} - AI generated summary
 */
const summarizeNote = async (note) => {
    try {
        // Validate API key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            throw new Error('Gemini API key not configured. Please add your API key to the .env file.');
        }

        // Get the Gemini model - using verified gemini-flash-latest
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // Prepare the content based on note type
        let contentToSummarize = '';

        if (note.content) {
            contentToSummarize = note.content;
        } else if (note.type === 'pdf' || note.type === 'word' || note.type === 'handwritten') {
            // Fallback for files if OCR is not yet complete or failed
            contentToSummarize = `Title: ${note.title}\nSubject: ${note.subject || 'Not specified'}\nChapter: ${note.chapterName || 'Not specified'}\nType: ${note.type}`;
        }

        if (!contentToSummarize) {
            throw new Error('No content available to summarize');
        }

        // Create the prompt for AI
        const prompt = `You are an AI study assistant helping students learn better. 
        
Analyze the following study material and create a comprehensive, student-friendly summary that:
1. Highlights the main concepts and key points
2. Identifies important topics that students should focus on
3. Uses clear, educational language
4. Is concise but informative (2-4 sentences)

Study Material:
${contentToSummarize}

Generate a smart summary:`;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        return summary.trim();
    } catch (error) {
        const errorMsg = error.message.toLowerCase();

        // 🚨 FALLBACK TO GROQ IF GEMINI QUOTA EXCEEDED
        if ((error.status === 429 || errorMsg.includes('quota')) && process.env.GROQ_API_KEY) {
            console.log('🔄 Gemini Quota Exceeded. Falling back to Groq for Summary...');
            try {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: `Analyze the following study material and create a comprehensive, student-friendly summary (2-4 sentences):\n\n${note.content || note.title}` }],
                    model: 'llama-3.1-8b-instant',
                });
                return completion.choices[0]?.message?.content || "Summary generated (Groq Fallback).";
            } catch (groqError) {
                console.error('Groq Fallback Error:', groqError);
            }
        }

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('AI Summarization Error Details:');
        console.error('Message:', error.message);
        if (error.status) console.error('Status:', error.status);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Provide user-friendly error messages
        if (errorMsg.includes('api key') && errorMsg.includes('not valid')) {
            throw new Error('Invalid API key. Please verify your Gemini API key is correct.');
        } else if (error.status === 429 || errorMsg.includes('quota') || errorMsg.includes('limit')) {
            throw new Error('AI logic is resting (Quota reached). This is a free tier limit. Please try again in 24 hours.');
        } else if (errorMsg.includes('not found')) {
            throw new Error('LLM model not found. The model name might have changed or is restricted for your API key.');
        }

        throw new Error(`Failed to generate AI summary: ${error.message}`);
    }
};

/**
 * Generate AI quiz for a note
 * @param {Object} note - Note object from database
 * @returns {Promise<Array>} - Array of 10 quiz questions
 */
const generateQuiz = async (note) => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            throw new Error('Gemini API key not configured.');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        let contentToAnalyze = '';
        if (note.content) {
            contentToAnalyze = note.content;
        } else {
            // Fallback for files if OCR is not yet complete or failed
            contentToAnalyze = `Title: ${note.title}\nSubject: ${note.subject || 'Not specified'}\nChapter: ${note.chapterName || 'Not specified'}\nType: ${note.type}`;
        }

        const prompt = `You are an expert academic evaluator.
Analyze the following study material and generate a high-quality interactive quiz for a student.

CRITICAL INSTRUCTION: Your questions MUST be strictly based on the provided content. If the content is short, focus on the core concepts present. Do NOT generate generic questions unless the content is absolutely unusable.

Material to analyze:
${contentToAnalyze}

Requirements:
1. Generate exactly 10 multiple-choice questions (or as many as possible up to 10 if content is very thin, but aim for 10).
2. Each question must have exactly 4 options.
3. Identify exactly one correct answer (0-indexed).
4. THE RESPONSE MUST BE A VALID JSON ARRAY OF OBJECTS. NO OTHER TEXT.
5. Format:
[
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 1
  }
]

Generate the quiz JSON:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (sometimes Gemini adds backticks)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;

        console.log('--- DEBUG: Raw Gemini Quiz Text ---');
        console.log(text);
        console.log('--- DEBUG: Extracted JSON ---');
        console.log(jsonStr);

        const rawQuiz = JSON.parse(jsonStr);

        if (!Array.isArray(rawQuiz) || rawQuiz.length === 0) {
            throw new Error('Failed to generate a valid quiz array');
        }

        // Normalize JSON keys (handle cases where AI uses q, choices, etc.)
        const quiz = rawQuiz.map(item => ({
            question: item.question || item.q || item.text || item.title || "Question missing",
            options: item.options || item.choices || item.answers || item.alternatives || [],
            answer: typeof item.answer === 'number' ? item.answer :
                (typeof item.correct === 'number' ? item.correct :
                    (typeof item.correctAnswer === 'number' ? item.correctAnswer : 0))
        }));

        return quiz.slice(0, 10); // Ensure exactly 10 if more were generated
    } catch (error) {
        const errorMsg = error.message.toLowerCase();

        // 🚨 FALLBACK TO GROQ IF GEMINI QUOTA EXCEEDED
        if ((error.status === 429 || errorMsg.includes('quota')) && process.env.GROQ_API_KEY) {
            console.log('🔄 Gemini Quota Exceeded. Falling back to Groq for Quiz...');
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'Return ONLY a JSON array of 10 multiple choice questions. Format: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": 0}]' },
                        { role: 'user', content: `Generate a 10-question quiz based on this content: ${note.content || note.title}` }
                    ],
                    model: 'llama-3.1-8b-instant',
                    response_format: { type: "json_object" }
                });

                const responseText = completion.choices[0]?.message?.content;
                console.log('--- DEBUG: Raw Groq Quiz Text ---');
                console.log(responseText);
                const parsed = JSON.parse(responseText);
                // Groq might wrap it in a root key or return array directly
                const quizArray = Array.isArray(parsed) ? parsed : (parsed.quiz || parsed.questions || parsed.data || []);

                const normalized = quizArray.map(item => ({
                    question: item.question || item.q || item.text || item.title || "Question missing",
                    options: item.options || item.choices || item.answers || item.alternatives || [],
                    answer: typeof item.answer === 'number' ? item.answer :
                        (typeof item.correct === 'number' ? item.correct :
                            (typeof item.correctAnswer === 'number' ? item.correctAnswer : 0))
                }));

                return normalized.slice(0, 10);
            } catch (groqError) {
                console.error('Groq Fallback Error (Quiz):', groqError);
            }
        }

        console.error('AI Quiz Generation Error:', error);

        if (error.status === 429 || errorMsg.includes('quota') || errorMsg.includes('limit')) {
            throw new Error('AI logic is resting (Quota reached). This is a free tier limit. Please try again in 24 hours.');
        }

        throw new Error(`Failed to generate AI quiz: ${error.message}`);
    }
};

/**
 * Generate AI feedback for a quiz result
 * @param {Object} note - Note object
 * @param {number} score - Number of correct answers
 * @param {number} total - Total questions
 * @returns {Promise<string>} - AI generated feedback
 */
const getQuizFeedback = async (note, score, total) => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            throw new Error('Gemini API key not configured.');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const accuracy = Math.round((score / total) * 100);

        const prompt = `You are a supportive and expert study coach.
A student just completed a quiz based on the material: "${note.title}".
Score: ${score}/${total} (${accuracy}%)

Based on this performance, provide a short, motivating, and personalized insight (2-3 sentences).
- If they did great (80%+), celebrate their mastery and suggest what to tackle next.
- If they did okay (50-79%), acknowledge their progress and suggest focusing on specific areas they might have missed.
- If they struggled (<50%), provide encouragement and a concrete study tip (e.g., "Review the summary first").

Feedback:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        const errorMsg = error.message.toLowerCase();

        // 🚨 FALLBACK TO GROQ IF GEMINI QUOTA EXCEEDED
        if ((error.status === 429 || errorMsg.includes('quota')) && process.env.GROQ_API_KEY) {
            console.log('🔄 Gemini Quota Exceeded. Falling back to Groq for Feedback...');
            try {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: `A student scored ${score}/${total} on a quiz for "${note.title}". Provide a 2-sentence supportive study insight.` }],
                    model: 'llama3-8b-8192',
                });
                return completion.choices[0]?.message?.content || "Great effort! Keep practicing to master the material.";
            } catch (groqError) {
                console.error('Groq Fallback Error (Feedback):', groqError);
            }
        }

        console.error('AI Feedback Generation Error:', error);

        if (error.status === 429 || errorMsg.includes('quota') || errorMsg.includes('limit')) {
            // Return a static supportive message instead of failing for feedback
            return "Great job on completing the quiz! AI is currently resting, but keep reviewing your notes to master the material even further.";
        }

        return "Great job on completing the quiz! Keep reviewing your notes to master the material even further.";
    }
};

/**
 * Extract text from a file (PDF or Image) AND generate summary (Smart Batching)
 * @param {Object} file - File information
 * @returns {Promise<Object>} - { extractedText, summary }
 */
const extractTextFromFile = async (file) => {
    let retryCount = 0;
    const maxRetries = 2;

    const performExtraction = async () => {
        try {
            if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
                throw new Error('Gemini API key not configured.');
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '..', file.fileUrl);

            if (!fs.existsSync(filePath)) {
                throw new Error('File not found at ' + filePath);
            }

            const fileData = fs.readFileSync(filePath);
            const base64Data = fileData.toString('base64');

            const prompt = `Please analyze this document and perform two tasks:
1. Extract ALL text accurately.
2. Provide a 2-3 sentence student-friendly summary of the content.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
---TEXT_START---
[Full extracted text here]
---TEXT_END---
---SUMMARY_START---
[Summary here]
---SUMMARY_END---`;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: file.mimeType || (file.fileUrl.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            // Parse batched response
            const textMatch = text.match(/---TEXT_START---([\s\S]*?)---TEXT_END---/);
            const summaryMatch = text.match(/---SUMMARY_START---([\s\S]*?)---SUMMARY_END---/);

            const extractedText = textMatch ? textMatch[1].trim() : text.trim();
            const summary = summaryMatch ? summaryMatch[1].trim() : "Summary generation in progress...";

            return { extractedText, summary };

        } catch (error) {
            const errorMsg = error.message.toLowerCase();

            // Handle Quota Error specifically
            if (error.status === 429 || errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('exhausted') || errorMsg.includes('429')) {
                throw new Error('AI logic is resting (Quota reached). This is a free tier limit (20 req/day). Please try again in 24 hours or upgrade.');
            }

            // Retry for transient network errors
            if ((error.status === 503 || error.status === 500) && retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying OCR... Attempt ${retryCount}`);
                return performExtraction();
            }

            throw error;
        }
    };

    return performExtraction();
};

module.exports = {
    summarizeNote,
    generateQuiz,
    getQuizFeedback,
    extractTextFromFile
};
