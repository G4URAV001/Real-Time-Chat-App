const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../utils/fileUpload');

// All routes require authentication
router.use(authenticate);

// Room messages
router.get('/room/:roomId', messageController.getRoomMessages);
router.post('/room/:roomId', messageController.sendRoomMessage);
router.post('/room-with-attachments', upload.array('files', 5), messageController.sendRoomMessageWithAttachments);

// Direct messages
router.get('/direct/:userId', messageController.getDirectMessages);
router.post('/direct/:userId', messageController.sendDirectMessage);
router.post('/direct-with-attachments', upload.array('files', 5), messageController.sendDirectMessageWithAttachments);
router.get('/conversations', messageController.getDirectConversations);

module.exports = router;
