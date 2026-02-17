const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    chapterName: {
        type: String,
        trim: true,
        maxlength: [100, 'Chapter name cannot be more than 100 characters']
    },
    subject: {
        type: String,
        trim: true,
        maxlength: [50, 'Subject cannot be more than 50 characters']
    },
    type: {
        type: String,
        required: true,
        enum: ['pdf', 'word', 'handwritten', 'text']
    },
    content: {
        type: String, // For 'handwritten' text notes or transcriptions
    },
    fileUrl: {
        type: String, // Path to the uploaded file
    },
    fileName: {
        type: String,
    },
    fileSize: {
        type: Number,
    },
    mimeType: {
        type: String,
    },
    aiSummary: {
        type: String, // Cached AI-generated summary
    },
    aiSummaryGeneratedAt: {
        type: Date, // Timestamp when AI summary was generated
    },
    aiQuiz: [{
        question: String,
        options: [String],
        answer: Number
    }],
    aiQuizGeneratedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);
