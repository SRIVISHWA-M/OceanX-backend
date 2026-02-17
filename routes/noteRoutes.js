const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    uploadNote,
    createTextNote,
    getNotes,
    getNote,
    deleteNote,
    generateAISummary,
    generateAIQuiz,
    getQuizFeedback,
    getQuizHistory,
    getQuizAttempt,
    toggleCollection,
    getCollectionNotes,
    performOCR
} = require('../controllers/noteController');
const { protect } = require('../middleware/auth');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word, and Images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter
});

// Routes
router.use(protect); // Protect all note routes

router.post('/upload', upload.single('file'), uploadNote);
router.post('/text', createTextNote);
router.get('/', getNotes);

router.get('/collection', getCollectionNotes);
router.post('/:id/collection', toggleCollection);

router.get('/quiz/history', getQuizHistory);
router.get('/quiz/attempt/:id', getQuizAttempt);

router.get('/:id', getNote);
router.post('/:id/summary', generateAISummary);
router.post('/:id/quiz', generateAIQuiz); // Added quiz generation route
router.post('/:id/feedback', getQuizFeedback); // Added quiz feedback route
router.post('/:id/ocr', performOCR);
router.delete('/:id', deleteNote);

module.exports = router;
