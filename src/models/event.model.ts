import { DataTypes, Model, Sequelize } from 'sequelize';
import EventCategory from './event-category.model';
import EventFeedback from './event-feedback.model';
import EventMedia from './event-media.model';
import EventParticipant from './event-participant.model';
import EventPromoCode from './event-promo-code.model';
import EventQuestion from './event-question.model';
import EventSetting from './event-setting.model';
import EventTickets from './event-tickets.model';
import User from './user.model';
import EventVibe from './event-vibe.model';
import Vibe from './vibe.model';
import EventViewer from './event-viewer.model';
import EventLike from './event-like.model';
import EventAttendee from './event-attendee.model';
import EventReminder from './event-reminder.model';
import StripeProduct from './stripe-product.model';
import StripeProductEvent from './stripe-product-event.model';
import RSVPRequest from './rsvp-request.model';
import smsService from '../services/sms.service';
import loggerService from '../utils/logger.service';
import emailService from '../services/email.service';
import notificationService from '../services/notification.service';
import eventReminderService from '../services/event-reminder.service';

export class Event extends Model {
    public id!: string;
    public firebase_eid!: string | null;
    public title!: string;
    public slug!: string;
    public description!: string | null;
    public address!: string | null;
    public latitude!: string | null;
    public longitude!: string | null;
    public city!: string | null;
    public state!: string | null;
    public country!: string | null;
    public category_id!: string;
    public is_paid_event!: boolean;
    public start_date!: Date;
    public end_date!: Date;
    public capacity!: number | null;
    public is_public!: boolean;
    public image_url!: string | null;
    public thumbnail_url!: string | null;
    public total_likes!: number;
    public total_views!: number;
    public parent_event_id!: string | null;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        Event.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                firebase_eid: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                title: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                slug: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                description: {
                    type: DataTypes.TEXT('long'),
                    allowNull: true,
                },
                address: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                latitude: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                },
                longitude: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                },
                city: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                },
                state: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    defaultValue: 'Georgia',
                },
                country: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    defaultValue: 'USA',
                },
                category_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                is_paid_event: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                start_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                end_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                capacity: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                is_public: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
                },
                image_url: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                thumbnail_url: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                total_likes: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_views: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    defaultValue: 0,
                },
                parent_event_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                updated_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                deleted_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'events',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        unique: true,
                        fields: ['firebase_eid'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        Event.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Event.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Event.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        Event.belongsTo(Event, { foreignKey: 'parent_event_id', as: 'parent_event' });
        Event.hasMany(Event, { foreignKey: 'parent_event_id', as: 'child_events' });
        Event.belongsTo(EventCategory, { foreignKey: 'category_id', as: 'category' });

        Event.hasOne(EventSetting, { foreignKey: 'event_id', as: 'settings' });
        Event.hasMany(EventTickets, { foreignKey: 'event_id', as: 'tickets' });
        Event.hasMany(EventMedia, { foreignKey: 'event_id', as: 'medias' });
        Event.hasMany(EventQuestion, { foreignKey: 'event_id', as: 'questionnaire' });
        Event.hasMany(EventFeedback, { foreignKey: 'event_id', as: 'feedbacks' });
        Event.hasMany(EventParticipant, { foreignKey: 'event_id', as: 'participants' });
        Event.hasMany(EventPromoCode, { foreignKey: 'event_id', as: 'promo_codes' });
        Event.hasMany(RSVPRequest, { foreignKey: 'event_id', as: 'rsvp_requests' });
        Event.hasMany(EventAttendee, { foreignKey: 'event_id', as: 'attendees' });
        Event.hasMany(EventReminder, { foreignKey: 'event_id', as: 'reminders' });

        Event.belongsToMany(Vibe, {
            through: {
                model: EventVibe,
                unique: false
            },
            foreignKey: 'event_id',
            otherKey: 'vibe_id',
            constraints: false,
            as: 'vibes'
        });

        Event.belongsToMany(User, {
            through: {
                model: EventViewer,
                unique: false
            },
            foreignKey: 'event_id',
            otherKey: 'user_id',
            constraints: false,
            as: 'viewers'
        });
        
        Event.belongsToMany(User, {
            through: {
                model: EventLike,
                unique: false
            },
            foreignKey: 'event_id',
            otherKey: 'user_id',
            constraints: false,
            as: 'likers'
        });

        Event.belongsToMany(StripeProduct, {
            through: {
                model: StripeProductEvent,
                unique: false
            },
            foreignKey: 'event_id',
            otherKey: 'product_id',
            constraints: false,
            as: 'plans'
        });
    }

    static initHooks(): void {
        Event.afterCreate(async (event: Event, options: any) => {
            try {
                await event.reload({
                    include: [{
                        model: User,
                        as: 'created_by_user',
                        attributes: ['id', 'name', 'email', 'mobile', 'username'],
                    }],
                    transaction: options.transaction,
                });

                await emailService.sendEventCreationEmail(event, options.transaction);
                await smsService.sendEventCreationSms(event, options.transaction);
                await notificationService.sendEventCreationNotification(event, options.transaction);

                // Create reminders for the event
                await eventReminderService.createEventReminders(event, options.transaction);
            } catch (error: any) {
                loggerService.error(`Error in event creation hook: ${error.message}`);
            }
        });

        Event.afterUpdate(async (event: Event, options: any) => {
            try {
                const currentIsDeleted = event.getDataValue('is_deleted');
                const previousIsDeleted = (event as any)._previousDataValues?.is_deleted;

                await event.reload({
                    attributes: ['id', 'slug', 'title', 'description', 'address', 'city', 'state', 'country', 'start_date', 'end_date', 'created_by'],
                    include: [{
                        model: User,
                        as: 'created_by_user',
                        attributes: ['id', 'name', 'email'],
                    }],
                    transaction: options.transaction,
                });

                if (previousIsDeleted === false && currentIsDeleted === true) {
                    // Event was deleted
                    await emailService.sendEventDeletedEmail(event, options.transaction);
                    await smsService.sendEventDeletionSms(event, options.transaction);
                    await notificationService.sendEventDeletionNotification(event, options.transaction);
                    // Delete all reminders for this event
                    await eventReminderService.deleteEventReminders(event.id, options.transaction);
                    await eventReminderService.deleteEventReminders(event.id, options.transaction);
                } else if (previousIsDeleted === false && currentIsDeleted === false) {
                    // Event was updated
                    const changedFields = (event as any).changed() || [];
                    const importantFields = ['title', 'description', 'start_date', 'end_date', 'address'];
                    const meaningfulFields = changedFields.filter((field: string) => importantFields.includes(field));

                    if (meaningfulFields.length > 0) {
                        await emailService.sendEventUpdatedEmail(event, meaningfulFields, options.transaction);
                        await smsService.sendEventUpdatedSms(event, meaningfulFields, options.transaction);
                        await notificationService.sendEventUpdatedNotification(event, meaningfulFields, options.transaction);
                    }

                    // If start_date changed, recreate reminders
                    if (changedFields.includes('start_date')) {
                        await eventReminderService.deleteEventReminders(event.id, options.transaction);
                        await eventReminderService.createEventReminders(event, options.transaction);
                    }
                }
            } catch (error: any) {
                // Log error but don't throw - we don't want email failures to break event update
                loggerService.error(`Error sending event update/deletion email in hook: ${error.message}`);
            }
        });
    }
}

export default Event;
