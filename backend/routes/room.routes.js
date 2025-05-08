const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public endpoint - no authentication required
router.get('/public', roomController.getAllRooms);

// All other routes require authentication
router.use(authenticate);

// Room operations
router.get('/user', roomController.getUserRooms);
router.post('/', roomController.createRoom);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.post('/join', roomController.joinRoomByInviteCode);
router.post('/:id/invite', roomController.generateNewInviteCode);
router.delete('/:id/leave', roomController.leaveRoom);
router.delete('/:id', roomController.deleteRoom);
router.delete('/:id/members/:memberId', roomController.removeMember);

module.exports = router;
