import { Router } from 'express';
import {
    deleteHistory,
    deleteMessage,
    getAllMessages,
    getMessage,
    markMessageRead,
    postMessage,
    reactionToMessage,
    sendIndividualMessage,
    updateMessage
} from '../controllers/message.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { upload } from '../middlewares/multer.middleware';
import {
    postMessageSchema,
    reactionToMessageSchema,
    sendIndividualMessageSchema,
    updateMessageSchema
} from '../validations/message.validations';

const messageRouter = Router();

// GET APIs
messageRouter.get('/:message_id', authenticateToken, getMessage);
messageRouter.get('/by-room/:room_id', authenticateToken, getAllMessages);

// POST APIs
messageRouter.post('/', authenticateToken, upload.single('file'), validateSchema(postMessageSchema, 'body'), postMessage);
messageRouter.post('/individual', authenticateToken, upload.single('file'), validateSchema(sendIndividualMessageSchema, 'body'), sendIndividualMessage);

// PUT APIs
messageRouter.put('/', authenticateToken, upload.single('file'), validateSchema(updateMessageSchema, 'body'), updateMessage);
messageRouter.put('/mark-read/:room_id', authenticateToken, markMessageRead);
messageRouter.put('/reaction/:message_id', authenticateToken, validateSchema(reactionToMessageSchema, 'body'), reactionToMessage);

// DELETE API
messageRouter.delete('/:message_id', authenticateToken, deleteMessage);
messageRouter.delete('/delete-history/:room_id', authenticateToken, deleteHistory);

export default messageRouter;