import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getAllSmsSchema, sendSmsSchema } from '../validations/sms.validations';
import { deleteSms, getAllSms, getSmsById, sendSms } from '../controllers/sms.controller';

const router = Router();

router.post('/', authenticateToken, validateSchema(sendSmsSchema, 'body'), sendSms);
router.get('/', authenticateToken, validateSchema(getAllSmsSchema, 'query'), getAllSms);
router.get('/:id', authenticateToken, getSmsById);
router.delete('/:id', authenticateToken, deleteSms);

export default router;
