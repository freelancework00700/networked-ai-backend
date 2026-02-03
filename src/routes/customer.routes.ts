import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createCustomerSchema, updateCustomerSchema, getAllCustomersSchema } from '../validations/customer.validations';
import { getAllCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customer.controller';

const router = Router();

router.get('/', authenticateToken, validateSchema(getAllCustomersSchema, 'query'), getAllCustomers);
router.get('/:id', authenticateToken, getCustomerById);

router.post('/', authenticateToken, validateSchema(createCustomerSchema, 'body'), createCustomer);

router.put('/:id', authenticateToken, validateSchema(updateCustomerSchema, 'body'), updateCustomer);

router.delete('/:id', authenticateToken, deleteCustomer);

export default router;
