import env from '../utils/validate-env';
import { Op, Transaction } from 'sequelize';
import customerService from './customer.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { SmsType, ReminderType, FeatureKey, StatusCode, SubscriptionStatus } from '../types/enums';
import { CreateSmsParams, GetAllSmsOptions, SendSmsByTagsAndSegmentsParams } from '../types/sms.interface';
import { Event, Sms, User, EventParticipant, EventAttendee, Feed, PlatformUserSubscription, PlatformUserFeatureUsage } from "../models";

const smsAttributes = ['id', 'type', 'title', 'message', 'from', 'to', 'created_at', 'updated_at', 'created_by', 'updated_by'];

/**
 * Check if user has SMS limit available in their subscription
 * @param userId - User ID to check
 * @param smsCount - Number of SMS messages to be sent
 * @param transaction - Optional database transaction
 * @returns True if user has sufficient SMS limit, throws error if not
 */
const checkSmsLimit = async (userId: string, smsCount: number = 1, transaction?: Transaction): Promise<boolean> => {
    try {
        // Get ALL user's active subscriptions with SMS feature usage
        const subscriptions = await PlatformUserSubscription.findAll({
            where: {
                user_id: userId,
                status: SubscriptionStatus.ACTIVE,
            },
            include: [
                {
                    required: true,
                    as: 'feature_usage',
                    model: PlatformUserFeatureUsage,
                    where: {
                        feature_key: FeatureKey.SMS,
                    },
                },
            ],
            transaction,
        });

        if (!subscriptions || subscriptions.length === 0) {
            throw new Error('No active subscription found or SMS feature not available');
        }

        // Calculate total limit and current usage across all subscriptions
        let totalLimit = 0;
        let totalUsed = 0;

        for (const subscription of subscriptions) {
            const smsUsage = (subscription as any).feature_usage?.[0];
            if (smsUsage) {
                totalLimit += smsUsage.limit_value || 0;
                totalUsed += smsUsage.used_value || 0;
            }
        }

        // Check if adding new SMS messages would exceed the total limit
        if (totalUsed + smsCount > totalLimit) {
            const error = new Error(responseMessages.sms.limitExceeded);
            (error as any).statusCode = StatusCode.SMS_LIMIT_EXCEEDED;
            throw error;
        }

        loggerService.info(`SMS limit check passed for user ${userId}: ${totalUsed}/${totalLimit} (+${smsCount})`);
        return true;
    } catch (error: any) {
        loggerService.error(`Error checking SMS limit for user ${userId}: ${error.message}`);
        throw error;
    }
};

/**
 * Update SMS usage count after successful SMS creation
 * Distributes usage across subscriptions proportionally or fills up available capacity
 * @param userId - User ID
 * @param smsCount - Number of SMS messages sent
 * @param transaction - Optional database transaction
 */
const updateSmsUsage = async (userId: string, smsCount: number = 1, transaction?: Transaction): Promise<void> => {
    try {
        // Get ALL user's active subscriptions with SMS feature usage
        const subscriptions = await PlatformUserSubscription.findAll({
            where: {
                user_id: userId,
                status: SubscriptionStatus.ACTIVE,
            },
            include: [
                {
                    required: true,
                    as: 'feature_usage',
                    model: PlatformUserFeatureUsage,
                    where: {
                        feature_key: FeatureKey.SMS,
                    },
                },
            ],
            transaction,
        });

        if (!subscriptions || subscriptions.length === 0) {
            loggerService.warn(`No active subscriptions found for user ${userId}`);
            return;
        }

        let remainingSmsCount = smsCount;

        // Distribute SMS usage across subscriptions
        for (const subscription of subscriptions) {
            if (remainingSmsCount <= 0) break;

            const smsUsage = (subscription as any).feature_usage?.[0];
            if (!smsUsage) continue;

            const currentUsage = smsUsage.used_value || 0;
            const limitValue = smsUsage.limit_value || 0;
            const availableCapacity = limitValue - currentUsage;

            if (availableCapacity > 0) {
                const smsToAdd = Math.min(remainingSmsCount, availableCapacity);
                
                await smsUsage.update({
                    used_value: currentUsage + smsToAdd,
                }, { transaction });

                remainingSmsCount -= smsToAdd;
                loggerService.info(`Updated SMS usage for subscription ${subscription.id}: +${smsToAdd} (new total: ${currentUsage + smsToAdd}/${limitValue})`);
            }
        }

        if (remainingSmsCount > 0) {
            loggerService.warn(`Could not update all SMS usage. Remaining: ${remainingSmsCount}. This shouldn't happen if limit check passed.`);
        }

        loggerService.info(`Successfully updated SMS usage for user ${userId}: +${smsCount - remainingSmsCount} messages`);
    } catch (error: any) {
        loggerService.error(`Error updating SMS usage for user ${userId}: ${error.message}`);
        throw error; // Throw error so it can be handled appropriately
    }
};

/**
 * Create SMS record in database
 * @param params - SMS parameters
 * @param transaction - Optional database transaction
 * @returns Created SMS record
 */
const createSms = async (params: CreateSmsParams, transaction?: Transaction): Promise<Sms> => {
    try {
        // Check SMS limit if user is specified
        if (params.created_by) {
            const smsCount = Array.isArray(params.to) ? params.to.length : 1;
            await checkSmsLimit(params.created_by, smsCount, transaction);
        }

        const smsRecord = await Sms.create(
            {
                to: params.to,
                type: params.type,
                message: params.message,
                title: params.title || null,
                from: env.TWILIO_PHONE_NUMBER,
                created_by: params.created_by || null,
            },
            { transaction }
        );

        // Update SMS usage if user is specified
        if (params.created_by) {
            const smsCount = Array.isArray(params.to) ? params.to.length : 1;
            await updateSmsUsage(params.created_by, smsCount, transaction);
        }

        return smsRecord;
    } catch (error: any) {
        loggerService.error(`Error creating SMS record: ${error.message}`);
        throw error;
    }
};

const sendRsvpConfirmationSmsToGuest = async (event: Event, guestMobile: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!guestMobile || guestMobile.trim().length === 0) {
            loggerService.info(`Skipping RSVP confirmation SMS (guest): no guest mobile. Event ID=${event.id}`);
            return null;
        }

        const baseMessage = `RSVP Confirmation for '${event.title}'.\n`;
        const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
        const eventLinkMessage = event.slug ? `${env.FRONT_URL}/event/${event.slug}\n` : '';

        return await createSms(
            {
                to: [guestMobile],
                type: SmsType.RSVP_CONFIRMATION_GUEST,
                message: baseMessage + additionalLines + eventLinkMessage,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating RSVP confirmation SMS record (guest): ${error.message || error}`);
        return null;
    }
};

const sendRsvpConfirmationSmsToHost = async (event: Event, hostMobile: string, guestName: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!hostMobile || hostMobile.trim().length === 0) {
            loggerService.info(`Skipping RSVP confirmation SMS (host): no host mobile. Event ID=${event.id}`);
            return null;
        }

        const baseMessage = `${guestName || 'Someone'} RSVP'd to '${event.title}'.\n`;
        const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
        const eventLinkMessage = event.slug ? `${env.FRONT_URL}/event/${event.slug}\n` : '';

        return await createSms(
            {
                to: [hostMobile],
                type: SmsType.RSVP_CONFIRMATION_HOST,
                message: baseMessage + additionalLines + eventLinkMessage,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating RSVP confirmation SMS record (host): ${error.message || error}`);
        return null;
    }
};

const sendRsvpRequestSmsToHost = async (event: Event, hostMobile: string, requesterName: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!hostMobile || hostMobile.trim().length === 0) {
            loggerService.info(`Skipping RSVP request SMS: no host mobile. Event ID=${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: [hostMobile],
                type: SmsType.RSVP_REQUEST,
                message: generateRsvpRequestMessageForHost(event, requesterName),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating RSVP request SMS record: ${error.message || error}`);
        return null;
    }
};

const sendRsvpRequestApprovedSmsToRequester = async (event: Event, requesterMobile: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!requesterMobile || requesterMobile.trim().length === 0) {
            loggerService.info(`Skipping RSVP approved SMS: no requester mobile. Event ID=${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: [requesterMobile],
                type: SmsType.RSVP_REQUEST_APPROVED,
                message: generateRsvpDecisionMessageForRequester(event, true),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating RSVP approved SMS record: ${error.message || error}`);
        return null;
    }
};

const sendRsvpRequestRejectedSmsToRequester = async (event: Event, requesterMobile: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!requesterMobile || requesterMobile.trim().length === 0) {
            loggerService.info(`Skipping RSVP rejected SMS: no requester mobile. Event ID=${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: [requesterMobile],
                type: SmsType.RSVP_REQUEST_REJECTED,
                message: generateRsvpDecisionMessageForRequester(event, false),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating RSVP rejected SMS record: ${error.message || error}`);
        return null;
    }
};

const sendEventRoleRemovalSms = async (event: Event, recipientMobile: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!recipientMobile || recipientMobile.trim().length === 0) {
            loggerService.info(`Skipping event role removal SMS: no recipient mobile. Event ID=${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: [recipientMobile],
                type: SmsType.EVENT_ROLE_REMOVAL,
                message: generateEventRoleRemovalMessage(event),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating event role removal SMS record: ${error.message || error}`);
        return null;
    }
};

const sendEventRoleAssignmentSms = async (event: Event, recipientMobile: string, role: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!recipientMobile || recipientMobile.trim().length === 0) {
            loggerService.info(`Skipping event role assignment SMS: no recipient mobile. Event ID=${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: [recipientMobile],
                type: SmsType.EVENT_ROLE_ASSIGNMENT,
                message: generateEventRoleAssignmentMessage(event, role),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating event role assignment SMS record: ${error.message || error}`);
        return null;
    }
};

/**
 * Get all mobile numbers for event participants (host, participants, attendees)
 * Similar to getEventParticipantEmails in email.service.ts
 * @param eventId - Event ID
 * @param transaction - Optional database transaction
 * @returns Array of mobile numbers
 */
const getEventParticipantMobiles = async (eventId: string, transaction?: Transaction): Promise<string[]> => {
    try {
        const mobiles: string[] = [];

        // Get all participants (co-host, sponsor, speaker, staff, host)
        const participants = await EventParticipant.findAll({
            where: {
                event_id: eventId,
                is_deleted: false,
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    required: true,
                    where: { is_deleted: false },
                    attributes: ['mobile'],
                },
            ],
            transaction,
        });

        for (const participant of participants) {
            const user = (participant as any).user;
            if (user?.mobile) {
                mobiles.push(user.mobile);
            }
        }

        // Get all attendees
        const attendees = await EventAttendee.findAll({
            where: {
                event_id: eventId,
                is_deleted: false,
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    required: true,
                    where: { is_deleted: false },
                    attributes: ['mobile'],
                },
            ],
            transaction,
        });

        for (const attendee of attendees) {
            const user = (attendee as any).user;
            if (user?.mobile) {
                mobiles.push(user.mobile);
            }
        }

        // Remove duplicates and filter out empty mobiles
        return [...new Set(mobiles.filter(mobile => mobile && mobile.trim() !== ''))];
    } catch (error: any) {
        loggerService.error(`Error getting event participant mobiles: ${error.message}`);
        return [];
    }
};

const generateEventMessage = (event: Event, isDeletion = false, isUpdate = false, changedFields?: string[]): string => {
    const { title, address, start_date, slug } = event;

    // Convert timestamp to human-readable format
    const eventDate = new Date(start_date).toLocaleString("en-US", {
        hour12: true,
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: "America/New_York",
    });

    const addressLine = address ? `Address: ${address}.\n` : '';

    // Base message differs for event creation, deletion, and update
    let baseMessage: string;
    if (isDeletion) {
        baseMessage = `Your event '${title}' has been deleted.\n`;
    } else if (isUpdate) {
        const changesText = changedFields && changedFields.length > 0 ? ` The following details have been updated: ${changedFields.join(', ')}.\n` : '.\n';
        baseMessage = `The event '${title}' has been updated${changesText}`;
    } else {
        baseMessage = `Your event '${title}' has been successfully created for ${eventDate} at ${addressLine}.`;
    }

    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;

    // Add the event link if the event is not being deleted
    const eventLinkMessage = !isDeletion && slug ? `${env.FRONT_URL}/event/${slug}\n` : "";

    return baseMessage + additionalLines + eventLinkMessage;
};

const generateEventRoleAssignmentMessage = (event: Event, role: string): string => {
    const { title, slug } = event;
    const baseMessage = `You've been assigned as ${role} for '${title}'.\n`;
    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
    const eventLinkMessage = slug ? `${env.FRONT_URL}/event/${slug}\n` : "";
    return baseMessage + additionalLines + eventLinkMessage;
};

const generateEventRoleRemovalMessage = (event: Event): string => {
    const { title, slug } = event;
    const baseMessage = `You've been removed from '${title}'.\n`;
    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
    const eventLinkMessage = slug ? `${env.FRONT_URL}/event/${slug}\n` : "";
    return baseMessage + additionalLines + eventLinkMessage;
};

const generateRsvpRequestMessageForHost = (event: Event, requesterName: string): string => {
    const { title, slug } = event;
    const baseMessage = `${requesterName} requested to RSVP for '${title}'.\n`;
    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
    const eventLinkMessage = slug ? `${env.FRONT_URL}/event/${slug}\n` : "";
    return baseMessage + additionalLines + eventLinkMessage;
};

const generateRsvpDecisionMessageForRequester = (event: Event, isApproved: boolean): string => {
    const { title, slug } = event;
    const decisionText = isApproved ? 'approved' : 'rejected';
    const baseMessage = `Your RSVP request for '${title}' was ${decisionText}.\n`;
    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
    const eventLinkMessage = slug ? `${env.FRONT_URL}/event/${slug}\n` : "";
    return baseMessage + additionalLines + eventLinkMessage;
};

const generateEventReminderMessage = (event: Event, reminderType: ReminderType): string => {
    const { title, address, start_date, end_date, slug } = event;

    // Convert timestamp to human-readable format
    const eventDate = new Date(start_date).toLocaleString("en-US", {
        hour12: true,
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: "America/New_York",
    });

    const endTime = new Date(end_date).toLocaleString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        timeZone: "America/New_York",
    });

    const dateTimeText = `${eventDate} - ${endTime}`;
    const addressLine = address ? `Location: ${address}\n` : 'Location: TBD\n';
    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
    const eventLinkMessage = slug ? `${env.FRONT_URL}/event/${slug}\n` : "";

    // Base message differs for each reminder type
    let baseMessage: string;
    switch (reminderType) {
        case ReminderType.TWO_WEEKS:
            baseMessage = `2 WEEKS!\n${title} is coming up in 2 weeks!\n\nDate & Time: ${dateTimeText}\n${addressLine}`;
            break;
        case ReminderType.ONE_WEEK:
            baseMessage = `1 WEEK!\n${title} is coming up next week!\n\nDate & Time: ${dateTimeText}\n${addressLine}`;
            break;
        case ReminderType.TWENTY_FOUR_HOURS:
            baseMessage = `1 DAY!\n${title} is tomorrow!\n\nDate & Time: ${dateTimeText}\n${addressLine}`;
            break;
        case ReminderType.TWO_HOURS:
            baseMessage = `2 HOURS!\n${title} is in two hours!\n\nDate & Time: ${dateTimeText}\n${addressLine}`;
            break;
        default:
            baseMessage = `REMINDER\nReminder for ${title}\n\nDate & Time: ${dateTimeText}\n${addressLine}`;
            break;
    }

    return baseMessage + additionalLines + eventLinkMessage;
};

/**
 * Create an SMS record for "event created" and let `Sms.afterCreate` handle sending.
 * Mirrors the email hook flow used in `Event.afterCreate`.
 */
const sendEventCreationSms = async (event: Event, transaction?: Transaction): Promise<Sms | null> => {
    try {
        const creatorMobile = (event as any)?.created_by_user?.mobile ?? null;

        if (!creatorMobile) {
            loggerService.info(`Skipping event creation SMS: no creator mobile. Event ID=${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: [creatorMobile],
                type: SmsType.EVENT_CREATION,
                message: generateEventMessage(event),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating event creation SMS record: ${error.message || error}`);
        return null;
    }
};

const sendEventDeletionSms = async (event: Event, transaction?: Transaction): Promise<Sms | null> => {
    try {
        // Get all recipient mobile numbers (host, participants, attendees)
        const recipientMobiles = await getEventParticipantMobiles(event.id, transaction);

        if (recipientMobiles.length === 0) {
            loggerService.warn(`No recipients found for event deletion SMS: ${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: recipientMobiles,
                type: SmsType.EVENT_DELETION,
                message: generateEventMessage(event, true),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating event deletion SMS record: ${error.message || error}`);
        return null;
    }
};

const sendEventUpdatedSms = async (event: Event, changedFields?: string[], transaction?: Transaction): Promise<Sms | null> => {
    try {
        // Get all recipient mobile numbers (host, participants, attendees)
        const recipientMobiles = await getEventParticipantMobiles(event.id, transaction);

        if (recipientMobiles.length === 0) {
            loggerService.warn(`No recipients found for event update SMS: ${event.id}`);
            return null;
        }

        return await createSms(
            {
                to: recipientMobiles,
                type: SmsType.EVENT_UPDATE,
                message: generateEventMessage(event, false, true, changedFields),
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error creating event update SMS record: ${error.message || error}`);
        return null;
    }
};

/** Generate invite SMS text for event */
export const getInviteSmsText = (event: Event, userData?: User): string => {
    const dateTimeOptions: Intl.DateTimeFormatOptions = {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    };

    const dateTimeOptionsEnd: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZoneName: "short",
    };

    const invitePrefix = userData
        ? `You're Invited by ${userData.name || userData.username} to the event: ${event.title}`
        : `You're Invited: ${event.title}`;

    const eventLink = `${env.FRONT_URL}/event/${event.slug}`;
    const hostName = (event as any)?.created_by_user?.name || 'Host';

    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    const formattedStart = new Intl.DateTimeFormat("en-US", dateTimeOptions).format(startDate);
    const formattedEnd = new Intl.DateTimeFormat("en-US", dateTimeOptionsEnd).format(endDate);

    return `${invitePrefix}\n\nHosted by ${hostName}. ${formattedStart} - ${formattedEnd} at ${event.address || 'TBD'}\n\nGet out. Get Networked.\n\nPowered by net-worked.ai\n\n${eventLink}`;
};

export const sendNetworkBroadcastSms = async (
    event: Event,
    recipientUserIds: string[],
    senderId: string,
    transaction?: Transaction
): Promise<Sms | null> => {
    try {
        if (!recipientUserIds || recipientUserIds.length === 0) return null;

        // Get recipient phone numbers
        const recipients = await User.findAll({
            where: {
                id: recipientUserIds,
                is_deleted: false
            },
            attributes: ['mobile'],
            transaction
        });

        const recipientPhones = recipients
            .map((user: any) => user.mobile)
            .filter((phone: string) => phone && phone.trim() !== '')
            .map((phone: string) => {
                // Format phone number to E.164 format (ensure it starts with +)
                return phone.replace(/\s+/g, '').replace(/-/g, '').startsWith('+') ? phone : `+${phone}`;
            });

        if (recipientPhones.length === 0) return null;

        // Ensure event has host information loaded
        if (!(event as any).created_by_user) {
            await event.reload({
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email', 'username'],
                    required: false,
                }],
                transaction,
            });
        }

        // Get sender information
        const sender = await User.findByPk(senderId, {
            attributes: ['id', 'name', 'username'],
            transaction
        });

        // Generate SMS text using getInviteSmsText from sms service
        const smsMessage = getInviteSmsText(event, sender || undefined);

        // Create SMS record directly
        const smsRecord = await Sms.create({
            to: recipientPhones,
            message: smsMessage,
            created_by: senderId || null,
            from: env.TWILIO_PHONE_NUMBER,
            type: SmsType.NETWORK_BROADCAST,
        }, { transaction });

        return smsRecord;
    } catch (error: any) {
        loggerService.error(`Error sending network broadcast SMS: ${error.message}`);
        return null;
    }
};

const generateFeedMessage = (feed: Feed, senderName?: string): string => {
    const { content } = feed;
    const feedUrl = `${env.FRONT_URL}/post/${feed.id}`;
    
    // Truncate content if too long (SMS has character limits)
    const truncatedContent = content && content.length > 100 ? content.substring(0, 100) + '...' : content || 'Check out this post!';
    
    const senderLine = senderName ? `Shared by ${senderName}.\n\n` : '';
    const baseMessage = `${senderLine}${truncatedContent}\n\n`;
    const additionalLines = `Get out. Get Networked.\nPowered by net-worked.ai\n`;
    const feedLinkMessage = feedUrl;
    
    return baseMessage + additionalLines + feedLinkMessage;
};

export const sendFeedNetworkBroadcastSms = async (feed: Feed, recipientUserIds: string[], senderId: string, transaction?: Transaction): Promise<Sms | null> => {
    try {
        if (!recipientUserIds || recipientUserIds.length === 0) return null;

        // Get recipient phone numbers
        const recipients = await User.findAll({
            where: {
                id: recipientUserIds,
                is_deleted: false
            },
            attributes: ['mobile'],
            transaction
        });

        const recipientPhones = recipients
            .map((user: any) => user.mobile)
            .filter((phone: string) => phone && phone.trim() !== '')
            .map((phone: string) => {
                // Format phone number to E.164 format (ensure it starts with +)
                return phone.replace(/\s+/g, '').replace(/-/g, '').startsWith('+') ? phone : `+${phone}`;
            });

        if (recipientPhones.length === 0) return null;

        // Get sender information
        const sender = await User.findByPk(senderId, {
            attributes: ['id', 'name', 'username'],
            transaction
        });

        const senderName = sender?.name || sender?.username || 'Networked AI';

        // Generate SMS text for feed
        const smsMessage = generateFeedMessage(feed, senderName);

        // Create SMS record directly
        const smsRecord = await Sms.create({
            to: recipientPhones,
            message: smsMessage,
            created_by: senderId || null,
            from: env.TWILIO_PHONE_NUMBER,
            type: SmsType.NETWORK_BROADCAST,
        }, { transaction });

        return smsRecord;
    } catch (error: any) {
        loggerService.error(`Error sending feed network broadcast SMS: ${error.message}`);
        return null;
    }
};

/** Send SMS to customers from tag_ids and/or segment_ids; merges with payload to and creates one SMS record (hook sends). */
export const sendSmsByTagsAndSegments = async (
    params: SendSmsByTagsAndSegmentsParams,
    userId: string,
    transaction?: Transaction
): Promise<Sms> => {
    const payloadTo = Array.isArray(params.to) ? params.to : [];
    const tagIds = Array.isArray(params.tag_ids) ? params.tag_ids : [];
    const segmentIds = Array.isArray(params.segment_ids) ? params.segment_ids : [];

    const customerMobiles = await customerService.getDistinctMobilesByTagsAndSegments(userId, tagIds, segmentIds, transaction);
    const allTo = [...new Set([...customerMobiles, ...payloadTo])];

    return createSms(
        {
            to: allTo,
            type: params.type,
            created_by: userId,
            message: params.message,
            title: params.title || null,
        },
        transaction
    );
};

export const getAllSmsPaginated = async (
    userId: string,
    options: GetAllSmsOptions = {}
): Promise<{ data: any[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const {
        date_to,
        page = 1,
        date_from,
        limit = 10,
        search = '',
        order_by = 'created_at',
        order_direction = 'DESC',
    } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = { created_by: userId };
    if (search) {
        whereClause[Op.or] = [
            { message: { [Op.like]: `%${search}%` } },
            { from: { [Op.like]: `%${search}%` } },
            { type: { [Op.like]: `%${search}%` } },
        ];
    }

    if (date_from || date_to) {
        const fromDate = date_from ? new Date(date_from) : null;
        const toDate = date_to ? new Date(date_to) : null;
        whereClause.created_at = {};
        if (fromDate && !isNaN(fromDate.getTime())) whereClause.created_at[Op.gte] = fromDate;
        if (toDate && !isNaN(toDate.getTime())) whereClause.created_at[Op.lte] = toDate;
    }

    const validOrderColumns = ['message', 'created_at'];
    const safeOrder = validOrderColumns.includes(order_by) ? order_by : 'created_at';

    const { count, rows } = await Sms.findAndCountAll({
        offset,
        where: whereClause,
        limit: Number(limit),
        attributes: smsAttributes,
        order: [[safeOrder, order_direction]],
    });

    return {
        data: rows.map((r: any) => (r.toJSON ? r.toJSON() : r)),
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)) || 0,
        },
    };
};

export const getSmsById = async (id: string, userId: string, transaction?: Transaction): Promise<Sms | null> => {
    return Sms.findOne({
        transaction,
        attributes: smsAttributes,
        where: { id, created_by: userId },
    });
};

export const deleteSms = async (id: string, userId: string, transaction?: Transaction): Promise<boolean> => {
    const sms = await Sms.findOne({
        transaction,
        attributes: ['id'],
        where: { id, created_by: userId },
    });

    if (!sms) return false;

    await Sms.destroy({ where: { id }, transaction });
    return true;
};

export default {
    createSms,
    deleteSms,
    getSmsById,
    getInviteSmsText,
    getAllSmsPaginated,
    sendEventUpdatedSms,
    sendEventCreationSms,
    generateEventMessage,
    sendEventDeletionSms,
    sendNetworkBroadcastSms,
    sendEventRoleRemovalSms,
    sendRsvpRequestSmsToHost,
    sendSmsByTagsAndSegments,
    sendEventRoleAssignmentSms,
    sendFeedNetworkBroadcastSms,
    generateEventReminderMessage,
    sendRsvpConfirmationSmsToHost,
    sendRsvpConfirmationSmsToGuest,
    sendRsvpRequestRejectedSmsToRequester,
    sendRsvpRequestApprovedSmsToRequester,
    checkSmsLimit,
    updateSmsUsage,
};