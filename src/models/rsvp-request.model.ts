import User from './user.model';
import Event from './event.model';
import Notification from './notification.model';
import smsService from '../services/sms.service';
import loggerService from '../utils/logger.service';
import emailService from '../services/email.service';
import { DataTypes, Model, Sequelize } from 'sequelize';
import notificationService from '../services/notification.service';
import { RSVPRequestStatus, NotificationType } from '../types/enums';

export class RSVPRequest extends Model {
    public id!: string;
    public event_id!: string;
    public user_id!: string;
    public status!: RSVPRequestStatus;
    public responded_at!: Date | null;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        RSVPRequest.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                event_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                status: {
                    type: DataTypes.ENUM(...Object.values(RSVPRequestStatus)),
                    allowNull: false,
                    defaultValue: RSVPRequestStatus.PENDING,
                },
                responded_at: {
                    type: DataTypes.DATE,
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
                tableName: 'rsvp_requests',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        RSVPRequest.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        RSVPRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

        RSVPRequest.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        RSVPRequest.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        RSVPRequest.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
        RSVPRequest.afterCreate(async (request: RSVPRequest, options: any) => {
            try {
                if (request.status !== RSVPRequestStatus.PENDING) {
                    return;
                }

                await request.reload({
                    include: [
                        {
                            model: Event,
                            as: 'event',
                            attributes: ['id', 'title', 'slug', 'created_by'],
                            include: [{
                                model: User,
                                as: 'created_by_user',
                                attributes: ['id', 'name', 'email', 'mobile'],
                            }],
                        },
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email', 'mobile'],
                        },
                    ],
                    transaction: options?.transaction,
                });

                const event = (request as any).event as Event;
                const requester = (request as any).user as User;
                const host = (event as any)?.created_by_user as User;

                if (event && host?.email) {
                    await emailService.sendRsvpRequestEmailToHost(
                        event,
                        host.email,
                        host.name || 'Host',
                        requester?.name || 'User',
                        requester?.id,
                        options?.transaction
                    );
                }

                if (event && host?.mobile) {
                    await smsService.sendRsvpRequestSmsToHost(
                        event,
                        host.mobile,
                        requester?.name || 'User',
                        options?.transaction
                    );
                }

                if (event && host?.id) {
                    await notificationService.sendRsvpRequestNotificationToHost(
                        event,
                        host.id,
                        requester?.id,
                        requester?.name || 'User',
                        options?.transaction
                    );
                }
            } catch (error: any) {
                loggerService.error(`Error sending RSVP request notifications in hook: ${error.message || error}`);
            }
        });

        RSVPRequest.afterUpdate(async (request: RSVPRequest, options: any) => {
            try {
                const currentStatus = request.getDataValue('status');
                const previousStatus = (request as any)._previousDataValues?.status;

                const isDecision =
                    previousStatus === RSVPRequestStatus.PENDING &&
                    (currentStatus === RSVPRequestStatus.APPROVED || currentStatus === RSVPRequestStatus.REJECTED);

                if (!isDecision) {
                    return;
                }

                await request.reload({
                    include: [
                        {
                            model: Event,
                            as: 'event',
                            attributes: ['id', 'title', 'slug', 'created_by'],
                            include: [{
                                model: User,
                                as: 'created_by_user',
                                attributes: ['id', 'name', 'email', 'mobile'],
                            }],
                        },
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email', 'mobile'],
                        },
                    ],
                    transaction: options?.transaction,
                });

                const event = (request as any).event as Event;
                const requester = (request as any).user as User;
                const host = (event as any)?.created_by_user as User;

                const isApproved = currentStatus === RSVPRequestStatus.APPROVED;

                if (event && requester?.email) {
                    if (isApproved) {
                        await emailService.sendRsvpRequestApprovedEmailToRequester(
                            event,
                            requester.email,
                            requester.name || 'User',
                            host?.name || 'Host',
                            host?.id,
                            options?.transaction
                        );
                    } else {
                        await emailService.sendRsvpRequestRejectedEmailToRequester(
                            event,
                            requester.email,
                            requester.name || 'User',
                            host?.name || 'Host',
                            host?.id,
                            options?.transaction
                        );
                    }
                }

                if (event && requester?.mobile) {
                    if (isApproved) {
                        await smsService.sendRsvpRequestApprovedSmsToRequester(event, requester.mobile, options?.transaction);
                    } else {
                        await smsService.sendRsvpRequestRejectedSmsToRequester(event, requester.mobile, options?.transaction);
                    }
                }

                if (event && requester?.id) {
                    await notificationService.sendRsvpRequestDecisionNotificationToRequester(
                        event,
                        requester.id,
                        isApproved,
                        host?.id,
                        host?.name || 'Host',
                        options?.transaction
                    );
                }

                // Update the notification sent to the host when RSVP request was created
                if (event && host?.id) {
                    try {
                        const notification = await Notification.findOne({
                            where: {
                                is_deleted: false,
                                user_id: host.id,
                                event_id: event.id,
                                related_user_id: requester.id,
                                type: NotificationType.RSVP_REQUEST,
                            },
                            transaction: options?.transaction,
                        });

                        if (notification) {
                            await Notification.update(
                                { updated_at: new Date() },
                                {
                                    individualHooks: true,
                                    where: { id: notification.id },
                                    transaction: options?.transaction,
                                }
                            );

                            loggerService.info(`RSVP request notification updated successfully for notification ${notification.id}`);
                        }
                    } catch (error: any) {
                        loggerService.error(`Error updating RSVP request notification in hook: ${error.message || error}`);
                    }
                }
            } catch (error: any) {
                loggerService.error(`Error sending RSVP decision notifications in hook: ${error.message || error}`);
            }
        });
    }
}

export default RSVPRequest;

