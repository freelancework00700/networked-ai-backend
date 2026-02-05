import { DataTypes, Model, Sequelize } from 'sequelize';
import { ChatRoom } from './chat-room.model';
import { MessageType, NotificationType } from '../types/enums';
import { User } from './user.model';
import { Feed } from './feed.model';
import { Event } from './event.model';
import { Notification } from './notification.model';
import loggerService from '../utils/logger.service';

export class ChatMessage extends Model {
    public id!: string;
    public chat_room_id!: string;
    public message!: string;
    public type!: MessageType;
    public posted_by_user_id!: string;
    public media_url!: string;
    public event_id!: string | null;
    public feed_id!: string | null;
    public read_by_recipients!: Array<{ read_by_user_id: string; read_at: Date }>;
    public reactions!: Array<{ react_by: string; reaction: string }>;
    public deleted_by!: Array<string>
    public is_edited!: boolean;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize) {
        ChatMessage.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            chat_room_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            message: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            type: {
                type: DataTypes.ENUM(...Object.values(MessageType)),
                defaultValue: 'text',
            },
            media_url: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            posted_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            event_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            feed_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            read_by_recipients: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            reactions: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            deleted_by: {
                type: DataTypes.JSON,
                defaultValue: [],
                allowNull: true,
            },
            is_edited: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false
            },
            is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        }, {
            tableName: 'chat_messages',
            sequelize: connection,
            freezeTableName: true,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        });
    }

    static initAssociations() {
        ChatMessage.belongsTo(Feed, { as: 'feed', foreignKey: 'feed_id' });
        ChatMessage.belongsTo(Event, { as: 'event', foreignKey: 'event_id' });
        ChatMessage.belongsTo(ChatRoom, { as: 'chat_room_info', foreignKey: 'chat_room_id' });
        ChatMessage.belongsTo(User, { as: 'posted_by_user', foreignKey: 'posted_by_user_id' });
    }

    static initHooks(): void {
        // Send notifications after message creation
        ChatMessage.afterCreate(async (message: ChatMessage, options: any) => {
            try {
                if (!message.posted_by_user_id || !message.chat_room_id) return;

                // Get chat room to find all users
                const chatRoom = await ChatRoom.findByPk(message.chat_room_id, { transaction: options?.transaction });
                if (!chatRoom || !chatRoom.user_ids || chatRoom.user_ids.length === 0) return;

                // Filter out the sender and deleted users
                const recipientUserIds = chatRoom.user_ids.filter((userId: string) => userId !== message.posted_by_user_id && !chatRoom.deleted_users?.includes(userId));
                if (recipientUserIds.length === 0) return;

                // Get sender information
                const sender = await User.findByPk(message.posted_by_user_id, { 
                    attributes: ['id', 'name', 'username'],
                    transaction: options?.transaction 
                });

                if (!sender) return;

                const senderName = sender.name || sender.username || 'Someone';

                // Extract message text (handle both string and JSON types)
                let messageText: string | null = null;
                if (typeof message.message === 'string') {
                    messageText = message.message;
                } else if (message.message && typeof message.message === 'object') {
                    messageText = (message.message as any).text || (message.message as any).message || null;
                }

                // Determine notification title and body based on message type
                let title = 'New Message';
                let body = `${senderName} sent you a message.`;
                if (message.type === MessageType.POST) {
                    title = 'New Post Shared';
                    body = `${senderName} shared a post with you.`;
                } else if (message.type === MessageType.EVENT) {
                    title = 'New Event Shared';
                    body = `${senderName} shared an event with you.`;
                }
                if (messageText != null && String(messageText).trim()) body += ` : ${String(messageText).trim()}`;

                // Create notifications for all recipients
                await Promise.all(
                    recipientUserIds.map((userId: string) =>
                        Notification.create(
                            {
                                body,
                                title,
                                user_id: userId,
                                post_id: message.feed_id || null,
                                event_id: message.event_id || null,
                                type: NotificationType.CHAT_MESSAGE,
                                chat_room_id: message.chat_room_id || null,
                                related_user_id: message.posted_by_user_id,
                            },
                            { transaction: options?.transaction }
                        )
                    )
                );

                loggerService.info(`Message notifications created for message ${message.id} in room ${message.chat_room_id} to ${recipientUserIds.length} users`);
            } catch (error: any) {
                loggerService.error(`Error creating message notifications in hook: ${error.message || error}`);
            }
        });
    }
}

export default ChatMessage;