const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, getUserStats } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/stats', protect, getUserStats);

module.exports = router;
