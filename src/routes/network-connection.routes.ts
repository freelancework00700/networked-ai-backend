import { Router } from 'express';
import { cancelRequest, rejectRequest, acceptRequest, removeConnection, createRequest, getAllReceivedRequests, getNetworkConnections, getNetworksWithinRadius, getPeopleYouMightKnow } from '../controllers/network-connection.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { cancelRequestSchema, rejectRequestSchema, acceptRequestSchema, removeConnectionSchema, createRequestSchema, getAllReceivedRequestsSchema, getNetworkConnectionsSchema, networksWithinRadiusSchema, peopleYouMightKnowSchema } from '../validations/network-connection.validations';

const networkConnectionRouter = Router();

// Get
networkConnectionRouter.get('/requests', authenticateToken, validateSchema(getAllReceivedRequestsSchema, 'query'), getAllReceivedRequests);
networkConnectionRouter.get('/connections', authenticateToken, validateSchema(getNetworkConnectionsSchema, 'query'), getNetworkConnections);
networkConnectionRouter.get('/recommendations', authenticateToken, validateSchema(peopleYouMightKnowSchema, 'query'), getPeopleYouMightKnow);
networkConnectionRouter.get('/networks-within-radius', authenticateToken, validateSchema(networksWithinRadiusSchema, 'query'), getNetworksWithinRadius);

// Post
networkConnectionRouter.post('/send', authenticateToken, validateSchema(createRequestSchema, 'body'), createRequest);

// Put
networkConnectionRouter.put('/cancel', authenticateToken, validateSchema(cancelRequestSchema, 'body'), cancelRequest);
networkConnectionRouter.put('/reject', authenticateToken, validateSchema(rejectRequestSchema, 'body'), rejectRequest);
networkConnectionRouter.put('/accept', authenticateToken, validateSchema(acceptRequestSchema, 'body'), acceptRequest);
networkConnectionRouter.put('/remove', authenticateToken, validateSchema(removeConnectionSchema, 'body'), removeConnection);

export default networkConnectionRouter;

