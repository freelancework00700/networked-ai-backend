import { Router } from 'express';
import {
    approveRejectRSVPRequest,
    getPendingRSVPRequests,
    getProcessedRSVPRequests,
    sendRSVPRequest
} from '../controllers/rsvp-request.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    approveRejectRSVPSchema,
    getRSVPRequestsSchema
} from '../validations/rsvp-request.validations';

const rsvpRequestRouter = Router();

// RSVP requests
rsvpRequestRouter.get('/:eventId/pending', authenticateToken, validateSchema(getRSVPRequestsSchema, 'query'), getPendingRSVPRequests);
rsvpRequestRouter.get('/:eventId/processed', authenticateToken, validateSchema(getRSVPRequestsSchema, 'query'), getProcessedRSVPRequests);

rsvpRequestRouter.post('/:eventId', authenticateToken, sendRSVPRequest);

rsvpRequestRouter.put('/:eventId/approve-or-reject/:requestId', authenticateToken, validateSchema(approveRejectRSVPSchema, 'body'), approveRejectRSVPRequest);

export default rsvpRequestRouter;

