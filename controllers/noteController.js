const mongoose = require('mongoose');
const Note = require('../models/Note');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { summarizeNote, generateQuiz, getQuizFeedback, extractTextFromFile } = require('../services/aiService');

// @desc    Toggle note in user's collection
// @route   POST /api/notes/:id/collection
// @access  Private
exports.toggleCollection = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const noteId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        // Ensure collections is an array
        if (!user.collections) {
            user.collections = [];
        }

        // Use some() and toString() for robust comparison of ObjectIds
        const isCollected = user.collections.some(id => id && id.toString() === noteId);

        if (isCollected) {
            // Remove from collection
            user.collections = user.collections.filter(id => id && id.toString() !== noteId);
        } else {
            // Add to collection
            user.collections.push(noteId);
        }

        await user.save();

        res.status(200).json({
            success: true,
            isCollected: !isCollected,
            data: user.collections
        });
    } catch (err) {
        console.error('Toggle Collection Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// @desc    Get all notes in user's collection
// @route   GET /api/notes/collection
// @access  Private
exports.getCollectionNotes = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const user = await User.findById(req.user.id).populate({
            path: 'collections',
            populate: {
                path: 'user',
                select: 'name'
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Filter out any null entries (in case a note was deleted)
        const validCollections = user.collections.filter(note => note !== null);

        res.status(200).json({
            success: true,
            count: validCollections.length,
            data: validCollections
        });
    } catch (err) {
        console.error('Get Collection Notes Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// @desc    Upload a file note
// @route   POST /api/notes/upload
// @access  Private (To be implemented with auth middleware)
exports.uploadNote = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        const { title, type, chapterName, subject } = req.body;

        const note = await Note.create({
            user: req.user ? req.user.id : null, // Fallback if auth not yet integrated
            title: title || req.file.originalname,
            chapterName,
            subject,
            type: type || 'pdf',
            fileUrl: `/uploads/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });

        // Trigger OCR and Initial Summary automatically (Smart Batching)
        extractTextFromFile(note).then(async (result) => {
            note.content = result.extractedText;
            note.aiSummary = result.summary;
            note.aiSummaryGeneratedAt = new Date();
            await note.save();
            console.log(`Smart Batching complete for note: ${note._id}`);
        }).catch(err => {
            console.error(`Smart Batching failed for note: ${note._id}`, err);
        });

        res.status(201).json({
            success: true,
            data: note
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Create a text note
// @route   POST /api/notes/text
// @access  Private
exports.createTextNote = async (req, res, next) => {
    try {
        const { title, content, type, chapterName, subject } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Please add content' });
        }

        const note = await Note.create({
            user: req.user ? req.user.id : null,
            title: title || 'Untitled Note',
            chapterName,
            subject,
            type: type || 'text',
            content
        });

        res.status(201).json({
            success: true,
            data: note
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getNotes = async (req, res, next) => {
    try {
        const { search, type } = req.query;
        let query = {};

        if (search) {
            if (type === 'subject') {
                query.subject = { $regex: search, $options: 'i' };
            } else if (type === 'chapter') {
                query.chapterName = { $regex: search, $options: 'i' };
            } else {
                // Default: search across all fields
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                    { chapterName: { $regex: search, $options: 'i' } }
                ];
            }
        }

        const notes = await Note.find(query)
            .populate('user', 'name')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: notes.length,
            data: notes
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Private
exports.getNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.status(200).json({
            success: true,
            data: note
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
exports.deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Make sure user owns note
        if (note.user.toString() !== req.user.id) {
            return res.status(401).json({ error: 'User not authorized to delete this note' });
        }

        // Delete associated file if it exists
        if (note.fileUrl) {
            const filePath = path.join(__dirname, '..', note.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Note.deleteOne({ _id: req.params.id });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.generateAIQuiz = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Check if we already have a cached quiz (generated within last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let forceNewQuiz = false;

        // Generate or force OCR if content is missing for file-type notes
        if (!note.content && (note.type === 'handwritten' || note.type === 'pdf' || note.type === 'word')) {
            console.log(`Forcing OCR for ${note.type} note: ${note._id} before quiz generation`);
            const { extractTextFromFile } = require('../services/aiService');
            try {
                const result = await extractTextFromFile(note);
                note.content = result.extractedText;
                note.aiSummary = result.summary;
                note.aiSummaryGeneratedAt = new Date();
                await note.save();
                forceNewQuiz = true; // We just got new content, need a fresh quiz
                console.log('Fress content extracted, forcing fresh quiz generation.');
            } catch (ocrErr) {
                console.error('Auto-OCR failed before quiz:', ocrErr);
            }
        }

        // Cache check - skip if we forced new content
        if (!forceNewQuiz && note.aiQuiz && note.aiQuiz.length > 0 && note.aiQuizGeneratedAt && note.aiQuizGeneratedAt > oneDayAgo) {
            console.log(`Serving cached quiz for note: ${note._id}`);
            return res.status(200).json({
                success: true,
                data: {
                    quiz: note.aiQuiz,
                    cached: true,
                    generatedAt: note.aiQuizGeneratedAt
                }
            });
        }

        // Generate new AI quiz using the service
        console.log(`Generating fresh AI quiz for note: ${note._id} (forceNewQuiz: ${forceNewQuiz})`);
        const quiz = await generateQuiz(note);

        // Save the quiz to the database
        note.aiQuiz = quiz;
        note.aiQuizGeneratedAt = new Date();
        await note.save();

        res.status(200).json({
            success: true,
            data: {
                quiz: quiz,
                cached: false,
                generatedAt: note.aiQuizGeneratedAt
            }
        });
    } catch (err) {
        console.error('AI Quiz Generation Full Error:', err);
        res.status(500).json({
            error: 'Failed to generate AI quiz',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

exports.generateAISummary = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Check if we already have a cached summary (generated within last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (note.aiSummary && note.aiSummaryGeneratedAt && note.aiSummaryGeneratedAt > oneDayAgo) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: note.aiSummary,
                    cached: true,
                    generatedAt: note.aiSummaryGeneratedAt
                }
            });
        }

        // Generate new AI summary using the service
        const summary = await summarizeNote(note);

        // Save the summary to the database
        note.aiSummary = summary;
        note.aiSummaryGeneratedAt = new Date();
        await note.save();

        res.status(200).json({
            success: true,
            data: {
                summary: summary,
                cached: false,
                generatedAt: note.aiSummaryGeneratedAt
            }
        });
    } catch (err) {
        console.error('AI Summary Generation Full Error:', err);
        res.status(500).json({
            error: 'Failed to generate AI summary',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// @desc    Get AI feedback for quiz result
// @route   POST /api/notes/:id/feedback
// @access  Private
exports.getQuizFeedback = async (req, res, next) => {
    try {
        const { score, total, answers } = req.body;
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const { getQuizFeedback } = require('../services/aiService');
        const feedback = await getQuizFeedback(note, score, total);

        // Record the quiz attempt
        try {
            const QuizAttempt = require('../models/QuizAttempt');
            await QuizAttempt.create({
                user: req.user.id,
                note: note._id,
                score,
                total,
                percentage: total > 0 ? (score / total) * 100 : 0,
                answers: answers || []
            });
        } catch (attemptErr) {
            console.error('Failed to record quiz attempt:', attemptErr);
            // Don't fail the whole request if tracking fails
        }

        res.status(200).json({
            success: true,
            data: {
                feedback
            }
        });
    } catch (err) {
        console.error('AI Feedback Generation Error:', err);
        res.status(500).json({ error: 'Failed to generate feedback' });
    }
};

// @desc    Get quiz history for current user
// @route   GET /api/notes/quiz/history
// @access  Private
exports.getQuizHistory = async (req, res, next) => {
    try {
        const QuizAttempt = require('../models/QuizAttempt');
        const history = await QuizAttempt.find({ user: req.user.id })
            .populate('note', 'title subject chapterName')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (err) {
        console.error('Get Quiz History Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// @desc    Get single quiz attempt detail
// @route   GET /api/notes/quiz/attempt/:id
// @access  Private
exports.getQuizAttempt = async (req, res, next) => {
    try {
        const QuizAttempt = require('../models/QuizAttempt');
        const attempt = await QuizAttempt.findById(req.params.id)
            .populate('note', 'title subject chapterName');

        if (!attempt) {
            return res.status(404).json({ error: 'Quiz attempt not found' });
        }

        // Check if user owns this attempt
        if (attempt.user.toString() !== req.user.id) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        res.status(200).json({
            success: true,
            data: attempt
        });
    } catch (err) {
        console.error('Get Quiz Attempt Error:', err);
        res.status(500).json({ error: err.message });
    }
};


// @desc    Explicitly perform OCR on a note
// @route   POST /api/notes/:id/ocr
// @access  Private
exports.performOCR = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (note.type !== 'handwritten' && note.type !== 'pdf' && note.type !== 'word') {
            return res.status(400).json({ error: 'OCR only supported for handwritten, pdf, or word notes' });
        }

        const result = await extractTextFromFile(note);

        note.content = result.extractedText;
        note.aiSummary = result.summary;
        note.aiSummaryGeneratedAt = new Date();
        await note.save();

        res.status(200).json({
            success: true,
            data: {
                content: note.content,
                summary: note.aiSummary
            }
        });
    } catch (err) {
        console.error('OCR Error:', err);
        const errorMsg = err.message || '';
        if (errorMsg.includes('Quota reached') || errorMsg.includes('exhausted') || errorMsg.includes('limit')) {
            return res.status(429).json({ error: errorMsg });
        }
        res.status(500).json({ error: errorMsg });
    }
};
