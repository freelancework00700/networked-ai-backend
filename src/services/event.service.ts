import path from 'path';
import axios from 'axios';
import { IncludeOptions, Op, Sequelize, Transaction } from 'sequelize';
import {
    Event,
    EventAttendee,
    EventFeedback,
    EventLike,
    EventMedia,
    EventParticipant,
    EventPromoCode,
    EventQuestion,
    EventQuestionOption,
    EventReport,
    EventSetting,
    EventTickets,
    EventVibe,
    EventViewer,
    RSVPRequest,
    User,
    UserVibe,
    Vibe,
    StripePrice,
    Subscription,
    StripeProduct,
    StripeProductEvent,
} from '../models/index';
import { ContentType, EventParticipantRole, MediaContext, MediaType, QuestionType } from '../types/enums';
import { CreateEventParams, eventAttendeeParams, eventFeedbackParams, EventParticipantParams, MediaParams, PromoCodeParams, QuestionOptionParams, QuestionParams, SettingsParams, TicketParams } from '../types/event.interfaces';
import { removeMediaFile, resolveLocalPath } from '../utils/file.service';
import { generateThumbnail } from '../utils/thumbnail.util';
import env from '../utils/validate-env';
import gamificationCategoryService from './gamification-category.service';
import userGamificationCategoryBadgesService from './user-gamification-category-badges.service';
import userGamificationPointsService from './user-gamification-points.service';
import userService from './user.service';
import loggerService from '../utils/logger.service';
import eventReminderService from './event-reminder.service';

const masterAttributes = ['id', 'name', 'icon', 'description'];
const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'latitude', 'longitude', 'city', 'state', 'country', 'category_id', 'is_paid_event', 'start_date', 'end_date', 'capacity', 'is_public', 'parent_event_id', 'thumbnail_url', 'image_url', 'total_likes', 'total_views', 'created_by'];
const eventSettingAttributes = ['id', 'is_repeating_event', 'repeating_frequency', 'is_rsvp_approval_required', 'is_show_timer', 'max_attendees_per_user', 'host_pays_platform_fee', 'additional_fees', 'is_subscriber_exclusive'];
const eventMediaAttributes = ['id', 'media_url', 'media_type', 'order'];
const eventTicketsAttributes = ['id', 'name', 'price', 'available_quantity', 'quantity', 'description', 'ticket_type', 'sales_start_date', 'sales_end_date', 'end_at_event_start', 'order'];
const eventPromoCodeAttributes = ['id', 'promo_code', 'type', 'value', 'capped_amount', 'available_quantity', 'quantity', 'max_uses_per_user'];
const eventParticipantAttributes = ['id', 'user_id', 'role'];
const eventAttendeeAttributes = ['id', 'event_id', 'user_id', 'parent_user_id', 'name', 'is_incognito', 'rsvp_status', 'is_checked_in', 'event_ticket_id', 'event_promo_code_id', 'platform_fee_amount', 'amount_paid', 'apple_wallet_pass_url', 'host_payout_amount'];
const eventQuestionAttributes = ['id', 'question', 'event_phase', 'question_type', 'is_required', 'max', 'min', 'rating_scale', 'is_public', 'order'];
const eventQuestionOptionAttributes = ['id', 'option', 'order'];
const userAttributes = ['id', 'name', 'email', 'mobile', 'username', 'image_url', 'thumbnail_url', 'total_gamification_points', 'company_name', 'total_gamification_points_weekly'];
const eventFeedbackAttributes = ['id', 'user_id', 'question_id', 'answer_option_id', 'answer'];
const stripePriceAttributes = ['id', 'amount', 'interval', 'active'];
const stripeProductAttributes = ['id', 'name', 'description', 'plan_benefits', 'is_sponsor', 'active'];

export const getEventIncludes = (userId?: string | null) => {
    const include: any[] = [
        {
            model: EventSetting,
            attributes: eventSettingAttributes,
            as: 'settings',
            required: false,
            where: { is_deleted: false }
        },
        {
            model: EventMedia,
            attributes: eventMediaAttributes,
            as: 'medias',
            required: false,
            where: { is_deleted: false }
        },
        {
            model: EventTickets,
            attributes: eventTicketsAttributes,
            as: 'tickets',
            required: false,
            where: { is_deleted: false },
            separate: true,
            order: [['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
        },
        {
            model: EventPromoCode,
            attributes: eventPromoCodeAttributes,
            as: 'promo_codes',
            required: false,
            where: { is_deleted: false }
        },
        {
            model: Vibe,
            as: 'vibes',
            required: false,
            attributes: masterAttributes,
            where: { is_deleted: false },
            through: { attributes: [] },
        },
        {
            model: EventParticipant,
            attributes: eventParticipantAttributes,
            as: 'participants',
            required: false,
            where: { is_deleted: false },
            include: [{
                model: User,
                as: 'user',
                required: false,
                where: { is_deleted: false },
                attributes: userAttributes,
            }]
        },
        {
            model: EventQuestion,
            attributes: eventQuestionAttributes,
            as: 'questionnaire',
            required: false,
            where: { is_deleted: false },
            separate: true,
            order: [['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
            include: [{
                model: EventQuestionOption,
                as: 'options',
                required: false,
                where: { is_deleted: false },
                attributes: eventQuestionOptionAttributes,
                separate: true,
                order: [['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
            }]
        },
        // {
        //     model: RSVPRequest,
        //     as: 'rsvp_requests',
        //     separate: true,
        //     required: false,
        //     where: { is_deleted: false },
        //     attributes: ['id', 'status', 'user_id'],
        //     include: [{
        //         model: User,
        //         as: 'user',
        //         required: false,
        //         where: { is_deleted: false },
        //         attributes: userAttributes,
        //     }],
        // },
        // {
        //     model: EventAttendee,
        //     as: 'attendees',
        //     required: false,
        //     where: { is_deleted: false },
        //     attributes: eventAttendeeAttributes,
        //     include: [
        //         {
        //         model: User,
        //         as: 'user',
        //         required: false,
        //         where: { is_deleted: false },
        //         attributes: userAttributes,
        //         },
        //         {
        //             model: EventTickets,
        //             as: 'event_ticket',
        //             required: false,
        //             // where: { is_deleted: false },
        //             attributes: eventTicketsAttributes,
        //         }
        //     ]
        // },
        {
            model: Event,
            as: 'parent_event',
            required: false,
            where: { is_deleted: false },
            attributes: eventAttributes,
        },
        {
            model: StripeProduct,
            as: 'plans',
            required: false,
            where: { 
                active: true,
                is_deleted: false 
            },
            attributes: stripeProductAttributes,
            through: { attributes: [] },
            include: [{
                model: StripePrice,
                as: 'prices',
                required: false,
                where: {
                    active: true,
                    is_deleted: false 
                },
                attributes: stripePriceAttributes,
            }]
        }
    ];

    if (userId) {
        include.push({
            model: RSVPRequest,
            as: 'rsvp_requests',
            separate: true,
            required: false,
            where: {
                is_deleted: false,
                user_id: userId
            },
            attributes: ['id', 'status', 'user_id'],
            include: [{
                model: User,
                as: 'user',
                required: false,
                where: { is_deleted: false },
                attributes: userAttributes,
            }],
        });

        include.push({
            model: EventAttendee,
            as: 'attendees',
            required: false,
            where: { is_deleted: false, user_id: userId },
            attributes: eventAttendeeAttributes,
            include: [
                {
                model: User,
                as: 'user',
                required: false,
                where: { is_deleted: false },
                attributes: userAttributes,
                },
                {
                    model: EventTickets,
                    as: 'event_ticket',
                    required: false,
                    // where: { is_deleted: false },
                    attributes: eventTicketsAttributes,
                }
            ]
        });
    }

    return include;
};


const includeSettings = [
    {
        model: EventSetting,
        attributes: eventSettingAttributes,
        as: 'settings',
        required: false,
        where: { is_deleted: false }
    }
];

/**
 * Generate a unique slug from event title
 * If slug already exists, appends timestamp to make it unique
 * @param title - Event title
 * @param excludeEventId - Optional event ID to exclude from duplicate check (for updates)
 * @param transaction - Optional transaction
 * @returns Unique slug string
 */
const generateUniqueSlug = async (title: string, excludeEventId?: string, transaction?: Transaction): Promise<string> => {
    // Convert title to slug: lowercase, keep only word characters, spaces, and hyphens, then replace spaces with hyphens
    const baseSlug = title?.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || 'event';

    // Check if slug exists
    const whereClause: any = {
        slug: baseSlug,
        is_deleted: false,
    };

    if (excludeEventId) {
        whereClause.id = { [Op.ne]: excludeEventId };
    }

    const existingEvent = await Event.findOne({
        attributes: ['slug'],
        where: whereClause,
        transaction,
    });

    // If slug doesn't exist, return it
    if (!existingEvent?.slug) {
        return baseSlug;
    }

    // If slug exists, append timestamp
    const timestamp = Date.now();
    return `${baseSlug}-${timestamp}`;
};

/** Create event vibes */
const createEventVibes = async (
    eventId: string,
    vibes: string[] | undefined,
    transaction: Transaction
): Promise<void> => {
    if (vibes && vibes.length > 0) {
        const vibeRows = vibes.map((vibeId: string) => ({
            event_id: eventId,
            vibe_id: vibeId,
        }));
        await EventVibe.bulkCreate(vibeRows, { transaction });
    }
};

/** Create event settings */
const createEventSettings = async (
    eventId: string,
    settings: SettingsParams,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    await EventSetting.create(
        {
            event_id: eventId,
            is_repeating_event: settings.is_repeating_event ?? false,
            repeating_frequency: settings.repeating_frequency ?? null,
            is_rsvp_approval_required: settings.is_rsvp_approval_required ?? false,
            is_show_timer: settings.is_show_timer ?? false,
            max_attendees_per_user: settings.max_attendees_per_user ?? 0,
            host_pays_platform_fee: settings.host_pays_platform_fee ?? false,
            additional_fees: settings.additional_fees ?? null,
            is_subscriber_exclusive: settings.is_subscriber_exclusive ?? false,
            created_by: createdBy,
        },
        { transaction }
    );
};

/** Create event media */
const createEventMedias = async (
    eventId: string,
    medias: MediaParams[] | undefined,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    if (medias && medias.length > 0) {
        const mediaRows = medias.map((m: MediaParams) => ({
            event_id: eventId,
            media_url: m.media_url,
            media_type: m.media_type,
            order: m.order ?? 0,
            created_by: createdBy,
        }));
        await EventMedia.bulkCreate(mediaRows, { transaction });
    }
};

/** Create event tickets */
const createEventTickets = async (
    eventId: string,
    tickets: TicketParams[] | undefined,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    if (tickets && tickets.length > 0) {
        const ticketRows = tickets.map((t: TicketParams) => ({
            event_id: eventId,
            name: t.name,
            price: t.price,
            available_quantity: t.quantity,
            quantity: t.quantity,
            description: t.description,
            ticket_type: t.ticket_type,
            sales_start_date: t.sales_start_date,
            sales_end_date: t.sales_end_date,
            end_at_event_start: t.end_at_event_start,
            order: t.order ?? 0,
            created_by: createdBy,
        }));
        await EventTickets.bulkCreate(ticketRows, { transaction });
    }
};

/** Create event promo codes */
const createEventPromoCodes = async (
    eventId: string,
    promoCodeParams: PromoCodeParams[] | undefined,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    if (promoCodeParams && promoCodeParams.length > 0) {
        const promoCodeRows = promoCodeParams.map((p: PromoCodeParams) => ({
            event_id: eventId,
            promo_code: p.promo_code,
            type: p.type,
            value: p.value,
            capped_amount: p.capped_amount ?? null,
            available_quantity: p.quantity ?? null,
            quantity: p.quantity ?? null,
            max_uses_per_user: p.max_uses_per_user ?? null,
            created_by: createdBy,
        }));
        await EventPromoCode.bulkCreate(promoCodeRows, { transaction });
    }
};

/** Create event participants */
const createEventParticipants = async (
    eventId: string,
    eventParticipants: EventParticipantParams[] | undefined,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!(eventParticipants && eventParticipants.length > 0)) {
        return;
    }
    const participantRows = eventParticipants.map((p: EventParticipantParams) => ({
        event_id: eventId,
        user_id: p.user_id,
        role: p.role,
        created_by: createdBy,
    }));
    await EventParticipant.bulkCreate(participantRows, { transaction, individualHooks: true });

    // Increment user totals based on role
    for (const participant of eventParticipants) {
        switch (participant.role) {
            case EventParticipantRole.HOST:
                await userService.incrementUserTotal(participant.user_id, 'total_events_hosted', transaction);
                break;
            case EventParticipantRole.CO_HOST:
                await userService.incrementUserTotal(participant.user_id, 'total_events_cohosted', transaction);
                break;
            case EventParticipantRole.SPEAKER:
                await userService.incrementUserTotal(participant.user_id, 'total_events_spoken', transaction);
                break;
            case EventParticipantRole.SPONSOR:
                await userService.incrementUserTotal(participant.user_id, 'total_events_sponsored', transaction);
                break;
            case EventParticipantRole.STAFF:
                await userService.incrementUserTotal(participant.user_id, 'total_events_staffed', transaction);
                break;
        }
    }
};

/** Create event questions with options */
const createEventQuestionsWithOptions = async (
    eventId: string,
    question: QuestionParams,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    const createdQuestion = await EventQuestion.create(
        {
            event_id: eventId,
            question: question.question,
            event_phase: question.event_phase,
            question_type: question.question_type,
            is_required: question.is_required,
            max: question.max ?? null,
            min: question.min ?? null,
            rating_scale: question.rating_scale ?? null,
            is_public: question.is_public,
            order: question.order ?? 0,
            created_by: createdBy,
        },
        { transaction }
    );

    if (question.options && question.options.length > 0) {
        const optionRows = question.options.map((option: QuestionOptionParams) => ({
            question_id: createdQuestion.id,
            option: option.option,
            order: option.order ?? 0,
            created_by: createdBy,
        }));
        await EventQuestionOption.bulkCreate(optionRows, { transaction });
    }
};

/** Create event questionnaires */
const createEventQuestionaries = async (
    eventId: string,
    questionnaire: QuestionParams[] | undefined,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    if (questionnaire && questionnaire.length > 0) {
        for (const question of questionnaire) {
            await createEventQuestionsWithOptions(eventId, question, createdBy, transaction);
        }
    }
};

/** Update event vibes */
const updateEventVibes = async (
    eventId: string,
    vibes: string[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    // Delete existing vibes (junction table, no soft delete)
    await EventVibe.destroy({
        where: { event_id: eventId },
        transaction,
    });

    // Create new vibes if provided
    if (vibes && vibes.length > 0) {
        await createEventVibes(eventId, vibes, transaction);
    }
};

/** Update event settings */
const updateEventSettings = async (
    eventId: string,
    settings: SettingsParams,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    const existingSettings = await EventSetting.findOne({
        where: { event_id: eventId, is_deleted: false },
        transaction,
    });

    if (existingSettings) {
        await existingSettings.update(
            {
                is_repeating_event: settings.is_repeating_event ?? false,
                repeating_frequency: settings.repeating_frequency ?? null,
                is_rsvp_approval_required: settings.is_rsvp_approval_required ?? false,
                is_show_timer: settings.is_show_timer ?? false,
                max_attendees_per_user: settings.max_attendees_per_user ?? 0,
                host_pays_platform_fee: settings.host_pays_platform_fee ?? false,
                additional_fees: settings.additional_fees ?? null,
                is_subscriber_exclusive: settings.is_subscriber_exclusive ?? false,
                updated_by: updatedBy,
            },
            { transaction }
        );
    } else {
        await createEventSettings(eventId, settings, updatedBy, transaction);
    }
};

/** Update event media */
const updateEventMedias = async (
    eventId: string,
    medias: MediaParams[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!medias || medias.length === 0) {
        // If no media provided, soft delete all existing media
        await EventMedia.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { event_id: eventId, is_deleted: false },
                transaction,
            }
        );
        return;
    }

    // Get existing media
    const existingMedia = await EventMedia.findAll({
        attributes: ['id'],
        where: { event_id: eventId, is_deleted: false },
        transaction,
    });

    const existingMediaIds = new Set(existingMedia.map(m => m.id));
    const incomingMediaIds = new Set(medias.filter(m => m.id).map(m => m.id));
    
    // Update existing media
    for (const media of medias) {
        if (media.id && existingMediaIds.has(media.id)) {
            // Update existing media
            await EventMedia.update(
                {
                    media_url: media.media_url,
                    media_type: media.media_type,
                    order: media.order,
                    updated_by: updatedBy,
                },
                {
                    where: { id: media.id, event_id: eventId, is_deleted: false },
                    transaction,
                }
            );
        }
    }

    // Create new media (those without ID)
    const newMedias = medias.filter(m => !m.id);
    if (newMedias.length > 0) {
        await createEventMedias(eventId, newMedias, updatedBy, transaction);
    }

    // Soft delete media that are not in the incoming list
    const mediaToDelete = [...existingMediaIds].filter(id => !incomingMediaIds.has(id));
    if (mediaToDelete.length > 0) {
        await EventMedia.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { id: { [Op.in]: mediaToDelete }, event_id: eventId, is_deleted: false },
                transaction,
            }
        );
    }
};

/** Update event tickets */
const updateEventTickets = async (
    eventId: string,
    tickets: TicketParams[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!tickets || tickets.length === 0) {
        // If no tickets provided, soft delete all existing tickets
        await EventTickets.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { event_id: eventId, is_deleted: false },
                transaction,
            }
        );
        return;
    }

    // Get existing tickets
    const existingTickets = await EventTickets.findAll({
        attributes: ['id'],
        where: { event_id: eventId, is_deleted: false },
        transaction,
    });

    const existingTicketIds = new Set(existingTickets.map(t => t.id));
    const incomingTicketIds = new Set(tickets.filter(t => t.id).map(t => t.id));
    
    // Update existing tickets
    for (const ticket of tickets) {
        if (ticket.id && existingTicketIds.has(ticket.id)) {
            // Update existing ticket
            await EventTickets.update(
                {
                    name: ticket.name,
                    price: ticket.price,
                    quantity: ticket.quantity,
                    description: ticket.description,
                    ticket_type: ticket.ticket_type,
                    sales_start_date: new Date(ticket.sales_start_date),
                    sales_end_date: new Date(ticket.sales_end_date),
                    end_at_event_start: ticket.end_at_event_start,
                    order: ticket.order,
                    updated_by: updatedBy,
                },
                {
                    where: { id: ticket.id, event_id: eventId, is_deleted: false },
                    transaction,
                }
            );
        }
    }

    // Create new tickets (those without ID)
    const newTickets = tickets.filter(t => !t.id);
    if (newTickets.length > 0) {
        await createEventTickets(eventId, newTickets, updatedBy, transaction);
    }

    // Soft delete tickets that are not in the incoming list
    const ticketsToDelete = [...existingTicketIds].filter(id => !incomingTicketIds.has(id));
    if (ticketsToDelete.length > 0) {
        await EventTickets.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { id: { [Op.in]: ticketsToDelete }, event_id: eventId, is_deleted: false },
                transaction,
            }
        );
    }
};

/** Update event promo codes */
const updateEventPromoCodes = async (
    eventId: string,
    promoCodeParams: PromoCodeParams[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!promoCodeParams || promoCodeParams.length === 0) {
        // If no promo codes provided, soft delete all existing promo codes
        await EventPromoCode.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { event_id: eventId, is_deleted: false },
                transaction,
            }
        );
        return;
    }

    // Get existing promo codes
    const existingPromoCodes = await EventPromoCode.findAll({
        attributes: ['id'],
        where: { event_id: eventId, is_deleted: false },
        transaction,
    });

    const existingPromoCodeIds = new Set(existingPromoCodes.map(p => p.id));
    const incomingPromoCodeIds = new Set(promoCodeParams.filter(p => p.id).map(p => p.id));
    
    // Update existing promo codes
    for (const promoCode of promoCodeParams) {
        if (promoCode.id && existingPromoCodeIds.has(promoCode.id)) {
            // Update existing promo code
            await EventPromoCode.update(
                {
                    promo_code: promoCode.promo_code,
                    type: promoCode.type,
                    value: promoCode.value,
                    capped_amount: promoCode.capped_amount,
                    quantity: promoCode.quantity,
                    max_uses_per_user: promoCode.max_uses_per_user,
                    updated_by: updatedBy,
                },
                {
                    where: { id: promoCode.id, event_id: eventId, is_deleted: false },
                    transaction,
                }
            );
        }
    }

    // Create new promo codes (those without ID)
    const newPromoCodes = promoCodeParams.filter(p => !p.id);
    if (newPromoCodes.length > 0) {
        await createEventPromoCodes(eventId, newPromoCodes, updatedBy, transaction);
    }

    // Soft delete promo codes that are not in the incoming list
    const promoCodesToDelete = [...existingPromoCodeIds].filter(id => !incomingPromoCodeIds.has(id));
    if (promoCodesToDelete.length > 0) {
        await EventPromoCode.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { id: { [Op.in]: promoCodesToDelete }, event_id: eventId, is_deleted: false },
                transaction,
            }
        );
    }
};

/** Update event participants */
const updateEventParticipants = async (
    eventId: string,
    eventParticipants: EventParticipantParams[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!eventParticipants || eventParticipants.length === 0) {
        // If no participants provided, soft delete all existing participants
        const existingParticipants = await EventParticipant.findAll({
            where: { event_id: eventId, is_deleted: false },
            transaction,
        });

        // Decrement user totals for existing participants
        for (const participant of existingParticipants) {
            switch (participant.role) {
                case EventParticipantRole.HOST:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_hosted', transaction);
                    break;
                case EventParticipantRole.CO_HOST:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_cohosted', transaction);
                    break;
                case EventParticipantRole.SPEAKER:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_spoken', transaction);
                    break;
                case EventParticipantRole.SPONSOR:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_sponsored', transaction);
                    break;
                case EventParticipantRole.STAFF:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_staffed', transaction);
                    break;
            }
        }

        await EventParticipant.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { event_id: eventId, is_deleted: false },
                transaction,
            }
        );
        return;
    }

    // Get existing participants
    const existingParticipants = await EventParticipant.findAll({
        attributes: ['id'],
        where: { event_id: eventId, is_deleted: false },
        transaction,
    });

    const existingParticipantIds = new Set(existingParticipants.map(p => p.id));
    const incomingParticipantIds = new Set(eventParticipants.filter(p => p.id).map(p => p.id));
    
    // Update existing participants and handle role changes
    for (const participant of eventParticipants) {
        if (participant.id && existingParticipantIds.has(participant.id)) {
            const existingParticipant = existingParticipants.find(p => p.id === participant.id);
            
            // Handle role change - decrement old role total
            if (existingParticipant && existingParticipant.role !== participant.role) {
                switch (existingParticipant.role) {
                    case EventParticipantRole.HOST:
                        await userService.decrementUserTotal(existingParticipant.user_id, 'total_events_hosted', transaction);
                        break;
                    case EventParticipantRole.CO_HOST:
                        await userService.decrementUserTotal(existingParticipant.user_id, 'total_events_cohosted', transaction);
                        break;
                    case EventParticipantRole.SPEAKER:
                        await userService.decrementUserTotal(existingParticipant.user_id, 'total_events_spoken', transaction);
                        break;
                    case EventParticipantRole.SPONSOR:
                        await userService.decrementUserTotal(existingParticipant.user_id, 'total_events_sponsored', transaction);
                        break;
                    case EventParticipantRole.STAFF:
                        await userService.decrementUserTotal(existingParticipant.user_id, 'total_events_staffed', transaction);
                        break;
                }
                
                // Increment new role total
                switch (participant.role) {
                    case EventParticipantRole.HOST:
                        await userService.incrementUserTotal(participant.user_id, 'total_events_hosted', transaction);
                        break;
                    case EventParticipantRole.CO_HOST:
                        await userService.incrementUserTotal(participant.user_id, 'total_events_cohosted', transaction);
                        break;
                    case EventParticipantRole.SPEAKER:
                        await userService.incrementUserTotal(participant.user_id, 'total_events_spoken', transaction);
                        break;
                    case EventParticipantRole.SPONSOR:
                        await userService.incrementUserTotal(participant.user_id, 'total_events_sponsored', transaction);
                        break;
                    case EventParticipantRole.STAFF:
                        await userService.incrementUserTotal(participant.user_id, 'total_events_staffed', transaction);
                        break;
                }
            }

            // Update existing participant
            await EventParticipant.update(
                {
                    user_id: participant.user_id,
                    role: participant.role,
                    updated_by: updatedBy,
                },
                {
                    where: { id: participant.id, event_id: eventId, is_deleted: false },
                    transaction,
                }
            );
        }
    }

    // Create new participants (those without ID)
    const newParticipants = eventParticipants.filter(p => !p.id);
    if (newParticipants.length > 0) {
        await createEventParticipants(eventId, newParticipants, updatedBy, transaction);
    }

    // Soft delete participants that are not in the incoming list and decrement their totals
    const participantsToDelete = [...existingParticipantIds].filter(id => !incomingParticipantIds.has(id));
    if (participantsToDelete.length > 0) {
        const participantsToDeleteRecords = existingParticipants.filter(p => participantsToDelete.includes(p.id));
        
        // Decrement user totals for participants being deleted
        for (const participant of participantsToDeleteRecords) {
            switch (participant.role) {
                case EventParticipantRole.HOST:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_hosted', transaction);
                    break;
                case EventParticipantRole.CO_HOST:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_cohosted', transaction);
                    break;
                case EventParticipantRole.SPEAKER:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_spoken', transaction);
                    break;
                case EventParticipantRole.SPONSOR:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_sponsored', transaction);
                    break;
                case EventParticipantRole.STAFF:
                    await userService.decrementUserTotal(participant.user_id, 'total_events_staffed', transaction);
                    break;
            }
        }

        await EventParticipant.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { id: { [Op.in]: participantsToDelete }, event_id: eventId, is_deleted: false },
                transaction,
            }
        );
    }
};

// Create or update event-plan mappings 
const upsertEventPlanMappings = async (
    eventId: string,
    planIds: string[] | undefined,
    transaction: Transaction
): Promise<void> => {
    // Remove all existing mappings for this event
    await StripeProductEvent.destroy({
        where: { event_id: eventId },
        transaction,
    });

    // Create new mappings if planIds provided
    if (planIds && planIds.length > 0) {
        const mappings = planIds.map((planId: string) => ({
            event_id: eventId,
            product_id: planId,
        }));

        await StripeProductEvent.bulkCreate(mappings, { transaction });
    }
};

/** Update event questionnaires */
const updateEventQuestionaries = async (
    eventId: string,
    questionnaire: QuestionParams[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!questionnaire || questionnaire.length === 0) {
        // If no questions provided, soft delete all existing questions and their options
        const existingQuestions = await EventQuestion.findAll({
            where: { event_id: eventId, is_deleted: false },
            transaction,
        });

        const questionIds = existingQuestions.map((q) => q.id);

        // Soft delete existing question options
        if (questionIds.length > 0) {
            await EventQuestionOption.update(
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: updatedBy,
                },
                {
                    where: { question_id: { [Op.in]: questionIds } },
                    transaction,
                }
            );
        }

        // Soft delete existing questions
        await EventQuestion.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { event_id: eventId, is_deleted: false },
                transaction,
            }
        );
        return;
    }

    // Get existing questions
    const existingQuestions = await EventQuestion.findAll({
        attributes: ['id'],
        where: { event_id: eventId, is_deleted: false },
        transaction,
    });

    const existingQuestionIds = new Set(existingQuestions.map(q => q.id));
    const incomingQuestionIds = new Set(questionnaire.filter(q => q.id).map(q => q.id));
    
    // Update existing questions
    for (const question of questionnaire) {
        if (question.id && existingQuestionIds.has(question.id)) {
            // Update existing question
            await EventQuestion.update(
                {
                    question: question.question,
                    event_phase: question.event_phase,
                    question_type: question.question_type,
                    is_required: question.is_required,
                    max: question.max,
                    min: question.min,
                    rating_scale: question.rating_scale,
                    is_public: question.is_public,
                    order: question.order,
                    updated_by: updatedBy,
                },
                {
                    where: { id: question.id, event_id: eventId, is_deleted: false },
                    transaction,
                }
            );

            // Handle question options - upsert by option id, create if no id, soft delete removed
            const existingOptions = await EventQuestionOption.findAll({
                attributes: ['id'],
                where: { question_id: question.id, is_deleted: false },
                transaction,
            });

            const existingOptionIds = new Set(existingOptions.map((o) => o.id));
            const incomingOptionIds = new Set(
                (question.options ?? []).filter((o) => o.id).map((o) => o.id as string)
            );

            // Update existing options
            if (question.options && question.options.length > 0) {
                for (const option of question.options) {
                    if (option.id && existingOptionIds.has(option.id)) {
                        await EventQuestionOption.update(
                            {
                                option: option.option,
                                order: option.order ?? 0,
                                updated_by: updatedBy,
                            },
                            {
                                where: { id: option.id, question_id: question.id, is_deleted: false },
                                transaction,
                            }
                        );
                    }
                }
            }

            // Create new options (those without id)
            const newOptions = (question.options ?? []).filter((o) => !o.id);
            if (newOptions.length > 0) {
                const optionRows = newOptions.map((option: QuestionOptionParams) => ({
                    question_id: question.id,
                    option: option.option,
                    order: option.order ?? 0,
                    created_by: updatedBy,
                }));

                await EventQuestionOption.bulkCreate(optionRows, { transaction });
            }

            // Soft delete options that are not in the incoming list
            const optionsToDelete = [...existingOptionIds].filter((id) => !incomingOptionIds.has(id));
            if (optionsToDelete.length > 0) {
                await EventQuestionOption.update(
                    {
                        is_deleted: true,
                        deleted_at: new Date(),
                        deleted_by: updatedBy,
                    },
                    {
                        where: { id: { [Op.in]: optionsToDelete }, question_id: question.id, is_deleted: false },
                        transaction,
                    }
                );
            }
        }
    }

    // Create new questions (those without ID)
    const newQuestions = questionnaire.filter(q => !q.id);
    if (newQuestions.length > 0) {
        for (const question of newQuestions) {
            await createEventQuestionsWithOptions(eventId, question, updatedBy, transaction);
        }
    }

    // Soft delete questions that are not in the incoming list and their options
    const questionsToDelete = [...existingQuestionIds].filter(id => !incomingQuestionIds.has(id));
    if (questionsToDelete.length > 0) {
        // Soft delete question options for questions being deleted
        await EventQuestionOption.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { question_id: { [Op.in]: questionsToDelete }, is_deleted: false },
                transaction,
            }
        );

        // Soft delete questions
        await EventQuestion.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: updatedBy,
            },
            {
                where: { id: { [Op.in]: questionsToDelete }, event_id: eventId, is_deleted: false },
                transaction,
            }
        );
    }
};

/** Create event with all related entities */
export const createEvent = async (
    params: CreateEventParams,
    createdBy: string,
    transaction: Transaction
): Promise<Event> => {
    // Generate unique slug from title
    const slug = await generateUniqueSlug(params.title, undefined, transaction);

    // Generate thumbnail from media with order = 1
    let thumbnail_url: string | null = null;
    let image_url: string | null = null;
    if (params.medias && params.medias.length > 0) {
        // Find media with order = 1
        const primaryMedia = params.medias.find((m: MediaParams) => m.order === 1) || params.medias[0];

        if (primaryMedia?.media_url && primaryMedia.media_type === MediaType.IMAGE) {
            // Set image_url to the original media URL
            image_url = primaryMedia.media_url;
            
            try {
                // Resolve local path from URL
                const { local, cleanup } = await resolveLocalPath(primaryMedia.media_url, MediaContext.EVENT);

                // Generate thumbnail
                const thumbPath = await generateThumbnail(local, MediaContext.EVENT);
                cleanup?.();

                if (thumbPath) {
                    thumbnail_url = `${env.API_URL}/media/${MediaContext.EVENT}/${path.basename(thumbPath)}`;
                }
            } catch (error) {
                console.error('Error generating event thumbnail:', error);
            }
        }
    }

    const event = await Event.create(
        {
            title: params.title,
            slug,
            description: params.description ?? null,
            address: params.address ?? null,
            latitude: params.latitude ?? null,
            longitude: params.longitude ?? null,
            city: params.city ?? null,
            state: params.state ?? null,
            country: params.country ?? null,
            category_id: params.category_id,
            is_paid_event: params.is_paid_event ?? false,
            start_date: params.start_date,
            end_date: params.end_date,
            capacity: params.capacity ?? null,
            is_public: params.is_public ?? true,
            parent_event_id: params.parent_event_id ?? null,
            thumbnail_url,
            image_url,
            created_by: createdBy,
        },
        { transaction }
    );

    // Prepare all creation operations
    const createOperations: Promise<any>[] = [];

    // Create event vibes
    createOperations.push(createEventVibes(event.id, params.vibes, transaction));

    // Create event settings
    createOperations.push(createEventSettings(event.id, params.settings, createdBy, transaction));

    // Create event media
    createOperations.push(createEventMedias(event.id, params.medias, createdBy, transaction));

    // Create event tickets
    createOperations.push(createEventTickets(event.id, params.tickets, createdBy, transaction));

    // Create event promo codes
    createOperations.push(createEventPromoCodes(event.id, params.promo_codes, createdBy, transaction));

    // Create event participants
    createOperations.push(createEventParticipants(event.id, params.participants, createdBy, transaction));

    // Create event questionnaires
    createOperations.push(createEventQuestionaries(event.id, params.questionnaire, createdBy, transaction));

    // Create event-plan mappings
    createOperations.push(upsertEventPlanMappings(event.id, params.plan_ids, transaction));

    // Execute all creation operations in parallel
    if (createOperations.length > 0) {
        await Promise.all(createOperations);
    }

    // Create post-event reminder if event has post-event questionnaire
    // This should run after questionnaires are created
    await eventReminderService.createPostEventReminder(event, transaction);

    // Update the user total_events_hosted
    await userService.incrementUserTotal(
        createdBy,
        "total_events_hosted",
        transaction
    );
    // Get category to fetch earned_points for updating user total
    const category = await gamificationCategoryService.getGamificationCategoryByName(
        'Host an Event',
        undefined
    );

    if (category) {
        // Create user gamification points for the event creator
        await userGamificationPointsService.createUserGamificationPoints(
            {
                content_id: event.id,
                content_type: ContentType.EVENT,
                user_id: createdBy,
                gamification_category_id: category?.id ?? "",
                earned_points: category?.earned_point ?? 0,
            },
            createdBy,
            transaction
        );

        //update user gamification category badges
        await userGamificationCategoryBadgesService.checkAndAwardBadgeByField(createdBy, category.id, "total_events_hosted", transaction);

        // Update total gamification points if category exists
        await userService.addPointsToUserTotal(createdBy, "total_gamification_points", category?.earned_point ?? 0, transaction);

    }

    return event;
};

/** Create or update event view */
export const createEventView = async (
    eventId: string,
    userId: string | null,
    deviceId: string | undefined,
    createdBy: string
): Promise<EventViewer> => {
    // Check for existing view by device_id for the same event
    const whereClause = {
        is_deleted: false,
        event_id: eventId,
        device_id: deviceId,
    };

    // Find existing view
    const existingView = await EventViewer.findOne({
        where: whereClause,
    });

    // Increment total_views every time (for both new and existing views)
    await Event.increment('total_views', { where: { id: eventId } });

    if (existingView) {
        await existingView.update({ user_id: userId || existingView.user_id, updated_by: createdBy });
        return existingView;
    } else {
        // Create new view
        const newView = await EventViewer.create({
            event_id: eventId,
        created_by: createdBy,
            user_id: userId || null,
            device_id: deviceId || null,
    });

        return newView;
    }
};

/**
 * Record that a user has checked in to an event.
 */
export const recordEventQrScan = async (
    eventId: string,
    userId: string,
    transaction: Transaction
): Promise<void> => {

    const getEventAttendees = await EventAttendee.findAll({
        where: { event_id: eventId, user_id: userId, is_deleted: false, is_checked_in: false },
        transaction,
    });

    if (getEventAttendees.length > 0) {
        for (const attendee of getEventAttendees) {
            await attendee.update({
                is_checked_in: true,
            }, {
                transaction,
            });
        }
    }
};

/** Increment event like count */
const incrementEventLikeCount = async (eventId: string): Promise<void> => {
    await Event.increment('total_likes', { where: { id: eventId } });
};

/** Decrement event like count */
const decrementEventLikeCount = async (eventId: string): Promise<void> => {
    await Event.decrement('total_likes', { where: { id: eventId } });
};

/** Find event like by event and user */
export const findEventLikeByEventIdAndUserId = async (eventId: string, userId: string): Promise<EventLike | null> => {
    return await EventLike.findOne({
        where: { event_id: eventId, user_id: userId, is_deleted: false },
    });
};

/** Create event like */
export const createEventLike = async (
    eventId: string,
    userId: string,
    createdBy: string
): Promise<EventLike> => {
    // Check if already liked
    const existing = await findEventLikeByEventIdAndUserId(eventId, userId);
    if (existing) {
        return existing; // Already liked
    }

    // Create like entry
    const eventLike = await EventLike.create({
        event_id: eventId,
        user_id: userId,
        created_by: createdBy,
    });

    // Increment event like count
    await incrementEventLikeCount(eventId);

    // Increment user's total_events_liked
    await userService.incrementUserTotal(userId, 'total_events_liked');

    return eventLike;
};

/** Unlike event */
export const unlikeEvent = async (
    eventId: string,
    userId: string,
    deletedBy: string
): Promise<{ deleted: boolean } | null> => {
    const eventLike = await EventLike.findOne({
        where: { event_id: eventId, user_id: userId, is_deleted: false },
    });

    if (!eventLike) {
        return null;
    }

    // Soft delete the like entry
    eventLike.is_deleted = true;
    eventLike.deleted_at = new Date();
    eventLike.deleted_by = deletedBy;
    await eventLike.save();

    // Decrement event like count
    await decrementEventLikeCount(eventId);

    // Decrement user's total_events_liked
    await userService.decrementUserTotal(userId, 'total_events_liked');

    return { deleted: true };
};

/** Get event by id or slug */
export const getEventByIdOrSlug = async (value: string, shouldIncludeDetails: boolean = false, authUserId = null): Promise<Event | null> => {
    const include: IncludeOptions[] = [];
    if (shouldIncludeDetails) {
        include.push(...getEventIncludes(authUserId));
    }

    const event = await Event.findOne({
        where: {
            [Op.or]: [
                { id: value },
                { slug: value }
            ],
            is_deleted: false
        },
        attributes: eventAttributes,
        include,
    });

    if (!event) {
        return null;
    }

    const parentEventId = event.parent_event_id || event.id;
    
    // Check if at least ONE child exists
    const childCount = await Event.count({
        where: {
            is_deleted: false,
            parent_event_id: parentEventId,
        },
    });

    // No children -> do NOT attach child_events
    if (childCount === 0) {
        return event;
    }

    // include child + main event
    const relatedEvents = await Event.findAll({
        where: {
            [Op.or]: [
                { id: parentEventId },
                { parent_event_id: parentEventId }
            ],
            is_deleted: false
        },
        attributes: eventAttributes,
        order: [['start_date', 'ASC']],
    });

    event.setDataValue('child_events', relatedEvents.map(e => e.get({ plain: true })));
    return event;
};

/**
 * Get ticket analytics for an event, including totals and per-ticket breakdown.
 */
export const getEventAnalytics = async (
    eventId: string
): Promise<{
    event: any;
    summary: {
        total_tickets: number;
        total_sold: number;
        total_remaining: number;
        total_sales: number;
    };
    promo_codes: Array<{
        id: string;
        promo_code: string;
        type: string;
        value: number;
        capped_amount: number | null;
        total_uses: number;
        total_amount_paid: number; // calculated from host_payout_amount
        users: Array<{
            id: string;
            name: string | null;
            email: string | null;
            username: string | null;
            image_url: string | null;
            thumbnail_url: string | null;
        }>;
    }>;
} | null> => {
    const event = await Event.findOne({
        where: { id: eventId, is_deleted: false },
        attributes: eventAttributes,
        include: [
            {
                model: EventTickets,
                as: 'tickets',
                required: false,
                where: { is_deleted: false },
                attributes: eventTicketsAttributes,
            },
        ],
    });

    if (!event) {
        return null;
    }

    // Count how many attendees are associated to each ticket and sum host_payout_amount (sales)
    const attendeeCounts = await EventAttendee.findAll({
        where: { event_id: eventId, is_deleted: false },
        attributes: [
            'event_ticket_id',
            [Sequelize.fn('COUNT', Sequelize.col('event_ticket_id')), 'count'],
            [Sequelize.fn('SUM', Sequelize.col('host_payout_amount')), 'total_amount'],
        ],
        group: ['event_ticket_id'],
        raw: true,
    });

    const soldByTicket = new Map<string, number>();
    const amountByTicket = new Map<string, number>();
    attendeeCounts.forEach((row: any) => {
        if (row.event_ticket_id) {
            soldByTicket.set(row.event_ticket_id, Number(row.count) || 0);
            amountByTicket.set(row.event_ticket_id, Number(row.total_amount) || 0);
        }
    });

    const eventPlain = event.get({ plain: true }) as any;
    let totalTickets = 0;
    let totalSold = 0;
    let totalRemaining = 0;
    let totalSales = 0;

    // Merge analytics directly into each ticket object
    const enrichedTickets = (eventPlain.tickets || []).map((ticket: any) => {
        const totalQuantity = Number(ticket.quantity ?? 0);
        const sold = soldByTicket.get(ticket.id) ?? 0;
        const remaining = Math.max(totalQuantity - sold, 0);
        const sales = amountByTicket.get(ticket.id) ?? 0;

        totalTickets += totalQuantity;
        totalSold += sold;
        totalRemaining += remaining;
        totalSales += sales;

        return {
            ...ticket,
            total_sold: sold,
            remaining_quantity: remaining,
            total_sales: sales,
        };
    });

    // Build promo code usage with users from attendees
    const attendeesWithPromo = await EventAttendee.findAll({
        where: {
            event_id: eventId,
            is_deleted: false,
            event_promo_code_id: { [Op.ne]: null },
        },
        attributes: ['event_promo_code_id', 'host_payout_amount', 'name', 'parent_user_id'],
        include: [
            {
                model: EventPromoCode,
                as: 'event_promo_code',
                attributes: ['id', 'promo_code', 'type', 'value', 'capped_amount'],
                where: { is_deleted: false },
                required: true,
            },
            {
                model: User,
                as: 'user',
                required: true,
                where: { is_deleted: false },
                attributes: userAttributes,
            },
        ],
    });

    // Fetch ALL promo codes (used or not) and initialize map
    const allPromoCodes = await EventPromoCode.findAll({
        where: { event_id: eventId, is_deleted: false },
        attributes: ['id', 'promo_code', 'type', 'value', 'capped_amount'],
        raw: true,
    });

    const promoMap = new Map<string, {
        id: string;
        promo_code: string;
        type: string;
        value: number;
        capped_amount: number | null;
        total_uses: number;
        total_amount_paid: number;
        // Keep every use (do not dedupe) so multiple uses by same purchaser are listed
        users: Array<{
            id: string;
            name: string | null;
            email: string | null;
            username: string | null;
            image_url: string | null;
            parent_user_id: string | null;
            thumbnail_url: string | null;
        }>;
    }>();

    allPromoCodes.forEach((promo: any) => {
            promoMap.set(promo.id, {
                id: promo.id,
                promo_code: promo.promo_code,
                type: promo.type,
                value: Number(promo.value ?? 0),
                capped_amount: promo.capped_amount !== null && promo.capped_amount !== undefined
                    ? Number(promo.capped_amount)
                    : null,
                total_uses: 0,
                total_amount_paid: 0,
            users: [],
            });
    });

    attendeesWithPromo.forEach((att: any) => {
        const promo = att.event_promo_code;
        const user = att.user;
        if (!promo || !user) return;

        // Use parent_user_id to represent purchaser when available; fallback to attendee user id
        const userKey = att.parent_user_id ?? user.id;
        const attendeeName = att.name ?? null;

        const entry = promoMap.get(promo.id)!;
        entry.total_uses += 1;
        entry.total_amount_paid += Number(att.host_payout_amount ?? 0);

        // Push a record per use; use attendee-provided name only (no user profile fallback)
        entry.users.push({
            id: userKey,
            name: attendeeName,
                email: user.email ?? null,
                username: user.username ?? null,
                image_url: user.image_url ?? null,
            parent_user_id: att.parent_user_id ?? null,
                thumbnail_url: user.thumbnail_url ?? null,
            });
    });

    const promo_codes = Array.from(promoMap.values()).map(p => ({
        id: p.id,
        promo_code: p.promo_code,
        type: p.type,
        value: p.value,
        capped_amount: p.capped_amount,
        total_uses: p.total_uses,
        total_amount_paid: p.total_amount_paid,
        users: p.users,
    }));

    // Create enriched event object with analytics merged into tickets
    const enrichedEvent = {
        ...eventPlain,
        tickets: enrichedTickets,
    };

    return {
        event: enrichedEvent,
        summary: {
            total_tickets: totalTickets,
            total_sold: totalSold,
            total_remaining: totalRemaining,
            total_sales: totalSales,
        },
        promo_codes,
    };
};

/**
 * Get analytics for a single ticket, including ticket details and users who purchased it.
 * Supports pagination for the users list and optional searching on related user fields.
 */
export const getTicketAnalytics = async (
    ticketId: string,
    page: number = 1,
    limit: number = 10,
    search?: string
): Promise<{
    ticket: EventTickets & {
        total_sold: number;
        total_amount_paid: number; // calculated from host_payout_amount
        total_platform_fee: number;
    };
    users: Array<{
        id: string;
        user_id: string;
        parent_user_id: string | null;
        name: string | null;
        email: string | null;
        username: string | null;
        image_url: string | null;
        thumbnail_url: string | null;
        total_gamification_points: number;
        company_name: string | null;
    }>;
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
} | null> => {
    // Find the ticket with its parent event
    const ticket = await EventTickets.findOne({
        where: { id: ticketId, is_deleted: false },
        attributes: eventTicketsAttributes
       
    });

    if (!ticket) {
        return null;
    }

    const offset = (page - 1) * limit;

    // Build optional user search filter
    const userWhere: any = { is_deleted: false };
    if (search && search.trim().length > 0) {
        const searchPattern = `%${search.trim()}%`;
        userWhere[Op.or] = [
            { name: { [Op.like]: searchPattern } },
            { username: { [Op.like]: searchPattern } },
            { email: { [Op.like]: searchPattern } },
        ];
    }

    // Get total count of attendees for this ticket (for pagination, with optional user search)
    const totalCount = await EventAttendee.count({
        where: { event_ticket_id: ticketId, is_deleted: false },
        include: [
            {
                model: User,
                as: 'user',
                required: true,
                where: userWhere,
            },
        ],
    });

    // Get all attendees for calculating totals (sales uses host_payout_amount)
    const allAttendeesForTotals = await EventAttendee.findAll({
        where: { event_ticket_id: ticketId, is_deleted: false },
        attributes: ['host_payout_amount', 'platform_fee_amount'],
        include: [
            {
                model: User,
                as: 'user',
                required: true,
                where: { is_deleted: false },
                attributes: [], // Don't fetch user attributes for totals calculation
            },
        ],
    });

    // Calculate totals from all attendees
    let totalSold = 0;
    let totalAmountPaid = 0;
    let totalPlatformFee = 0;

    allAttendeesForTotals.forEach((att: any) => {
        totalSold += 1;
        const amountPaid = Number(att.host_payout_amount ?? 0);
        const platformFee = Number(att.platform_fee_amount ?? 0);
        totalAmountPaid += amountPaid;
        totalPlatformFee += platformFee;
    });

    // Get paginated attendees for this ticket, including user details
    const attendees = await EventAttendee.findAll({
        where: { event_ticket_id: ticketId, is_deleted: false },
        attributes: ['id', 'user_id', 'parent_user_id', 'name', 'host_payout_amount', 'platform_fee_amount', 'created_at'],
        include: [
            {
                model: User,
                as: 'user',
                required: true,
                where: userWhere,
                attributes: userAttributes,
            },
        ],
        order: [['created_at', 'DESC']],
        limit: limit,
        offset: offset,
    });

    // Transform only the paginated attendees
    const attendeesTransformed = attendees.map((att: any) => {
        const user = att.user;

        return {
            user_id: att.user_id,
            parent_user_id: att.parent_user_id ?? null,
            amount_paid: Number(att.host_payout_amount ?? 0),
            platform_fee_amount: Number(att.platform_fee_amount ?? 0),
            created_at: att.created_at,
            user: {
                id: att.id,
                user_id: att.user_id,
                parent_user_id: att.parent_user_id ?? null,
                name: att.name,
                email: !att.parent_user_id  ? user.email ?? null : null,
                username: !att.parent_user_id  ? user.username ?? null : null,
                image_url: !att.parent_user_id  ? user.image_url ?? null : null,
                thumbnail_url: !att.parent_user_id  ? user.thumbnail_url ?? null : null,
                total_gamification_points: !att.parent_user_id  ? user.total_gamification_points ?? 0 : 0,
                company_name: !att.parent_user_id  ? user.company_name ?? null : null,
                total_gamification_points_weekly: !att.parent_user_id  ? user.total_gamification_points_weekly ?? 0 : 0,
            },
        };
    });

    // Flatten to only user information for consumers that just need users list
    const users = attendeesTransformed.map((att) => att.user);

    const ticketPlain = ticket.get({ plain: true }) as any;
    
    return {
        ticket: {...ticketPlain, total_sold: totalSold, total_amount_paid: totalAmountPaid, total_platform_fee: totalPlatformFee},
        users,
        pagination: {
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
        },
    };
};

/**
 * Get ticket analytics data for CSV export (includes full attendee details)
 */
export const getTicketAnalyticsForCSV = async (
    ticketId: string
): Promise<{
    ticket: EventTickets & {
        total_sold: number;
        total_amount_paid: number; // calculated from host_payout_amount
        total_platform_fee: number;
    };
    attendees: Array<{
        id: string;
        amount_paid: number; // calculated from host_payout_amount
        platform_fee_amount: number;
        created_at: Date;
        user: {
            id: string;
            name: string | null;
            email: string | null;
            username: string | null;
            image_url: string | null;
            thumbnail_url: string | null;
        };
    }>;
} | null> => {
    // Find the ticket with its parent event
    const ticket = await EventTickets.findOne({
        where: { id: ticketId, is_deleted: false },
        attributes: eventTicketsAttributes
    });

    if (!ticket) {
        return null;
    }

    // Get all attendees for this ticket, including user
    const attendees = await EventAttendee.findAll({
        where: { event_ticket_id: ticketId, is_deleted: false },
        attributes: ['id', 'host_payout_amount', 'platform_fee_amount', 'created_at'],
        include: [
            {
                model: User,
                as: 'user',
                required: true,
                where: { is_deleted: false },
                attributes: userAttributes,
            },
        ],
        order: [['created_at', 'DESC']],
    });

    // Log for debugging
    loggerService.info(`[getTicketAnalyticsForCSV] Found ${attendees.length} attendees for ticket ${ticketId}`);

    let totalSold = 0;
    let totalAmountPaid = 0;
    let totalPlatformFee = 0;

    const attendeesTransformed = attendees.map((att: any) => {
        totalSold += 1;
        const amountPaid = Number(att.host_payout_amount ?? 0);
        const platformFee = Number(att.platform_fee_amount ?? 0);
        totalAmountPaid += amountPaid;
        totalPlatformFee += platformFee;

        const user = att.user;

        return {
            id: att.id,
            amount_paid: amountPaid,
            platform_fee_amount: platformFee,
            created_at: att.created_at,
            user: {
                id: user.id,
                name: user.name ?? null,
                email: user.email ?? null,
                username: user.username ?? null,
                image_url: user.image_url ?? null,
                thumbnail_url: user.thumbnail_url ?? null,
            },
        };
    });

    const ticketPlain = ticket.get({ plain: true }) as any;
    
    return {
        ticket: {...ticketPlain, total_sold: totalSold, total_amount_paid: totalAmountPaid, total_platform_fee: totalPlatformFee},
        attendees: attendeesTransformed,
    };
};

/**
 * Generate CSV string from ticket analytics data
 */
export const generateTicketAnalyticsCSV = async (
    ticketId: string
): Promise<string | null> => {
    const analytics = await getTicketAnalyticsForCSV(ticketId);
    
    if (!analytics) {
        return null;
    }

    const { ticket, attendees } = analytics;

    // Log for debugging

    // Ticket details headers (for single row at top) - without Ticket ID
    const ticketHeaders = [
        'Ticket Name',
        'Ticket Description',
        'Ticket Price',
        'Ticket Type',
        'Ticket Quantity',
        'Ticket Available Quantity',
        'Ticket Sales Start Date',
        'Ticket Sales End Date',
        'Ticket Order'
    ];

    // User/Attendee headers (for table below) - Sr No instead of User ID, no Attendee ID
    const userHeaders = [
        'Sr No',
        'Name',
        'Email',
        'Username',
        'Amount Paid',
        'Platform Fee',
        'Purchase Date'
    ];

    // Escape CSV field (handle commas, quotes, newlines)
    const escapeCSV = (field: any): string => {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Format date
    const formatDate = (date: Date): string => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // Build ticket details row (single row at top) - without Ticket ID
    const ticketRow = [
        escapeCSV(ticket.name || ''),
        escapeCSV(ticket.description || ''),
        escapeCSV(ticket.price ? Number(ticket.price).toFixed(2) : '0.00'),
        escapeCSV(ticket.ticket_type || ''),
        escapeCSV(ticket.quantity ?? ''),
        escapeCSV(ticket.available_quantity ?? ''),
        escapeCSV(ticket.sales_start_date ? formatDate(ticket.sales_start_date) : ''),
        escapeCSV(ticket.sales_end_date ? formatDate(ticket.sales_end_date) : ''),
        escapeCSV(ticket.order ?? ''),
    ];

    // Build user/attendee rows - ensure we process all attendees
    if (attendees.length === 0) {
        loggerService.warn(`[generateTicketAnalyticsCSV] No attendees found for ticket ${ticketId}`);
    }

    const userRows = attendees.map((attendee, index) => {
        // Safety check for user data
        if (!attendee.user) {
            loggerService.warn(`[generateTicketAnalyticsCSV] Attendee ${attendee.id} has no user data`);
            return null;
        }

        // Serial number starts from 1
        const srNo = index + 1;

        return [
            escapeCSV(srNo), // Sr No instead of User ID
            escapeCSV(attendee.user.name),
            escapeCSV(attendee.user.email),
            escapeCSV(attendee.user.username),
            escapeCSV(attendee.amount_paid.toFixed(2)),
            escapeCSV(attendee.platform_fee_amount.toFixed(2)),
            escapeCSV(formatDate(attendee.created_at)),
        ];
    }).filter(row => row !== null); // Remove any null rows

    // Build CSV structure:
    // 1. Ticket headers row
    // 2. Ticket data row (single row)
    // 3. 2-3 empty rows (spacing)
    // 4. User headers row
    // 5. User data rows
    const csvLines = [
        ticketHeaders.join(','),
        ticketRow.join(','),
        '', // Empty row 1
        '', // Empty row 2
        '', // Empty row 3
        userHeaders.join(','),
        ...userRows.map(row => row.join(','))
    ];

    return csvLines.join('\n');
};

/** Report event */
export const reportEvent = async (
    eventId: string,
    userId: string,
    reportReasonId: string,
    reason: string | null,
    createdBy: string
): Promise<EventReport> => {
    return await EventReport.create({
        event_id: eventId,
        user_id: userId,
        report_reason_id: reportReasonId,
        reason: reason ?? null,
        created_by: createdBy,
    });
};

/** Check if user has already submitted feedback for an event */
export const checkUserAlreadySubmittedFeedback = async (
    eventId: string,
    userId: string,
    eventPhase: string,
    transaction?: Transaction
): Promise<boolean> => {
    const existingFeedback = await EventFeedback.findOne({
        where: {
            user_id: userId,
            event_id: eventId,
            is_deleted: false,
        },
        include: [
            {
                model: EventQuestion,
                as: 'question',
                where: {
                    is_deleted: false,
                    event_phase: eventPhase,
                },
                attributes: ['id'],
                required: true,
            },
        ],
        transaction,
    });

    return !!existingFeedback;
};

/** Save event feedback */
export const saveEventFeedback = async (
    eventId: string,
    userId: string,
    feedbackData: eventFeedbackParams[],
    createdBy: string,
    transaction?: Transaction
): Promise<EventFeedback[]> => {
    const feedbackRows = feedbackData.map((feedback: eventFeedbackParams) => ({
        event_id: eventId,
        user_id: userId,
        question_id: feedback.question_id,
        answer_option_id: feedback.answer_option_id ?? null,
        answer: feedback.answer ?? null,
        created_by: createdBy,
    }));

    return await EventFeedback.bulkCreate(feedbackRows, { transaction });
};

/** Create/update event participant role for a specific user */
export const upsertEventParticipantRole = async (
    eventId: string,
    userId: string,
    role: EventParticipantRole | 'None',
    actorUserId: string,
    transaction: Transaction
): Promise<EventParticipant> => {
    // Fetch an active participant first
    const activeParticipant = await EventParticipant.findOne({
        where: { event_id: eventId, user_id: userId, is_deleted: false },
        transaction,
    });
    // Fetch a soft-deleted participant only if there is no active one
    const deletedParticipant = activeParticipant
        ? null
        : await EventParticipant.findOne({
              where: { event_id: eventId, user_id: userId, is_deleted: true },
              transaction,
          });

    const incrementForRole = async (r: EventParticipantRole) => {
        switch (r) {
            case EventParticipantRole.HOST:
                return userService.incrementUserTotal(userId, 'total_events_hosted', transaction);
            case EventParticipantRole.CO_HOST:
                return userService.incrementUserTotal(userId, 'total_events_cohosted', transaction);
            case EventParticipantRole.SPEAKER:
                return userService.incrementUserTotal(userId, 'total_events_spoken', transaction);
            case EventParticipantRole.SPONSOR:
                return userService.incrementUserTotal(userId, 'total_events_sponsored', transaction);
            case EventParticipantRole.STAFF:
                return userService.incrementUserTotal(userId, 'total_events_staffed', transaction);
        }
    };

    const decrementForRole = async (r: EventParticipantRole) => {
        switch (r) {
            case EventParticipantRole.HOST:
                return userService.decrementUserTotal(userId, 'total_events_hosted', transaction);
            case EventParticipantRole.CO_HOST:
                return userService.decrementUserTotal(userId, 'total_events_cohosted', transaction);
            case EventParticipantRole.SPEAKER:
                return userService.decrementUserTotal(userId, 'total_events_spoken', transaction);
            case EventParticipantRole.SPONSOR:
                return userService.decrementUserTotal(userId, 'total_events_sponsored', transaction);
            case EventParticipantRole.STAFF:
                return userService.decrementUserTotal(userId, 'total_events_staffed', transaction);
        }
    };

    if (role === 'None') {
        if (activeParticipant) {
            await decrementForRole(activeParticipant.role);

            await activeParticipant.update(
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: actorUserId,
                    updated_by: actorUserId,
                },
                { transaction }
            );
            return activeParticipant;
        }

        return deletedParticipant as any;
    }

    // Update existing active participant
    if (activeParticipant) {
        const previousRole = activeParticipant.role;

        if (previousRole !== role) {
            await decrementForRole(previousRole);
            await incrementForRole(role);
        }

        await activeParticipant.update(
            {
                role,
                updated_by: actorUserId,
            },
            { transaction }
        );
        return activeParticipant;
    }

    // Revive soft-deleted row (if any)
    if (deletedParticipant) {
        await deletedParticipant.update(
            {
                role,
                is_deleted: false,
                deleted_at: null,
                deleted_by: null,
                updated_by: actorUserId,
            },
            { transaction }
        );

        await incrementForRole(role);
        return deletedParticipant;
    }

    // Create new participant
    const created = await EventParticipant.create(
        {
            event_id: eventId,
            user_id: userId,
            role,
            created_by: actorUserId,
        },
        { transaction }
    );

    await incrementForRole(role);
    return created;
};

/** Update event with all related entities */
export const updateEvent = async (
    eventId: string,
    params: CreateEventParams,
    updatedBy: string,
    transaction: Transaction,
    updateOptions?: { notify?: boolean }
): Promise<Event> => {
    // Find existing event
    const event = await Event.findOne({
        where: { id: eventId, is_deleted: false },
        transaction,
    });

    if (!event) {
        throw new Error('Event not found');
    }

    // Generate thumbnail from media with order = 1 if medias are provided
    let thumbnail_url: string | null = event.thumbnail_url;
    let image_url: string | null = event.image_url;
    if (params.medias !== undefined && params.medias.length > 0) {
        // Find media with order = 1
        const primaryMedia = params.medias.find((m: MediaParams) => m.order === 1) || params.medias[0];

        if (primaryMedia?.media_url && primaryMedia.media_type === MediaType.IMAGE) {
            // Set image_url to the original media URL
            image_url = primaryMedia.media_url;
            
            try {
                // Remove old thumbnail if it exists
                if (event.thumbnail_url) {
                    removeMediaFile(event.thumbnail_url);
                }

                // Resolve local path from URL
                const { local, cleanup } = await resolveLocalPath(primaryMedia.media_url, MediaContext.EVENT);

                // Generate thumbnail
                const thumbPath = await generateThumbnail(local, MediaContext.EVENT);
                cleanup?.();

                thumbnail_url = thumbPath ? `${env.API_URL}/media/${MediaContext.EVENT}/${path.basename(thumbPath)}` : event.thumbnail_url;
            } catch (error) {
                console.error('Error generating event thumbnail:', error);
                thumbnail_url = event.thumbnail_url;
            }
        } else {
            thumbnail_url = event.thumbnail_url;
        }
    }

    // Update event main fields
    await event.update(
        {
            title: params.title,
            description: params.description ?? null,
            address: params.address ?? null,
            latitude: params.latitude ?? null,
            longitude: params.longitude ?? null,
            city: params.city ?? null,
            state: params.state ?? null,
            country: params.country ?? null,
            category_id: params.category_id,
            is_paid_event: params.is_paid_event ?? false,
            start_date: params.start_date,
            end_date: params.end_date,
            capacity: params.capacity ?? null,
            is_public: params.is_public ?? true,
            // parent_event_id: params.parent_event_id ?? null,
            thumbnail_url,
            image_url,
            updated_by: updatedBy,
        },
        { transaction, ...updateOptions }
    );

    // Prepare all update operations
    const updateOperations: Promise<any>[] = [];

    // Update event vibes
    if (params.vibes !== undefined) {
        updateOperations.push(updateEventVibes(eventId, params.vibes, updatedBy, transaction));
    }

    // Update event settings
    if (params.settings) {
        updateOperations.push(updateEventSettings(eventId, params.settings, updatedBy, transaction));
    }

    // Update event media
    if (params.medias !== undefined) {
        updateOperations.push(updateEventMedias(eventId, params.medias, updatedBy, transaction));
    }

    // Update event tickets
    if (params.tickets !== undefined) {
        updateOperations.push(updateEventTickets(eventId, params.tickets, updatedBy, transaction));
    }

    // Update event promo codes
    if (params.promo_codes !== undefined) {
        updateOperations.push(updateEventPromoCodes(eventId, params.promo_codes, updatedBy, transaction));
    }

    // Update event participants
    if (params.participants !== undefined) {
        updateOperations.push(updateEventParticipants(eventId, params.participants, updatedBy, transaction));
    }

    // Update event questionnaires
    if (params.questionnaire !== undefined) {
        updateOperations.push(updateEventQuestionaries(eventId, params.questionnaire, updatedBy, transaction));
    }

    // Update event-plan mappings
    if (params.plan_ids !== undefined) {
        updateOperations.push(upsertEventPlanMappings(eventId, params.plan_ids, transaction));
    }

    // Execute all update operations in parallel
    if (updateOperations.length > 0) {
        await Promise.all(updateOperations);
    }

    // Recreate post-event reminder if questionnaires were updated or end_date changed
    // This should run after all other operations are complete
    if (params.questionnaire !== undefined || params.end_date !== undefined) {
        await eventReminderService.createPostEventReminder(event, transaction);
    }

    return event;
};

/** Check if user has liked specific events */
export const checkUserLikedEvents = async (eventIds: string[], userId: string | null): Promise<Set<string>> => {
    if (!userId || !eventIds || eventIds.length === 0) {
        return new Set<string>();
    }

    const likedEvents = await EventLike.findAll({
        where: {
            event_id: eventIds,
            user_id: userId,
            is_deleted: false,
        },
        attributes: ['event_id'],
        raw: true,
    });

    return new Set(likedEvents.map((like: EventLike) => like.event_id));
};

/** Check if events have any stripe products (has_plans) */
export const checkEventsHaveStripeProducts = async (eventIds: string[]): Promise<Set<string>> => {
    if (!eventIds || eventIds.length === 0) {
        return new Set<string>();
    }

    const eventProducts = await StripeProductEvent.findAll({
        where: {
            event_id: eventIds,
        },
        attributes: ['event_id'],
        raw: true,
    });

    return new Set(eventProducts.map((ep: any) => ep.event_id));
};

/** Check if user has subscribed to any product for specific events */
export const checkUserSubscribedToEvents = async (eventIds: string[], userId: string | null): Promise<Set<string>> => {
    if (!userId || !eventIds || eventIds.length === 0) {
        return new Set<string>();
    }

    // Get product IDs for these events
    const eventProducts = await StripeProductEvent.findAll({
        where: {
            event_id: eventIds,
        },
        attributes: ['product_id', 'event_id'],
        raw: true,
    });

    if (eventProducts.length === 0) {
        return new Set<string>();
    }

    const productIds = [...new Set(eventProducts.map((ep: any) => ep.product_id))];

    // Check if user has subscribed to any of these products
    const subscriptions = await Subscription.findAll({
        where: {
            user_id: userId,
            is_deleted: false,
            product_id: productIds,
        },
        attributes: ['product_id'],
        raw: true,
    });

    const subscribedProductIds = new Set(subscriptions.map((s: any) => s.product_id));
    
    // Map back to event IDs
    const subscribedEventIds = new Set<string>();
    eventProducts.forEach((ep: any) => {
        if (subscribedProductIds.has(ep.product_id)) {
            subscribedEventIds.add(ep.event_id);
        }
    });

    return subscribedEventIds;
};

/** Transform event object to include is_like flag, has_plans, has_subscribed, and plan_ids */
export const transformEventWithLike = (event: Event, isLiked: boolean = false, hasPlans: boolean = false, hasSubscribed: boolean = false) => {
    if (!event) return event;

    const eventJson = event.toJSON ? event.toJSON() : event;

    // Extract plan_ids from plans array if it exists
    const plan_ids = eventJson.plans && Array.isArray(eventJson.plans) 
        ? eventJson.plans.map((plan: any) => plan.id).filter((id: any) => id)
        : [];

    return {
        ...eventJson,
        promo_codes: Array.isArray(eventJson.promo_codes)
            ? eventJson.promo_codes.map((promoCode: EventPromoCode) => ({
                ...promoCode,
                value: promoCode.value ? Number(promoCode.value) : promoCode.value,
            }))
            : eventJson.promo_codes,
        tickets: Array.isArray(eventJson.tickets)
            ? eventJson.tickets.map((ticket: EventTickets) => ({
                ...ticket,
                price: ticket.price ? Number(ticket.price) : ticket.price,
            }))
            : eventJson.tickets,
        plan_ids,
        is_like: isLiked,
        has_plans: hasPlans,
        has_subscribed: hasSubscribed,
    };
};

/** Transform multiple event objects to include is_like flags, has_plans, and has_subscribed */
export const transformEventsWithLike = async (events: Event[], userId: string | null = null): Promise<Event[]> => {
    if (!events || events.length === 0) return events;

    const eventIds = events.map(event => event.id);
    const [likedEventIds, subscribedEventIds, eventsWithPlansIds] = await Promise.all([
        checkUserLikedEvents(eventIds, userId),
        checkUserSubscribedToEvents(eventIds, userId),
        checkEventsHaveStripeProducts(eventIds),
    ]);

    return events.map(event => transformEventWithLike(
        event, 
        likedEventIds.has(event.id),
        eventsWithPlansIds.has(event.id),
        subscribedEventIds.has(event.id)
    ));
};

/** Get liked events by user with pagination and search */
export const getLikedEventsPaginated = async (
    userId: string,
    page: number = 1,
    limit: number = 10,
    search: string = ''
): Promise<{
    data: Event[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
}> => {
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause for events
    const eventWhereClause: any = {
        is_deleted: false,
    };

    // Search by title (event name)
    if (search) {
        eventWhereClause.title = { [Op.like]: `%${search}%` };
    }

    // Get event IDs that user has liked
    const likedEventIds = await EventLike.findAll({
        where: {
            user_id: userId,
            is_deleted: false,
        },
        attributes: ['event_id'],
        raw: true,
    });

    const eventIds = likedEventIds.map((like: EventLike) => like.event_id);

    if (eventIds.length === 0) {
        return {
            data: [],
            pagination: {
                totalCount: 0,
                currentPage: Number(page),
                totalPages: 0,
            },
        };
    }

    // Add event ID filter
    eventWhereClause.id = { [Op.in]: eventIds };

    const { count, rows: events } = await Event.findAndCountAll({
        attributes: [...eventAttributes, 'created_at'],
        where: eventWhereClause,
        include: includeSettings,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        distinct: true,
        offset,
    });

    return {
        data: events,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get event host by event id */
export const getEventHostByEventId = async (eventId: string) => {
    return await Event.findOne({
        where: { id: eventId, is_deleted: false },
        attributes: ['created_by'],
    });
};

/** Get all events with pagination, search, sorting and filters */
export const getAllEventsPaginated = async (
    page: number = 1,
    limit: number = 10,
    search: string = '',
    orderBy: string = 'start_date',
    orderDirection: string = 'ASC',
    filters?: {
        start_date?: string;
        end_date?: string;
        latitude?: string;
        longitude?: string;
        radius?: number; // in kilometers
        city?: string;
        state?: string;
        country?: string;
        category_id?: string;
        is_paid_event?: boolean;
        is_public?: boolean;
        user_id?: string;
        roles?: string[];
        is_liked?: boolean;
        is_upcoming_event?: boolean;
        is_recommended?: boolean;
        is_live?: boolean;
        is_completed?: boolean;
    },
    authUserId?: string | null
): Promise<{
    data: Event[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
}> => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    // Search by title, description, or address
    if (search) {
        whereClause[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { address: { [Op.like]: `%${search}%` } },
            { city: { [Op.like]: `%${search}%` } },
            { state: { [Op.like]: `%${search}%` } },
            { country: { [Op.like]: `%${search}%` } },
        ];
    }

    // Filter by event date range (skip when is_live or is_completed is set)
    if (filters?.start_date || filters?.end_date) {
        const dateFilter: any = {};

        if (filters.start_date && filters.end_date) {
            // Both dates provided: show events within the date range
            dateFilter[Op.gte] = new Date(filters.start_date);
            dateFilter[Op.lte] = new Date(filters.end_date);
        } else if (filters.start_date) {
            // Only start_date provided: show all future events from that date (event.start_date >= start_date)
            dateFilter[Op.gte] = new Date(filters.start_date);
        } else if (filters.end_date) {
            // Only end_date provided: show events up to that date
            dateFilter[Op.lte] = new Date(filters.end_date);
        }

        whereClause.start_date = dateFilter;
    }

    if (filters?.end_date) {
        whereClause.end_date = { [Op.lte]: new Date(filters.end_date) };
    }

    // Filter: live or completed (mutually exclusive)
    if (filters?.is_live) {
        const now = new Date();
        whereClause.start_date = { [Op.lte]: now };
        whereClause.end_date = { [Op.gte]: now };
    } else if (filters?.is_completed) {
        whereClause.end_date = { [Op.lt]: new Date() };
    }

    // Filter by location (city, state, country)
    if (filters?.city) {
        whereClause.city = { [Op.like]: `%${filters.city}%` };
    }
    if (filters?.state) {
        whereClause.state = { [Op.like]: `%${filters.state}%` };
    }
    if (filters?.country) {
        whereClause.country = { [Op.like]: `%${filters.country}%` };
    }

    // Filter by category
    if (filters?.category_id) {
        whereClause.category_id = filters.category_id;
    }

    // Filter by paid event
    if (filters?.is_paid_event !== undefined) {
        whereClause.is_paid_event = filters.is_paid_event;
    }

    // Filter by public event
    if (filters?.is_public !== undefined) {
        whereClause.is_public = filters.is_public;
    }

    // Filter only upcoming events if requested
    if (filters?.is_upcoming_event) {
        whereClause.start_date = { [Op.gte]: new Date() };
    }

    // Handle radius filter (Haversine formula for distance calculation)
    let attributes: any = eventAttributes;
    let order: any[] = [];

    // Filter for recommended events (public events with future end_date)
    if (filters?.is_recommended) {
        whereClause.is_public = true;
        // whereClause.end_date = { [Op.gte]: new Date() };
    }

    if (filters?.latitude && filters?.longitude && filters?.radius) {
        const lat = parseFloat(filters.latitude);
        const lng = parseFloat(filters.longitude);
        const radiusKm = filters.radius;

        // Haversine formula: distance = 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) * sin(radians(lat2)))
        // Create reusable distance calculation expression
        const distanceCalculation = `(
            6371 * acos(
                cos(radians(${lat})) * 
                cos(radians(CAST(\`Event\`.\`latitude\` AS DECIMAL(10, 8)))) * 
                cos(radians(CAST(\`Event\`.\`longitude\` AS DECIMAL(11, 8))) - radians(${lng})) + 
                sin(radians(${lat})) * 
                sin(radians(CAST(\`Event\`.\`latitude\` AS DECIMAL(10, 8))))
            )
        )`;

        // Add distance to attributes for SELECT
        attributes = [
            ...eventAttributes,
            [Sequelize.literal(distanceCalculation), 'distance']
        ];

        // Add distance filter to WHERE clause instead of HAVING to work with COUNT queries
        const distanceCondition = Sequelize.literal(`${distanceCalculation} <= ${radiusKm}`);

        // Only include events with valid coordinates
        const coordinateConditions: any[] = [
            { latitude: { [Op.ne]: null } },
            { latitude: { [Op.ne]: '' } },
            { longitude: { [Op.ne]: null } },
            { longitude: { [Op.ne]: '' } },
            distanceCondition
        ];

        if (whereClause[Op.and]) {
            whereClause[Op.and].push(...coordinateConditions);
        } else {
            whereClause[Op.and] = coordinateConditions;
        }

        // Custom ordering: upcoming events first (closest to current date), then older events
        const now = new Date();
        
        // Create a custom order that prioritizes upcoming events
        if (filters?.is_recommended) {
            // For recommended events, use the custom ordering
            order = [
                [
                    Sequelize.literal(`CASE 
                        WHEN start_date >= '${now.toISOString()}' THEN start_date 
                        ELSE '9999-12-31'
                    END`), 'ASC'
                ],
                ['start_date', 'ASC']
            ];
        } else if (filters?.latitude && filters?.longitude && filters?.radius) {
            // For location-based search, apply custom ordering with distance
            if (orderBy === 'distance') {
                order = [
                    [
                        Sequelize.literal(`CASE 
                            WHEN start_date >= '${now.toISOString()}' THEN start_date 
                            ELSE '9999-12-31'
                        END`), 'ASC'
                    ],
                    [Sequelize.literal('distance'), orderDirection as 'ASC' | 'DESC']
                ];
            } else {
                order = [
                    [
                        Sequelize.literal(`CASE 
                            WHEN start_date >= '${now.toISOString()}' THEN start_date 
                            ELSE '9999-12-31'
                        END`), 'ASC'
                    ],
                    [orderBy, orderDirection as 'ASC' | 'DESC'],
                    [Sequelize.literal('distance'), 'ASC']
                ];
            }
        } else {
            // Default custom ordering
            order = [
                [
                    Sequelize.literal(`CASE 
                        WHEN start_date >= '${now.toISOString()}' THEN start_date 
                        ELSE '9999-12-31'
                    END`), 'ASC'
                ],
                [orderBy, orderDirection as 'ASC' | 'DESC']
            ];
        }

    } else {
        // Default custom ordering (when not using location-based search)
        const now = new Date();
        
        // Create a custom order that prioritizes upcoming events
        if (filters?.is_recommended) {
            // For recommended events, use the custom ordering
            order = [
                [
                    Sequelize.literal(`CASE 
                        WHEN start_date >= '${now.toISOString()}' THEN start_date 
                        ELSE '9999-12-31'
                    END`), 'ASC'
                ],
                ['start_date', 'ASC']
            ];
        } else {
            // Default custom ordering
            order = [
                [
                    Sequelize.literal(`CASE 
                        WHEN start_date >= '${now.toISOString()}' THEN start_date 
                        ELSE '9999-12-31'
                    END`), 'ASC'
                ],
                [orderBy, orderDirection as 'ASC' | 'DESC']
            ];
        }
    }

    // Filter by user_id and roles (works with all other filters)
    if (filters?.user_id) {
        const userId = filters.user_id;
        const roles = filters.roles;
        const normalizedRoles = roles?.map(r => r.toLowerCase());
        const hasHostRole = normalizedRoles?.includes('host');
        const hasAttendeeRole = normalizedRoles?.includes('attendees');
        const participantRoles = normalizedRoles?.filter(
            r => r !== 'host' && r !== 'attendees'
        );

        // Fetch event IDs from EventParticipant / EventAttendee
        const getEventIds = async (): Promise<string[]> => {
            const eventIds: string[] = [];

            if (!roles?.length || (participantRoles?.length && participantRoles?.length > 0)) {
                const participantEvents = await EventParticipant.findAll({
                    where: {
                        user_id: userId,
                        is_deleted: false,
                        ...(participantRoles?.length && { role: { [Op.in]: participantRoles } }),
                    },
                    attributes: ['event_id'],
                });
                eventIds.push(...participantEvents.map(p => p.event_id));
            }

            if (!roles?.length || hasAttendeeRole) {
                const attendeeEvents = await EventAttendee.findAll({
                    where: {
                        user_id: userId,
                        is_deleted: false,
                    },
                    attributes: ['event_id'],
                });
                eventIds.push(...attendeeEvents.map(a => a.event_id));
            }

            return [...new Set(eventIds)];
        };

        const eventIds = await getEventIds();
        const conditions: any[] = [];

        if (!roles?.length || hasHostRole) {
            conditions.push({ created_by: userId });
        }

        if (eventIds.length) {
            conditions.push({ id: { [Op.in]: eventIds } });
        }

        if (conditions.length > 0) {
            // Add user filter condition - combine with existing whereClause using AND
            const userFilterCondition = { [Op.or]: conditions };
            
            if (whereClause[Op.and]) {
                whereClause[Op.and].push(userFilterCondition);
            } else {
                // Check if whereClause has Op.or (from search)
                if (whereClause[Op.or]) {
                    const existingOr = whereClause[Op.or];
                    delete whereClause[Op.or];
                    whereClause[Op.and] = [{ [Op.or]: existingOr }, userFilterCondition];
                } else {
                    whereClause[Op.and] = [{ ...whereClause }, userFilterCondition];
                }
            }
        } else if (roles?.length) {
            // If roles specified but no events found, return empty
            return {
                data: [],
                pagination: {
                    totalCount: 0,
                    currentPage: Number(page),
                    totalPages: 0,
                },
            };
        }
    }

    // Filter by is_liked (works with all other filters, requires authUserId)
    if (filters?.is_liked && authUserId) {
        const likedEventIds = await EventLike.findAll({
            where: {
                user_id: authUserId,
                is_deleted: false,
            },
            attributes: ['event_id'],
            raw: true,
        });

        const eventIds = likedEventIds.map((like: EventLike) => like.event_id);

        if (eventIds.length === 0) {
            // No liked events, return empty
            return {
                data: [],
                pagination: {
                    totalCount: 0,
                    currentPage: Number(page),
                    totalPages: 0,
                },
            };
        }

        // Add liked events filter - combine with existing whereClause using AND
        const likedFilterCondition = { id: { [Op.in]: eventIds } };
        
        if (whereClause[Op.and]) {
            whereClause[Op.and].push(likedFilterCondition);
        } else {
            // Check if whereClause has Op.or (from search)
            if (whereClause[Op.or]) {
                const existingOr = whereClause[Op.or];
                delete whereClause[Op.or];
                whereClause[Op.and] = [{ [Op.or]: existingOr }, likedFilterCondition];
            } else {
                whereClause[Op.and] = [{ ...whereClause }, likedFilterCondition];
            }
        }
    }

    // Build include array - always include host participant; if authUserId present also include that user's participant and attendees
    const includeArray: IncludeOptions[] = [...includeSettings];

    const participantWhere: any = {
        is_deleted: false,
        ...(authUserId
            ? { [Op.or]: [{ role: EventParticipantRole.HOST }, { user_id: authUserId }] }
            : { role: EventParticipantRole.HOST }),
    };
    includeArray.push({
        model: EventParticipant,
        attributes: eventParticipantAttributes,
        as: 'participants',
        required: false,
        where: participantWhere,
        include: [{
            model: User,
            as: 'user',
            required: false,
            where: { is_deleted: false },
            attributes: userAttributes,
        }]
    });

    if (authUserId) {
        includeArray.push(
            {
            model: EventAttendee,
            as: 'attendees',
            required: false,
            where: {
                is_deleted: false,
                user_id: authUserId
            },
            attributes: eventAttendeeAttributes,
            include: [{
                model: User,
                as: 'user',
                required: false,
                where: { is_deleted: false },
                attributes: userAttributes,
            }]
        }
    );
    }

    const { count, rows: events } = await Event.findAndCountAll({
        attributes,
        include: includeArray,
        where: whereClause,
        order,
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: events,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get all previous event attendees */
export const getPreviousEventAttendees = async (page: number = 1, limit: number = 10, userId?: string, eventId?: string): Promise<{
    data: User[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
}> => {
    const offset = (Number(page) - 1) * Number(limit);
    const currentDate = new Date();

    const userWhere: any = {
        is_deleted: false,
    };

    if (userId) {
        userWhere.id = userId;
    }

    const eventAttendeeWhere: any = {
        is_deleted: false,
    };

    if (eventId) {
        eventAttendeeWhere.event_id = eventId;
    }

    const { count, rows: attendees } = await User.findAndCountAll({
        where: userWhere,
        attributes: userAttributes,
        include: [
            {
                model: EventAttendee,
                as: 'event_attendances',
                required: true,
                where: eventAttendeeWhere,
                attributes: [],
                include: [
                    {
                        model: Event,
                        as: 'event',
                        required: true,
                        where: {
                            is_deleted: false,
                            end_date: { [Op.lt]: currentDate },
                        },
                        attributes: [],
                    },
                ],
            },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
        subQuery: false,
    });

    return {
        data: attendees,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get event settings */
export const getEventSettings = async (eventId: string): Promise<EventSetting | null> => {
    return await EventSetting.findOne({
        where: { event_id: eventId, is_deleted: false },
    });
};

/** Delete event */
export const deleteEvent = async (eventId: string, deletedBy: string, transaction: Transaction): Promise<boolean> => {
    await Event.update(
        {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedBy,
        },
        {
            where: { id: eventId, is_deleted: false },
            transaction
        }
    );

    return true;
};

const getCityStateImage = async (city: string, state: string): Promise<{ image_url: string | null; thumbnail_url: string | null }> => {
    try {
      const query = `${city}, ${state} city`;
  
      const response = await axios.get(
        "https://api.unsplash.com/search/photos",
        {
          params: {
            query,
            per_page: 1,
            orientation: "landscape",
            client_id: env.UNSPLASH_API_KEY
          },
        }
      );
  
      if (response.data.results.length === 0) {
        return { image_url: null, thumbnail_url: null };
      }
      
      const photo = response.data.results[0];
      return {
        image_url: photo.urls?.regular || null,
        thumbnail_url: photo.urls?.thumb || photo.urls?.small || null
      };
    } catch (error: any) {
      loggerService.error(`getCityStateImage error: ${error.message}`);
      return { image_url: null, thumbnail_url: null };
    }
}

/** Get top cities with event counts and images */
export const getTopCitiesWithEventCount = async (): Promise<Array<{ city: string; state: string; event_count: number; image_url: string; thumbnail_url: string }>> => {
    const cities = await Event.findAll({
        attributes: [
            'city',
            'state',
            [Sequelize.fn('COUNT', Sequelize.col('Event.id')), 'event_count']
        ],
        where: {
            // is_public: true,
            is_deleted: false,
            city: { [Op.ne]: null },
            state: { [Op.ne]: null },
            end_date: { [Op.gte]: new Date() },
        },
        group: ['Event.city', 'Event.state'],
        order: [[Sequelize.literal('COUNT(Event.id)'), 'DESC']],
        raw: true,
    });

    // Fetch images for all cities in parallel
    const fallbackImage = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop&q=80';
    const fallbackThumbnail = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=200&h=200&fit=crop&q=80';
    const citiesWithImages = await Promise.all(
        cities.map(async (city: any): Promise<{ city: string; state: string; event_count: number; image_url: string; thumbnail_url: string }> => {
            const images = await getCityStateImage(city.city, city.state);
            return {
                city: city.city,
                state: city.state,
                image_url: images.image_url ?? fallbackImage,
                thumbnail_url: images.thumbnail_url ?? fallbackThumbnail,
                event_count: parseInt(city.event_count, 10),
            };
        })
    );

    return citiesWithImages;
};

/** Get event questions by event ID and event phase with users who attended */
export const getEventQuestionsWithAttendees = async (
    eventId: string,
    eventPhase: string,
    page: number = 1,
    limit: number = 10,
    search?: string
): Promise<{
    users: Array<{
        id: string;
        name: string | null;
        email: string | null;
        username: string | null;
        image_url: string | null;
        thumbnail_url: string | null;
        total_gamification_points: number;
        total_gamification_points_weekly: number;
        company_name: string | null;
        submitted_at: Date | null;
    }>;
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
} | null> => {
    // Verify event exists
    const event = await Event.findOne({
        where: { id: eventId, is_deleted: false },
        attributes: ['id'],
    });

    if (!event) {
        return null;
    }

    // Get question IDs for this event with the specified event_phase
    const questions = await EventQuestion.findAll({
        where: {
            event_id: eventId,
            event_phase: eventPhase,
            is_deleted: false,
        },
        attributes: ['id'],
    });

    if (questions.length === 0) {
        return {
            users: [],
            pagination: {
                totalCount: 0,
                currentPage: Number(page),
                totalPages: 0,
            },
        };
    }

    // Get question IDs for filtering feedbacks
    const questionIds = questions.map(q => q.id);
    
    // Get distinct user IDs who have submitted feedback for these questions,
    // along with when they submitted (created_at)
    const feedbacks = await EventFeedback.findAll({
        where: {
            event_id: eventId,
            question_id: { [Op.in]: questionIds },
            is_deleted: false,
        },
        attributes: ['user_id', 'created_at'],
        raw: true,
    });

    // Build map of user_id -> latest submitted time
    const userSubmittedAtMap = new Map<string, Date>();
    feedbacks.forEach((row: any) => {
        if (!row.user_id || !row.created_at) return;
        const existing = userSubmittedAtMap.get(row.user_id);
        const current = new Date(row.created_at);
        if (!existing || current > existing) {
            userSubmittedAtMap.set(row.user_id, current);
        }
    });

    // Get unique user IDs using Set
    const userIds = [...userSubmittedAtMap.keys()];

    // Get user details with optional search and pagination
    let users: Array<{
        id: string;
        name: string | null;
        email: string | null;
        username: string | null;
        image_url: string | null;
        thumbnail_url: string | null;
        total_gamification_points: number;
        total_gamification_points_weekly: number;
        company_name: string | null;
        submitted_at: Date | null;
    }> = [];
    let totalCount = 0;

    if (userIds.length > 0) {
        const userWhere: any = {
            id: { [Op.in]: userIds },
                is_deleted: false,
        };

        if (search && search.trim().length > 0) {
            const searchPattern = `%${search.trim()}%`;
            userWhere[Op.or] = [
                { name: { [Op.like]: searchPattern } },
                { username: { [Op.like]: searchPattern } },
                { email: { [Op.like]: searchPattern } },
                { mobile: { [Op.like]: searchPattern } },
            ];
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows: userRecords, count } = await User.findAndCountAll({
            where: userWhere,
            attributes: userAttributes,
            order: [['created_at', 'DESC']],
            limit: Number(limit),
            offset,
        });

        users = userRecords.map((user: any) => ({
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            username: user.username ?? null,
            image_url: user.image_url ?? null,
            thumbnail_url: user.thumbnail_url ?? null,
            total_gamification_points: user.total_gamification_points ?? 0,
            total_gamification_points_weekly: user.total_gamification_points_weekly ?? 0,
            company_name: user.company_name ?? null,
            submitted_at: userSubmittedAtMap.get(user.id) ?? null,
        }));

        totalCount = Number(count);
    }

    return {
        users,
        pagination: {
            totalCount,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
    };
};

/** Get questions and answers given by a user for a specific event */
export const getUserEventQuestionsAndAnswers = async (
    userId: string,
    eventId: string,
    eventPhase?: string
): Promise<{
    questions: Array<{
        id: string;
        question: string;
        event_phase: string;
        question_type: string;
        is_required: boolean;
        max: number | null;
        min: number | null;
        rating_scale: number | null;
        is_public: boolean;
        order: number;
        options?: Array<{
            id: string;
            option: string;
            order: number;
        }>;
        answer: string | null;
        answer_option_id: string | null;
        answer_option?: {
            id: string;
            option: string;
            order: number;
        } | null;
        answer_option_ids: string[];
        answer_options: Array<{
            id: string;
            option: string;
            order: number;
        }>;
    }>;
} | null> => {
    // Verify event exists
    const event = await Event.findOne({
        where: { id: eventId, is_deleted: false },
        attributes: ['id'],
    });
    if (!event) {
        return null;
    }

    // Verify user exists
    const user = await User.findOne({
        where: { id: userId, is_deleted: false },
        attributes: ['id'],
    });
    if (!user) {
        return null;
    }

    // Build where clause for questions
    const questionWhereClause: any = {
        event_id: eventId,
        is_deleted: false,
    };

    // Filter by event_phase if provided
    if (eventPhase) {
        questionWhereClause.event_phase = eventPhase;
    }

    // Get all questions for this event (optionally filtered by event_phase)
    const questions = await EventQuestion.findAll({
        where: questionWhereClause,
        attributes: eventQuestionAttributes,
        include: [{
            model: EventQuestionOption,
            as: 'options',
            required: false,
            where: { is_deleted: false },
            attributes: eventQuestionOptionAttributes,
            separate: true,
            order: [['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
        }],
        order: [['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
    });

    if (questions.length === 0) {
        return {
            questions: [],
        };
    }

    // Get all feedbacks for this user and event
    const feedbacks = await EventFeedback.findAll({
        where: {
            event_id: eventId,
            user_id: userId,
            is_deleted: false,
        },
        attributes: eventFeedbackAttributes,
        include: [{
            model: EventQuestionOption,
            as: 'answer_option',
            required: false,
            where: { is_deleted: false },
            attributes: eventQuestionOptionAttributes,
        }],
    });

    // Map question_id -> all feedbacks (multiple choice can have multiple rows per question)
    const feedbackMap = new Map<string, any[]>();
    feedbacks.forEach((feedback: any) => {
        const qId = feedback.question_id;
        if (!feedbackMap.has(qId)) feedbackMap.set(qId, []);
        feedbackMap.get(qId)!.push(feedback);
    });

    // Build common response shape for every question (single + array fields)
    const questionsWithAnswers = questions.map((question: any) => {
        const questionPlain = question.get({ plain: true });
        const questionFeedbacks = feedbackMap.get(questionPlain.id) || [];
        const isMultipleChoice = questionPlain.question_type === QuestionType.MULTIPLE_CHOICE;

        // Always compute array fields (all selected options)
        const answer_option_ids = questionFeedbacks.map((f: any) => f.answer_option_id).filter(Boolean);
        const answer_options = questionFeedbacks
            .filter((f: any) => f.answer_option)
            .map((f: any) => ({
                id: f.answer_option.id,
                option: f.answer_option.option,
                order: f.answer_option.order,
            }));

        // Single-option fields (first feedback for single choice, null for multiple when using arrays)
        const firstFeedback = questionFeedbacks[0];
        const answer = firstFeedback?.answer ?? null;
        const answer_option_id = isMultipleChoice ? null : (firstFeedback?.answer_option_id ?? null);
        const answer_option = isMultipleChoice
            ? null
            : firstFeedback?.answer_option
                ? {
                      id: firstFeedback.answer_option.id,
                      option: firstFeedback.answer_option.option,
                      order: firstFeedback.answer_option.order,
                  }
                : null;

        return {
            id: questionPlain.id,
            question: questionPlain.question,
            event_phase: questionPlain.event_phase,
            question_type: questionPlain.question_type,
            is_required: questionPlain.is_required,
            max: questionPlain.max,
            min: questionPlain.min,
            rating_scale: questionPlain.rating_scale,
            is_public: questionPlain.is_public,
            order: questionPlain.order,
            options: questionPlain.options?.map((opt: any) => ({
                id: opt.id,
                option: opt.option,
                order: opt.order,
            })) || [],
            answer,
            answer_option_id,
            answer_option,
            answer_option_ids,
            answer_options,
        };
    });

    return {
        questions: questionsWithAnswers,
    };
};

/** Get question analysis for single choice, multiple choice, and rating scale questions. If eventPhase is omitted, returns both PreEvent and PostEvent questionnaires. */
export const getQuestionAnalysis = async (
    eventId: string,
    eventPhase?: string
): Promise<{
    total_responses: number;
    questions: Array<{
        id: string;
        question: string;
        event_phase: string;
        question_type: string;
        is_required: boolean;
        is_public: boolean;
        order: number;
        rating_scale: number | null;
        options: Array<{
            id: string | null;
            option: string;
            order: number;
            selected_count: number;
        }>;
    }>;
} | null> => {
    // Verify event exists
    const event = await Event.findOne({
        where: { id: eventId, is_deleted: false },
        attributes: ['id'],
    });

    if (!event) {
        return null;
    }

    // Get questions filtered by event_id, event_phase (or both PreEvent and PostEvent if not specified), and question_type
    const phaseFilter = eventPhase
        ? { event_phase: eventPhase }
        : { event_phase: { [Op.in]: ['PreEvent', 'PostEvent'] } };
    const questions = await EventQuestion.findAll({
        where: {
            event_id: eventId,
            ...phaseFilter,
            question_type: { [Op.in]: [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.RATING] },
            is_deleted: false,
        },
        attributes: eventQuestionAttributes,
        include: [{
            model: EventQuestionOption,
            as: 'options',
            required: false,
            where: { is_deleted: false },
            attributes: eventQuestionOptionAttributes,
            separate: true,
            order: [['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
        }],
        order: [['event_phase', 'ASC'], ['order', 'ASC']] as [string, 'ASC' | 'DESC'][],
    });

    if (questions.length === 0) {
        return {
            total_responses: 0,
            questions: [],
        };
    }

    const questionIds = questions.map(q => q.id);

    // Build a map of question id to its type for proper analysis
    const questionTypeMap = new Map<string, QuestionType>();
    questions.forEach((q: any) => {
        const plain = q.get({ plain: true });
        questionTypeMap.set(plain.id, plain.question_type);
    });

    // Get all feedbacks for these questions
    const feedbacks = await EventFeedback.findAll({
        where: {
            event_id: eventId,
            question_id: { [Op.in]: questionIds },
            is_deleted: false,
        },
        attributes: ['question_id', 'answer_option_id', 'answer', 'user_id'],
        raw: true,
    });

    // Count total unique users who responded (count unique user_id per question)
    const questionUserMap = new Map<string, Set<string>>();
    feedbacks.forEach((feedback: any) => {
        const questionId = feedback.question_id;
        const userId = feedback.user_id;
        if (!questionUserMap.has(questionId)) {
            questionUserMap.set(questionId, new Set());
        }
        questionUserMap.get(questionId)!.add(userId);
    });
    
    // Calculate total responses (unique users across all questions)
    const allUserIds = new Set<string>();
    questionUserMap.forEach((userSet) => {
        userSet.forEach((userId) => allUserIds.add(userId));
    });
    const totalResponses = allUserIds.size;

    // Create a map to count selections per question and option/value
    const optionCountMap = new Map<string, Map<string | number, number>>();

    feedbacks.forEach((feedback: any) => {
        const questionId = feedback.question_id as string;
        const answerOptionId = feedback.answer_option_id as string | null;
        const answer = feedback.answer as string | null;
        const questionType = questionTypeMap.get(questionId);

        if (!optionCountMap.has(questionId)) {
            optionCountMap.set(questionId, new Map());
        }

        const questionOptionMap = optionCountMap.get(questionId)!;

        // For rating scale questions, use the numeric answer value
        if (questionType === QuestionType.RATING && answer && !isNaN(Number(answer))) {
            const ratingValue = Number(answer);
            const currentCount = questionOptionMap.get(ratingValue) || 0;
            questionOptionMap.set(ratingValue, currentCount + 1);
        }
        // For single/multiple choice questions, count by option id
        else if (
            (questionType === QuestionType.SINGLE_CHOICE || questionType === QuestionType.MULTIPLE_CHOICE) &&
            answerOptionId
        ) {
            const currentCount = questionOptionMap.get(answerOptionId) || 0;
            questionOptionMap.set(answerOptionId, currentCount + 1);
        }
    });

    // Transform questions with option counts
    const questionsWithAnalysis = questions.map((question: any) => {
        const questionPlain = question.get({ plain: true });
        const questionOptionCounts = optionCountMap.get(questionPlain.id) || new Map();

        let options: Array<{
            id: string | null;
            option: string;
            order: number;
            selected_count: number;
        }> = [];

        // For rating scale questions, generate options from 1 to rating_scale
        if (questionPlain.question_type === QuestionType.RATING && questionPlain.rating_scale) {
            const ratingScale = questionPlain.rating_scale;
            for (let i = 1; i <= ratingScale; i++) {
                options.push({
                    id: null,
                    option: i.toString(),
                    order: i,
                    selected_count: questionOptionCounts.get(i) || 0,
                });
            }
        }
        // For single/multiple choice questions, use the question options
        else if (questionPlain.options && questionPlain.options.length > 0) {
            options = questionPlain.options.map((opt: any) => ({
                id: opt.id,
                option: opt.option,
                order: opt.order,
                selected_count: questionOptionCounts.get(opt.id) || 0,
            }));
        }

        return {
            id: questionPlain.id,
            question: questionPlain.question,
            event_phase: questionPlain.event_phase,
            question_type: questionPlain.question_type,
            is_required: questionPlain.is_required,
            is_public: questionPlain.is_public,
            order: questionPlain.order,
            rating_scale: questionPlain.rating_scale,
            options: options.sort((a, b) => a.order - b.order),
        };
    });

    return {
        total_responses: totalResponses,
        questions: questionsWithAnalysis,
    };
};

/** Get users who selected a specific option for a question (with pagination) */
export const getUsersByQuestionOption = async (
    questionId: string,
    optionId: string | null,
    optionValue: string | null,
    page: number = 1,
    limit: number = 10,
    authUserId: string | null = null
): Promise<{
    users: Array<{
        id: string;
        name: string | null;
        email: string | null;
        username: string | null;
        image_url: string | null;
        thumbnail_url: string | null;
        connection_status: string;
    }>;
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
} | null> => {
    // Verify question exists
    const question = await EventQuestion.findOne({
        where: { id: questionId, is_deleted: false },
        attributes: ['id', 'question', 'question_type', 'rating_scale'],
    });


    if (!question) {
        return null;
    }

    const questionPlain = question.get({ plain: true });
    const questionType = questionPlain.question_type;

    // For single/multiple choice questions, return users with pagination
    if ((questionType === QuestionType.SINGLE_CHOICE || questionType === QuestionType.MULTIPLE_CHOICE) && optionId) {
        // Build where clause for feedbacks
        const feedbackWhereClause: any = {
            question_id: questionId,
            answer_option_id: optionId,
            is_deleted: false,
        };

        // Get all feedbacks to count unique users
        const allFeedbacks = await EventFeedback.findAll({
            where: feedbackWhereClause,
            attributes: ['user_id'],
            include: [{
                model: User,
                as: 'user',
                required: true,
                where: { is_deleted: false },
            }],
            raw: false,
        });
        console.log('allFeedbacks', allFeedbacks);
        // Count unique users
        const uniqueUserIds = new Set<string>();
        allFeedbacks.forEach((feedback: any) => {
            if (feedback.user && feedback.user.id) {
                uniqueUserIds.add(feedback.user.id);
            }
        });
        const totalCount = uniqueUserIds.size;
        // Get unique user IDs first
        const uniqueUserIdsArray = Array.from(uniqueUserIds);
        // Calculate pagination
        const offset = (Number(page) - 1) * Number(limit);
        const paginatedUserIds = uniqueUserIdsArray.slice(offset, offset + Number(limit));

        // Get user details for paginated user IDs
        let users: Array<{
            id: string;
            name: string | null;
            email: string | null;
            username: string | null;
            image_url: string | null;
            thumbnail_url: string | null;
            connection_status: string;
        }> = [];

        if (paginatedUserIds.length > 0) {
            const userRecords = await User.findAll({
                where: {
                    id: { [Op.in]: paginatedUserIds },
                    is_deleted: false,
                },
                attributes: userAttributes,
            });

            // Add connection status to users and map to final format
            let usersSource: any[];
            if (authUserId && userRecords.length > 0) {
                usersSource = await userService.addConnectionStatusToUsers(
                    userRecords,
                    authUserId,
                    true
                );
            } else {
                usersSource = userRecords.map((user: any) => {
                    const userPlain = user.toJSON ? user.toJSON() : user;
                    return {
                        ...userPlain,
                        connection_status: 'NOT_CONNECTED',
                    };
                });
            }

            users = usersSource.map((user: any) => ({
                id: user.id,
                name: user.name ?? null,
                email: user.email ?? null,
                username: user.username ?? null,
                image_url: user.image_url ?? null,
                thumbnail_url: user.thumbnail_url ?? null,
                company_name: user.company_name ?? null,
                total_gamification_points: user.total_gamification_points ?? null,
                total_gamification_points_weekly: user.total_gamification_points_weekly ?? null,
                connection_status: user.connection_status ?? 'NOT_CONNECTED',
            }));
        }

        return {
            users,
            pagination: {
                totalCount,
                currentPage: Number(page),
                totalPages: Math.ceil(totalCount / Number(limit)),
            },
        };
    }

    // Invalid parameters
    return null;
};

/** Get event attendees with pagination and search */
export const getEventAttendeesPaginated = async (
    eventId: string,
    authUserId: string | null,
    options: { page?: number; limit?: number; search?: string; rsvp_status?: string[]; order_by?: string; order_direction?: string }
): Promise<any> => {
    const { page = 1, limit = 10, search = '', rsvp_status = [], order_by = 'created_at', order_direction = 'DESC' } = options;
    const offset = (page - 1) * limit;

    // Build where clause for search
    const searchWhereClause: any = {};
    if (search) {
        searchWhereClause[Op.or] = [
            { '$user.name$': { [Op.like]: `%${search}%` } },
            { '$user.email$': { [Op.like]: `%${search}%` } },
            { '$user.mobile$': { [Op.like]: `%${search}%` } },
            { '$user.username$': { [Op.like]: `%${search}%` } },
            // Search in EventAttendee.name for additional guests (when parent_user_id is not null)
            {
                [Op.and]: [
                    { parent_user_id: { [Op.ne]: null } },
                    { name: { [Op.like]: `%${search}%` } }
                ]
            }
        ];
    }

    // Get attendees
    const attendeeWhereClause: any = {
        event_id: eventId,
        is_deleted: false,
        ...searchWhereClause,
    };

    if (rsvp_status.length > 0) {
        attendeeWhereClause.rsvp_status = { [Op.in]: rsvp_status };
    }

    const attendeeResults = await Promise.all([
        EventAttendee.findAll({
            where: attendeeWhereClause,
            include: [
                {
                    as: 'user',
                    model: User,
                    required: false,
                    attributes: userAttributes,
                    where: { is_deleted: false },
                },
                {
                    required: false,
                    as: 'event_ticket',
                    model: EventTickets,
                    attributes: eventTicketsAttributes,
                },
            ],
            attributes: eventAttendeeAttributes,
            order: [[{ model: User, as: 'user' }, order_by === 'name' ? 'name' : 'created_at', order_direction]],
            limit,
            offset,
        }),

        EventAttendee.count({
            where: attendeeWhereClause,
            include: [{
                model: User,
                as: 'user',
                required: false,
                where: { is_deleted: false },
            }],
        }),

        EventAttendee.count({ where: { event_id: eventId, rsvp_status: 'Yes', is_deleted: false } }),
        EventAttendee.count({ where: { event_id: eventId, rsvp_status: 'Maybe', is_deleted: false } }),
        EventAttendee.count({ where: { event_id: eventId, rsvp_status: 'No', is_deleted: false } }),
    ]);

    let attendees = attendeeResults[0];
    const attendeeCount = attendeeResults[1];
    const totalYesGuest = attendeeResults[2];
    const totalMaybeGuest = attendeeResults[3];
    const totalNoGuest = attendeeResults[4];

    // Add connection status if authenticated user
    if (authUserId && attendees.length > 0) {
        // Convert attendees to plain objects
        const plainAttendees = attendees.map(attendee => attendee.toJSON ? attendee.toJSON() : attendee);
        
        // Extract user objects from attendees - ensure we have plain objects
        const userObjects = plainAttendees
            .map(a => {
                const user = a.user;
                return user && typeof user === 'object' ? user : null;
            })
            .filter(user => user && user.id);
        
        if (userObjects.length > 0) {
            try {
                const usersWithStatus = await userService.addConnectionStatusToUsers(
                    userObjects,
                    authUserId,
                    false
                );
                
                // Create a map of user IDs to connection status
                const statusMap = new Map(
                    usersWithStatus.map(user => [user.id, user.connection_status])
                );
                
                // Add connection status to plain attendees (inside user object)
                plainAttendees.forEach(attendee => {
                    if (attendee.user_id && statusMap.has(attendee.user_id)) {
                        attendee.user.connection_status = statusMap.get(attendee.user_id);
                    }
                });
                
                // Replace original attendees with plain attendees
                attendees = plainAttendees;
            } catch (error) {
                console.error('Error adding connection status to attendees:', error);
            }
        }
    }

    return {
        data: attendees,
        pagination: {
            currentPage: page,
            totalCount: attendeeCount,
            totalPages: Math.ceil(attendeeCount / limit),
        },
        summary: {
            total_no_guest: totalNoGuest,
            total_yes_guest: totalYesGuest,
            total_maybe_guest: totalMaybeGuest,
        },
    };
};

/** Get event participants (hosts, cohosts, speakers, sponsors, staff) with pagination and search */
export const getEventParticipantsPaginated = async (
    eventId: string,
    authUserId: string | null,
    options: { page?: number; limit?: number; search?: string; role?: string[]; order_by?: string; order_direction?: string }
): Promise<any> => {
    const { page = 1, limit = 10, search = '', role = [], order_by = 'created_at', order_direction = 'DESC' } = options;
    const offset = (page - 1) * limit;

    // Build where clause for search
    const searchWhereClause: any = {};
    if (search) {
        searchWhereClause[Op.or] = [
            { '$user.name$': { [Op.like]: `%${search}%` } },
            { '$user.email$': { [Op.like]: `%${search}%` } },
            { '$user.mobile$': { [Op.like]: `%${search}%` } },
            { '$user.username$': { [Op.like]: `%${search}%` } },
        ];
    }

    // Get participants (hosts, cohosts, speakers, sponsors, staff)
    const participantWhereClause: any = {
        event_id: eventId,
        is_deleted: false,
        ...searchWhereClause,
    };

    // Handle multiple roles - if roles array is empty, return all roles
    if (role && role.length > 0) participantWhereClause.role = { [Op.in]: role };

    const participantResults = await Promise.all([
        EventParticipant.findAll({
            where: participantWhereClause,
            include: [{
                as: 'user',
                model: User,
                required: false,
                attributes: userAttributes,
                where: { is_deleted: false },
            }],
            attributes: eventParticipantAttributes,
            order: [[{ model: User, as: 'user' }, order_by === 'name' ? 'name' : 'created_at', order_direction]],
            limit,
            offset,
        }),

        EventParticipant.count({
            where: participantWhereClause,
            include: [{
                model: User,
                as: 'user',
                required: false,
                where: { is_deleted: false },
            }],
        }),
    ]);

    let participants = participantResults[0];
    const participantCount = participantResults[1];

    // Add connection status if authenticated user
    if (authUserId && participants.length > 0) {
        // Convert participants to plain objects
        const plainParticipants = participants.map(participant => participant.toJSON ? participant.toJSON() : participant);
        
        // Extract user objects from participants - ensure we have plain objects
        const userObjects = plainParticipants
            .map(p => {
                const user = p.user;
                return user && typeof user === 'object' ? user : null;
            })
            .filter(user => user && user.id);
        
        if (userObjects.length > 0) {
            try {
                const usersWithStatus = await userService.addConnectionStatusToUsers(
                    userObjects,
                    authUserId,
                    false
                );
                
                // Create a map of user IDs to connection status
                const statusMap = new Map(
                    usersWithStatus.map(user => [user.id, user.connection_status])
                );
                
                // Add connection status to plain participants (inside user object)
                plainParticipants.forEach(participant => {
                    if (participant.user_id && statusMap.has(participant.user_id)) {
                        participant.user.connection_status = statusMap.get(participant.user_id);
                    }
                });
                
                // Replace original participants with plain participants
                participants = plainParticipants;
            } catch (error) {
                console.error('Error adding connection status to participants:', error);
            }
        }
    }

    return {
        data: participants,
        pagination: {
            currentPage: page,
            totalCount: participantCount,
            totalPages: Math.ceil(participantCount / limit),
        }
    };
};