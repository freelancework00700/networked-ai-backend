import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getUserTransactionsPaginatedSchema } from '../validations/transaction.validations';
import { getCurrentUserTransactions, getCurrentUserTransactionById } from '../controllers/transaction.controller';

const router = Router();

// Get all transactions of current user with pagination
router.get('/', authenticateToken, validateSchema(getUserTransactionsPaginatedSchema, 'query'), getCurrentUserTransactions);

// Get a single transaction of current user by ID
router.get('/:id', authenticateToken, getCurrentUserTransactionById);

export default router;


