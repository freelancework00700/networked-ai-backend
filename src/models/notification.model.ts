import User from './user.model';
import Feed from './feed.model';
import Event from './event.model';
import ChatRoom from './chat-room.model';
import FeedComment from './feed-comment.model';
import { NotificationType } from '../types/enums';
import loggerService from '../utils/logger.service';
import { DataTypes, Model, Sequelize } from 'sequelize';
import { sendPushNotification } from '../utils/firebase.service';
import { emitNotificationToUser } from '../socket/socket-manager';
import notificationService from '../services/notification.service';

export class Notification extends Model {
    public id!: string;
    public user_id!: string;
    public type!: NotificationType;
    public title!: string;
    public body!: string;
    public event_id!: string | null;
    public post_id!: string | null;
    public comment_id!: string | null;
    public chat_room_id!: string | null;
    public related_user_id!: string | null;
    public is_read!: boolean;
    public read_at!: Date | null;
    public is_deleted!: boolean;
    
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        Notification.init(
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
                type: {
                    type: DataTypes.ENUM(...Object.values(NotificationType)),
                    allowNull: false,
                },
                title: {
                    type: DataTypes.STRING(500),
                    allowNull: false,
                },
                body: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                event_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                post_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                comment_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                chat_room_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                related_user_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                is_read: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                read_at: {
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
                tableName: 'notification',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        Notification.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        Notification.belongsTo(Feed, { foreignKey: 'post_id', as: 'feed' });
        Notification.belongsTo(FeedComment, { foreignKey: 'comment_id', as: 'comment' });
        Notification.belongsTo(ChatRoom, { foreignKey: 'chat_room_id', as: 'chat_room' });
        Notification.belongsTo(User, { foreignKey: 'related_user_id', as: 'related_user' });
        Notification.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Notification.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Notification.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
        // Send push notification after creation
        Notification.afterCreate(async (notification: Notification, options: any) => {
            try {
                // Get user with FCM tokens (use transaction if available)
                const user = await User.findByPk(notification.user_id, { transaction: options?.transaction });
                if (!user) {
                    loggerService.warn(`User not found for notification ${notification.id}`);
                    return;
                }

                // Fetch full notification with all associations using the same transaction
                const fullNotification = await notificationService.getNotificationWithAssociations(notification.id, notification.user_id, options?.transaction);

                if (!fullNotification) {
                    loggerService.warn(`Failed to fetch full notification ${notification.id}`);
                    return;
                }

                // Prepare notification payload for socket
                const notificationData = fullNotification.toJSON ? fullNotification.toJSON() : fullNotification;

                // Always emit via socket.io for real-time delivery (even if push fails)
                emitNotificationToUser(notification.user_id, notificationData);

                // Check if user has FCM tokens
                if (!user.fcm_tokens || user.fcm_tokens.trim().length === 0) {
                    loggerService.info(`No FCM tokens found for user ${notification.user_id}`);
                    return;
                }

                // Prepare notification data payload for FCM - send entire notificationData as JSON string
                const data: Record<string, string> = {
                    notificationData: JSON.stringify(notificationData),
                };

                // Send push notification via FCM
                try {
                    await sendPushNotification(user.fcm_tokens, notification.title, notification.body, data);
                    loggerService.info(`Push notification sent successfully for notification ${notification.id} to user ${notification.user_id}`);
                } catch (error: any) {
                    loggerService.error(`Error sending push notification (FCM) in hook: ${error.message || error}`);
                }
            } catch (error: any) {
                loggerService.error(`Error sending push notification in hook: ${error.message || error}`);
                // Don't throw error to prevent notification creation from failing
            }
        });

        Notification.afterUpdate(async (notification: Notification, options: any) => {
            try {
                const fullNotification = await notificationService.getNotificationWithAssociations(notification.id, notification.user_id, options?.transaction);
                if (!fullNotification) return;

                const notificationData = fullNotification.toJSON ? fullNotification.toJSON() : fullNotification;
                emitNotificationToUser(notification.user_id, notificationData);
            } catch (error: any) {
                loggerService.error(`Error sending notification updated socket event in hook: ${error.message || error}`);
            }
        });
    }
}

export default Notification;
