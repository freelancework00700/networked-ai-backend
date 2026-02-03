import User from './user.model';
import Event from './event.model';
import smsService from '../services/sms.service';
import loggerService from '../utils/logger.service';
import emailService from '../services/email.service';
import { EventParticipantRole } from '../types/enums';
import { DataTypes, Model, Sequelize } from 'sequelize';
import notificationService from '../services/notification.service';

export class EventParticipant extends Model {
    public id!: string;
    public user_id!: string;
    public event_id!: string;
    public role!: EventParticipantRole;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventParticipant.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                event_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                role: {
                    type: DataTypes.ENUM(...Object.values(EventParticipantRole)),
                    allowNull: false,
                },
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
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
                tableName: 'event_participants',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventParticipant.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventParticipant.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventParticipant.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        
        EventParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        EventParticipant.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
    }

    static initHooks(): void {
        EventParticipant.afterCreate(async (participant: EventParticipant, options: any) => {
            try {
                // Only send emails for roles other than Host
                if (participant.role !== EventParticipantRole.HOST) {
                    // Reload participant with event and user information within the same transaction
                    await participant.reload({
                        include: [
                            {
                                model: Event,
                                as: 'event',
                                attributes: ['id', 'slug', 'title', 'description', 'address', 'city', 'state', 'country', 'start_date', 'end_date'],
                                include: [{
                                    model: User,
                                    as: 'created_by_user',
                                    attributes: ['id', 'name', 'email'],
                                }],
                            },
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id', 'name', 'email', 'mobile'],
                            },
                        ],
                        transaction: options.transaction,
                    });

                    const user = (participant as any).user;
                    const event = (participant as any).event;

                    // send email notification
                    if (event && user && user.email) {
                        await emailService.sendEventRoleAssignmentEmail(
                            event,
                            user.email,
                            user.name || 'User',
                            participant.role,
                            options.transaction
                        );
                    }

                    // send sms notification
                    if (event && user?.mobile) {
                        await smsService.sendEventRoleAssignmentSms(
                            event,
                            user.mobile,
                            participant.role,
                            options.transaction
                        );
                    }

                    // send push notification
                    if (event && user?.id) {
                        await notificationService.sendEventRoleAssignmentNotification(
                            event,
                            user.id,
                            participant.role,
                            options.transaction
                        );
                    }
                }
            } catch (error: any) {
                // Log error but don't throw - we don't want email failures to break participant creation
                loggerService.error(`Error sending role assignment email in hook: ${error.message}`);
            }
        });

        EventParticipant.afterUpdate(async (participant: EventParticipant, options: any) => {
            try {
                const currentIsDeleted = participant.getDataValue('is_deleted');
                const previousIsDeleted = (participant as any)._previousDataValues?.is_deleted;

                const currentRole = participant.getDataValue('role');
                const previousRole = (participant as any)._previousDataValues?.role;

                const isRemoval = previousIsDeleted === false && currentIsDeleted === true;
                const isRoleUpdate = previousRole && currentRole && previousRole !== currentRole;

                if (!isRemoval && !isRoleUpdate) {
                    return;
                }

                await participant.reload({
                    include: [
                        {
                            model: Event,
                            as: 'event',
                            attributes: ['id', 'slug', 'title', 'description', 'address', 'city', 'state', 'country', 'start_date', 'end_date'],
                            include: [{
                                model: User,
                                as: 'created_by_user',
                                attributes: ['id', 'name', 'email'],
                            }],
                        },
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email', 'mobile'],
                        },
                    ],
                    transaction: options.transaction,
                });

                const user = (participant as any).user;
                const event = (participant as any).event;

                // Role Update
                if (isRoleUpdate && participant.role !== EventParticipantRole.HOST) {
                    // Send email notification
                    if (event && user && user.email) {
                        await emailService.sendEventRoleAssignmentEmail(
                            event,
                            user.email,
                            user.name || 'User',
                            participant.role,
                            options.transaction
                        );
                    }

                    // Send SMS notification
                    if (event && user?.mobile) {
                        await smsService.sendEventRoleAssignmentSms(
                            event,
                            user.mobile,
                            participant.role,
                            options.transaction
                        );
                    }

                    // Send push notification
                    if (event && user?.id) {
                        await notificationService.sendEventRoleAssignmentNotification(
                            event,
                            user.id,
                            participant.role,
                            options.transaction
                        );
                    }
                }

                // Role Removal
                if (isRemoval) {
                    // Send email notification
                    if (event && user && user.email) {
                        await emailService.sendEventRoleRemovalEmail(
                            event,
                            user.email,
                            user.name || 'User',
                            options.transaction
                        );
                    }

                    // Send SMS notification
                    if (event && user?.mobile) {
                        await smsService.sendEventRoleRemovalSms(event, user.mobile, options.transaction);
                    }

                    // Send push notification
                    if (event && user?.id) {
                        await notificationService.sendEventRoleRemovalNotification(event, user.id, options.transaction);
                    }
                }
            } catch (error: any) {
                loggerService.error(`Error sending role update/removal notifications in hook: ${error.message}`);
            }
        });
    }
}

export default EventParticipant;
