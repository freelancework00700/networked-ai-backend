import { Router } from 'express';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createEventSchema,
    reportEventSchema,
    saveEventFeedbackSchema,
    createEventViewSchema,
    updateEventSchema,
    getPreviousEventAttendeesSchema,
    upsertEventParticipantRoleSchema,
} from '../validations/event.validations';
import { networkBroadcastSchema } from '../validations/user.validations';
import {
    createEvent,
    updateEvent,
    deleteEvent,
    getAllEvents,
    getRecommendedEvents,
    getUserEvents,
    getLikedEvents,
    getEventByIdOrSlug,
    createEventView,
    toggleEventLike,
    reportEvent,
    saveEventFeedback,
    getPreviousEventAttendees,
    getTopCities,
    getEventAnalytics,
    getTicketAnalytics,
    downloadTicketAnalyticsCSV,
    getEventQuestionsWithAttendees,
    getUserEventQuestionsAndAnswers,
    getQuestionAnalysis,
    getUsersByQuestionOption,
    upsertEventParticipantRole,
    sendNetworkBroadcast,
} from '../controllers/event.controller';
import { updatePaymentIntent, createPaymentIntent } from '../controllers/stripe.controller';
import { updatePaymentIntentSchema, createPaymentIntentSchema } from '../validations/stripe.validations';

const eventRouter = Router();

// Event CRUD operations
eventRouter.post('/', authenticateToken, validateSchema(createEventSchema, 'body'), createEvent);

// Create Payment intent
eventRouter.post('/payment-intent', authenticateToken, validateSchema(createPaymentIntentSchema, 'body'), createPaymentIntent);

// Update payment intent
eventRouter.put('/payment-intent', authenticateToken, validateSchema(updatePaymentIntentSchema, 'body'), updatePaymentIntent);

eventRouter.put('/:id', authenticateToken, validateSchema(updateEventSchema, 'body'), updateEvent);
eventRouter.delete('/:id', authenticateToken, deleteEvent);

// Optional auth: unauthenticated users see only public events, authenticated users see all
eventRouter.get('/', optionalAuthenticateToken, getAllEvents);
eventRouter.get('/recommendations', optionalAuthenticateToken, getRecommendedEvents);
eventRouter.get('/top-cities', optionalAuthenticateToken, getTopCities);

// Get user events (requires authentication, accepts optional user_id query param)
eventRouter.get('/user-events', optionalAuthenticateToken, getUserEvents);

// Get liked events (requires authentication)
eventRouter.get('/liked', authenticateToken, getLikedEvents);

// Event attendees - specific routes before generic routes
eventRouter.get('/attendees/previous', authenticateToken, validateSchema(getPreviousEventAttendeesSchema, 'query'), getPreviousEventAttendees);

// question analysis routes
eventRouter.get('/user-questions-answers', authenticateToken, getUserEventQuestionsAndAnswers);
eventRouter.get('/questions-attendees/:event_id', authenticateToken, getEventQuestionsWithAttendees);
// Get question analysis for single choice, multiple choice, and rating scale questions
eventRouter.get('/question-analysis', authenticateToken, getQuestionAnalysis);
// Get users who selected a specific option for a question
eventRouter.get('/question-option-users', authenticateToken, getUsersByQuestionOption);

// Event participants role management
eventRouter.put('/participants/role/:id', authenticateToken, validateSchema(upsertEventParticipantRoleSchema, 'body'), upsertEventParticipantRole);

eventRouter.get('/:value', optionalAuthenticateToken, getEventByIdOrSlug);

// Event interactions
eventRouter.post('/:id/view', optionalAuthenticateToken, validateSchema(createEventViewSchema, 'body'), createEventView);
eventRouter.post('/:id/like', authenticateToken, toggleEventLike); // Toggle like/unlike
eventRouter.post('/:id/report', authenticateToken, validateSchema(reportEventSchema, 'body'), reportEvent);

// Event feedback
eventRouter.post('/:id/feedback', authenticateToken, validateSchema(saveEventFeedbackSchema, 'body'), saveEventFeedback);

// Event analytics
eventRouter.get('/analytics/:id', authenticateToken, getEventAnalytics);
eventRouter.get('/ticket-analytics-csv/:ticketId', authenticateToken, downloadTicketAnalyticsCSV);
eventRouter.get('/ticket-analytics/:ticketId', authenticateToken, getTicketAnalytics);

// Network broadcast
eventRouter.post('/network-broadcast', authenticateToken, validateSchema(networkBroadcastSchema, 'body'), sendNetworkBroadcast);

export default eventRouter;

