import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getAllEmailsSchema, sendEmailSchema } from '../validations/email.validations';
import { deleteEmail, getAllEmails, getEmailById, sendEmail } from '../controllers/email.controller';

const router = Router();

router.post('/', authenticateToken, validateSchema(sendEmailSchema, 'body'), sendEmail);
router.get('/', authenticateToken, validateSchema(getAllEmailsSchema, 'query'), getAllEmails);
router.get('/:id', authenticateToken, getEmailById);
router.delete('/:id', authenticateToken, deleteEmail);

export default router;
