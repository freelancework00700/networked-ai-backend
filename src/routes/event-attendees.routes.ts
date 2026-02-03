import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateSchema } from "../middlewares/schema-validator.middleware";
import { createEventAttendeeSchema, updateEventAttendeeSchema, getEventAttendeesQuerySchema, updateAttendeeCheckInSchema } from "../validations/event-attendees.validations";
import { createEventAttendee, deleteEventAttendee, updateEventAttendee, getEventAttendeesWithFilters, updateAttendeeCheckIn } from "../controllers/event-attendees.controller";


const eventAttendeesRouter = Router();

eventAttendeesRouter.get('/', authenticateToken, validateSchema(getEventAttendeesQuerySchema, 'query'), getEventAttendeesWithFilters);
eventAttendeesRouter.post('/', authenticateToken, validateSchema(createEventAttendeeSchema, 'body'), createEventAttendee);
eventAttendeesRouter.put('/check-in', authenticateToken, validateSchema(updateAttendeeCheckInSchema, 'body'), updateAttendeeCheckIn);
eventAttendeesRouter.put('/:id', authenticateToken, validateSchema(updateEventAttendeeSchema, 'body'), updateEventAttendee);
eventAttendeesRouter.delete('/:id', authenticateToken, deleteEventAttendee);

export default eventAttendeesRouter;
