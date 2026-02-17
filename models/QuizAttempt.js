const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    note: {
        type: mongoose.Schema.ObjectId,
        ref: 'Note',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    answers: [{
        questionText: String,
        options: [String],
        userAnswer: Number,
        correctAnswer: Number,
        isCorrect: Boolean
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
