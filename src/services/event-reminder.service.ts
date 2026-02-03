import moment from 'moment';
import smsService from './sms.service';
import emailService from './email.service';
import { Transaction, Op } from 'sequelize';
import loggerService from '../utils/logger.service';
import { EmailType, SmsType, NotificationType, ReminderType, EventPhase } from '../types/enums';
import { Event, EventReminder, EventParticipant, EventAttendee, User, Email, Notification, EventQuestion } from '../models';

interface ReminderTime {
    label: string;
    type: ReminderType;
    milliseconds: number;
}

const REMINDER_TIMES: ReminderTime[] = [
    { type: ReminderType.TWO_HOURS, milliseconds: 2 * 60 * 60 * 1000, label: '2 hours' },
    { type: ReminderType.ONE_WEEK, milliseconds: 7 * 24 * 60 * 60 * 1000, label: '1 week' },
    { type: ReminderType.TWO_WEEKS, milliseconds: 14 * 24 * 60 * 60 * 1000, label: '2 weeks' },
    { type: ReminderType.TWENTY_FOUR_HOURS, milliseconds: 24 * 60 * 60 * 1000, label: '24 hours' }
];

/**
 * Get users for an event by participant and/or attendee source.
 * @param eventId - Event ID
 * @param transaction - Optional transaction
 * @param source - 'participants' | 'attendees' | 'both' (default: 'both')
 */
const getEventRecipients = async (
    eventId: string,
    transaction?: Transaction,
    source: 'participants' | 'attendees' | 'both' = 'both'
): Promise<User[]> => {
    const userIds = new Set<string>();

    // Get all participants
    if (source === 'participants' || source === 'both') {
        const participants = await EventParticipant.findAll({
            where: {
                event_id: eventId,
                is_deleted: false
            },
            attributes: ['user_id'],
            transaction
        });

        participants.forEach(p => userIds.add(p.user_id));
    }

    // Get all attendees
    if (source === 'attendees' || source === 'both') {
        const attendees = await EventAttendee.findAll({
            where: {
                event_id: eventId,
                is_deleted: false
            },
            attributes: ['user_id'],
            transaction
        });

        attendees.forEach(a => userIds.add(a.user_id));
    }

    if (userIds.size === 0) return [];
    
    // Fetch all users
    const users = await User.findAll({
        where: {
            id: Array.from(userIds),
            is_deleted: false
        },
        attributes: ['id', 'name', 'email', 'mobile', 'username'],
        transaction
    });

    return users;
};

// Format event date and time for display
const formatEventDateTime = (startDate: Date, endDate: Date): string => {
    const start = moment(startDate).format('MMM D, YYYY h:mm A');
    const end = moment(endDate).format('h:mm A');
    return `${start} - ${end}`;
};

// Send reminder email to a user
const sendReminderEmail = async (
    event: Event,
    user: User,
    reminderType: ReminderType,
    transaction?: Transaction
): Promise<void> => {
    try {
        if (!user.email) {
            loggerService.info(`Skipping reminder email for user ${user.id}: no email address`);
            return;
        }

        let subject = '';

        switch (reminderType) {
            case ReminderType.TWO_WEEKS:
                subject = `Reminder: ${event.title} is in 2 weeks!`;
                break;
            case ReminderType.ONE_WEEK:
                subject = `Reminder: ${event.title} is in 1 week!`;
                break;
            case ReminderType.TWENTY_FOUR_HOURS:
                subject = `Reminder: ${event.title} is tomorrow!`;
                break;
            case ReminderType.TWO_HOURS:
                subject = `Reminder: ${event.title} is in 2 hours!`;
                break;
        }

        // Ensure event has host information loaded for generateEventEmail
        if (!(event as any).created_by_user) {
            await event.reload({
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email', 'mobile', 'username'],
                }],
                transaction,
            });
        }

        const html = await emailService.generateEventEmail(event, false, false);

        // Get host name for the "from" field
        const hostName = (event as any)?.created_by_user?.name || 'Networked AI';
        const safeHostName = String(hostName).replace(/"/g, '');

        await Email.create({
            html,
            subject,
            bcc: [user.email],
            type: EmailType.EVENT_REMINDER,
            from: `"${safeHostName}" <do-not-reply@net-worked.ai>`,
            created_by: null
        }, { transaction });

        loggerService.info(`Reminder email sent to ${user.email} for event ${event.id}, reminder type: ${reminderType}`);
    } catch (error: any) {
        loggerService.error(`Error sending reminder email to ${user.email}: ${error.message || error}`);
    }
};

// Send reminder SMS to a user
const sendReminderSms = async (
    event: Event,
    user: User,
    reminderType: ReminderType,
    transaction?: Transaction
): Promise<void> => {
    try {
        if (!user.mobile) {
            loggerService.info(`Skipping reminder SMS for user ${user.id}: no mobile number`);
            return;
        }

        // Generate reminder message using SMS service
        const message = smsService.generateEventReminderMessage(event, reminderType);

        await smsService.createSms({
            message,
            to: [user.mobile],
            type: SmsType.EVENT_REMINDER,
        }, transaction);

        loggerService.info(`Reminder SMS sent to ${user.mobile} for event ${event.id}, reminder type: ${reminderType}`);
    } catch (error: any) {
        loggerService.error(`Error sending reminder SMS to ${user.mobile}: ${error.message || error}`);
    }
};

// Send reminder notification to a user
const sendReminderNotification = async (
    event: Event,
    user: User,
    reminderType: ReminderType,
    transaction?: Transaction
): Promise<void> => {
    try {
        let body = '';
        let title = '';

        switch (reminderType) {
            case ReminderType.TWO_WEEKS:
                title = 'Event Reminder';
                body = `${event.title} is coming up in 2 weeks!`;
                break;
            case ReminderType.ONE_WEEK:
                title = 'Event Reminder';
                body = `${event.title} is coming up in 1 week!`;
                break;
            case ReminderType.TWENTY_FOUR_HOURS:
                title = 'Event Reminder';
                body = `${event.title} is tomorrow!`;
                break;
            case ReminderType.TWO_HOURS:
                title = 'Event Reminder';
                body = `${event.title} is in 2 hours!`;
                break;
        }

        await Notification.create({
            body,
            title,
            user_id: user.id,
            event_id: event.id,
            type: NotificationType.EVENT_REMINDER
        }, { transaction });

        loggerService.info(`Reminder notification sent to user ${user.id} for event ${event.id}, reminder type: ${reminderType}`);
    } catch (error: any) {
        loggerService.error(`Error sending reminder notification to user ${user.id}: ${error.message || error}`);
    }
};

// Send post-event questionnaire email to a user
const sendPostEventEmail = async (event: Event, user: User, transaction?: Transaction): Promise<void> => {
    try {
        if (!user.email) {
            loggerService.info(`Skipping post-event email for user ${user.id}: no email address`);
            return;
        }

        // Ensure event has host information loaded
        if (!(event as any).created_by_user) {
            await event.reload({
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email', 'mobile', 'username'],
                }],
                transaction,
            });
        }

        // Generate email HTML with post-event button
        const html = await emailService.generateEventEmail(event, false, true);

        // Get host name for the "from" field
        const hostName = (event as any)?.created_by_user?.name || 'Networked AI';
        const safeHostName = String(hostName).replace(/"/g, '');

        await Email.create({
            html,
            bcc: [user.email],
            type: EmailType.POST_EVENT_QUESTIONNAIRE,
            subject: `Post Event Questionnaire: ${event.title}`,
            from: `"${safeHostName}" <do-not-reply@net-worked.ai>`,
        }, { transaction });

        loggerService.info(`Post-event email sent to ${user.email} for event ${event.id}`);
    } catch (error: any) {
        loggerService.error(`Error sending post-event email to ${user.email}: ${error.message || error}`);
    }
};

// Send post-event questionnaire notification to a user
const sendPostEventNotification = async (event: Event, user: User, transaction?: Transaction): Promise<void> => {
    try {
        await Notification.create({
            user_id: user.id,
            event_id: event.id,
            title: 'Post Event Questionnaire',
            type: NotificationType.POST_EVENT_QUESTIONNAIRE,
            body: `We'd love to hear your thoughts about "${event.title}"!`,
        }, { transaction });

        loggerService.info(`Post-event notification sent to user ${user.id} for event ${event.id}`);
    } catch (error: any) {
        loggerService.error(`Error sending post-event notification to user ${user.id}: ${error.message || error}`);
    }
};

// Send reminders for a specific event and reminder type
export const sendEventReminders = async (
    event: Event,
    reminderType: ReminderType,
    transaction?: Transaction
): Promise<void> => {
    try {
        // Handle post-event reminders differently
        if (reminderType === ReminderType.POST_EVENT) {
            const recipients = await getEventRecipients(event.id, transaction, 'attendees');

            if (recipients.length === 0) {
                loggerService.info(`No recipients found for post-event reminders for event ${event.id}`);
                return;
            }

            loggerService.info(`Sending post-event reminders for event ${event.id} to ${recipients.length} recipients`);

            // Send post-event reminders to all recipients in parallel
            const reminderPromises = recipients.map(async (user) => {
                await Promise.all([
                    sendPostEventEmail(event, user, transaction),
                    sendPostEventNotification(event, user, transaction)
                ]);
            });

            await Promise.all(reminderPromises);

            loggerService.info(`Completed sending post-event reminders for event ${event.id}`);
            return;
        }

        // Regular reminder handling
        const recipients = await getEventRecipients(event.id, transaction);

        if (recipients.length === 0) {
            loggerService.info(`No recipients found for event ${event.id}`);
            return;
        }

        loggerService.info(`Sending ${reminderType} reminders for event ${event.id} to ${recipients.length} recipients`);

        // Send reminders to all recipients in parallel
        const reminderPromises = recipients.map(async (user) => {
            await Promise.all([
                sendReminderSms(event, user, reminderType, transaction),
                sendReminderEmail(event, user, reminderType, transaction),
                sendReminderNotification(event, user, reminderType, transaction)
            ]);
        });

        await Promise.all(reminderPromises);

        loggerService.info(`Completed sending ${reminderType} reminders for event ${event.id}`);
    } catch (error: any) {
        loggerService.error(`Error sending reminders for event ${event.id}: ${error.message || error}`);
        throw error;
    }
};

// Create reminders for an event
export const createEventReminders = async (event: Event, transaction?: Transaction): Promise<void> => {
    try {
        const startDate = new Date(event.start_date);
        const now = new Date();

        // Only create reminders if event is in the future
        if (startDate <= now) {
            loggerService.info(`Event ${event.id} has already started or passed, skipping reminder creation`);
            return;
        }

        const reminders: Array<{ event_id: string; reminder_type: ReminderType; reminder_time: Date }> = [];

        // Create reminders for each reminder type
        for (const reminderTime of REMINDER_TIMES) {
            const reminderDate = new Date(startDate.getTime() - reminderTime.milliseconds);

            // Only create reminder if it's in the future
            if (reminderDate > now) {
                reminders.push({
                    event_id: event.id,
                    reminder_type: reminderTime.type,
                    reminder_time: reminderDate
                });
            }
        }

        if (reminders.length > 0) {
            await EventReminder.bulkCreate(reminders, { transaction });
            loggerService.info(`Created ${reminders.length} reminders for event ${event.id}`);
        }
    } catch (error: any) {
        loggerService.error(`Error creating reminders for event ${event.id}: ${error.message || error}`);
        throw error;
    }
};

// Delete all reminders for an event
export const deleteEventReminders = async (eventId: string, transaction?: Transaction): Promise<void> => {
    try {
        await EventReminder.destroy({
            where: {
                event_id: eventId
            },
            transaction
        });
        loggerService.info(`Deleted all reminders for event ${eventId}`);
    } catch (error: any) {
        loggerService.error(`Error deleting reminders for event ${eventId}: ${error.message || error}`);
        throw error;
    }
};

// Check if event has post-event questionnaire
const hasPostEventQuestionnaire = async (eventId: string, transaction?: Transaction): Promise<boolean> => {
    try {
        const postEventQuestions = await EventQuestion.count({
            where: {
                event_id: eventId,
                event_phase: EventPhase.POST_EVENT,
                is_deleted: false,
            },
            transaction,
        });

        return postEventQuestions > 0;
    } catch (error: any) {
        loggerService.error(`Error checking post-event questionnaire for event ${eventId}: ${error.message}`);
        return false;
    }
};

// Create post-event reminder for an event (if it has post-event questionnaire)
export const createPostEventReminder = async (event: Event, transaction?: Transaction): Promise<void> => {
    try {
        // Check if event has post-event questionnaire
        const hasQuestionnaire = await hasPostEventQuestionnaire(event.id, transaction);

        if (!hasQuestionnaire) {
            loggerService.info(`Event ${event.id} does not have post-event questionnaire, skipping post-event reminder creation`);
            return;
        }

        // Delete any existing post-event reminders for this event
        await EventReminder.destroy({
            where: {
                event_id: event.id,
                reminder_type: ReminderType.POST_EVENT
            },
            transaction
        });

        // Create post-event reminder with reminder_time set to event end_date
        await EventReminder.create({
            event_id: event.id,
            reminder_type: ReminderType.POST_EVENT,
            reminder_time: new Date(event.end_date),
            is_sent: false
        }, { transaction });

        loggerService.info(`Created post-event reminder for event ${event.id} (reminder_time: ${event.end_date})`);
    } catch (error: any) {
        loggerService.error(`Error creating post-event reminder for event ${event.id}: ${error.message || error}`);
        throw error;
    }
};

// Check and send reminders for upcoming events
export const checkAndSendReminders = async (transaction?: Transaction): Promise<void> => {
    try {
        const now = new Date();
        const timeWindowEnd = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

        // Find reminders that should be sent now (within the next 5 minutes)
        const remindersToSend = await EventReminder.findAll({
            where: {
                reminder_time: {
                    [Op.between]: [now, timeWindowEnd]
                },
                is_sent: false
            },
            include: [
                {
                    model: Event,
                    as: 'event',
                    required: true,
                    where: {
                        is_deleted: false
                    }
                }
            ],
            transaction
        });

        if (remindersToSend.length === 0) {
            loggerService.info('No reminders to send at this time');
            return;
        }

        loggerService.info(`Found ${remindersToSend.length} reminders to send`);

        // Send reminders
        for (const reminder of remindersToSend) {
            try {
                const event = (reminder as any).event;
                if (!event) {
                    loggerService.warn(`Event not found for reminder ${reminder.id}`);
                    continue;
                }

                await sendEventReminders(event, reminder.reminder_type, transaction);

                // Mark reminder as sent
                await reminder.update(
                    {
                        is_sent: true,
                        sent_at: new Date()
                    },
                    { transaction }
                );

                loggerService.info(`Sent reminder ${reminder.reminder_type} for event ${event.id}`);
            } catch (error: any) {
                loggerService.error(`Error processing reminder ${reminder.id}: ${error.message || error}`);
            }
        }

        loggerService.info(`Reminder check completed. Processed ${remindersToSend.length} reminders`);
    } catch (error: any) {
        loggerService.error(`Error checking reminders: ${error.message || error}`);
        throw error;
    }
};

export default {
    ReminderType,
    sendEventReminders,
    createEventReminders,
    deleteEventReminders,
    checkAndSendReminders,
    createPostEventReminder,
};