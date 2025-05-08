const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// User operations
router.get('/', userController.getAllUsers);
router.get('/online', userController.getOnlineUsers);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUserById);
router.put('/status', userController.updateStatus);
router.put('/profile', userController.updateProfile);

module.exports = router;
