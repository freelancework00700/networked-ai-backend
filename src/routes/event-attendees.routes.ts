import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateSchema } from "../middlewares/schema-validator.middleware";
import { createEventAttendee, deleteEventAttendee, updateEventAttendee, getEventAttendeesWithFilters, updateAttendeeCheckIn, refundEventAttendee } from "../controllers/event-attendees.controller";
import { createEventAttendeeSchema, updateEventAttendeeSchema, getEventAttendeesQuerySchema, updateAttendeeCheckInSchema, refundEventAttendeeSchema } from "../validations/event-attendees.validations";


const eventAttendeesRouter = Router();

eventAttendeesRouter.get('/', authenticateToken, validateSchema(getEventAttendeesQuerySchema, 'query'), getEventAttendeesWithFilters);
eventAttendeesRouter.post('/', authenticateToken, validateSchema(createEventAttendeeSchema, 'body'), createEventAttendee);
eventAttendeesRouter.put('/check-in', authenticateToken, validateSchema(updateAttendeeCheckInSchema, 'body'), updateAttendeeCheckIn);
eventAttendeesRouter.put('/:id', authenticateToken, validateSchema(updateEventAttendeeSchema, 'body'), updateEventAttendee);
eventAttendeesRouter.delete('/:id', authenticateToken, deleteEventAttendee);
eventAttendeesRouter.post('/refund', authenticateToken, validateSchema(refundEventAttendeeSchema, 'body'), refundEventAttendee);

export default eventAttendeesRouter;
