import { Router } from 'express';
import { broadcastCreate, createChatRoom, deleteRoom, getAllRooms, getRoom, getRoomByEventId, getRoomByUser, getUnreadCountsAllRooms, joinRoom, updateChatRoom, shareInChat } from '../controllers/chat-room.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { broadcastCreateSchema, createChatRoomSchema, joinRoomSchema, getRoomByUserSchema, updateChatRoomSchema, shareInChatSchema } from '../validations/chat-room.validations';

const chatRoomRouter = Router();

// GET APIs
chatRoomRouter.get('/unread-count', authenticateToken, getUnreadCountsAllRooms);
chatRoomRouter.get('/by-event/:event_id', authenticateToken, getRoomByEventId);
chatRoomRouter.get('/:user_id/rooms', authenticateToken, validateSchema(getRoomByUserSchema, 'query'), getRoomByUser);
chatRoomRouter.get('/', authenticateToken, getAllRooms);
chatRoomRouter.get('/:room_id', authenticateToken, getRoom);

// POST APIs
chatRoomRouter.post('/', authenticateToken, validateSchema(createChatRoomSchema, 'body'), createChatRoom);

chatRoomRouter.post('/broadcast', authenticateToken, validateSchema(broadcastCreateSchema, 'body'), broadcastCreate);

chatRoomRouter.post('/share', authenticateToken, validateSchema(shareInChatSchema, 'body'), shareInChat);

// PUT APIs
chatRoomRouter.put('/join', authenticateToken, validateSchema(joinRoomSchema, 'body'), joinRoom);
chatRoomRouter.put('/:room_id', authenticateToken, validateSchema(updateChatRoomSchema, 'body'), updateChatRoom);

// DELETE API
chatRoomRouter.delete('/:room_id/user/:user_id', authenticateToken, deleteRoom);

export default chatRoomRouter;

