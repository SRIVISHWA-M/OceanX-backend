const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password
        });

        if (user) {
            res.status(201).json({
                success: true,
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user
    });
};

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'oceanx_secret_key', {
        expiresIn: '30d'
    });
};

// @desc    Get user performance and activity stats
// @route   GET /api/auth/stats
// @access  Private
const getUserStats = async (req, res) => {
    try {
        const Note = require('../models/Note');
        const QuizAttempt = require('../models/QuizAttempt');

        // Total uploaded notes by user
        const totalUploads = await Note.countDocuments({ user: req.user.id });

        // Total notes in collection
        const totalSaved = req.user.collections ? req.user.collections.length : 0;

        // Total quiz attempts
        const totalQuizzes = await QuizAttempt.countDocuments({ user: req.user.id });

        // Performance history (last 7 attempts)
        const performanceHistory = await QuizAttempt.find({ user: req.user.id })
            .sort({ createdAt: 1 })
            .limit(10)
            .select('percentage createdAt')
            .lean();

        // Format history for the graph
        const graphData = performanceHistory.map((attempt, index) => ({
            name: `Quiz ${index + 1}`,
            score: Math.round(attempt.percentage),
            date: new Date(attempt.createdAt).toLocaleDateString()
        }));

        res.status(200).json({
            success: true,
            data: {
                totalUploads,
                totalSaved,
                totalQuizzes,
                graphData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUserStats
};
