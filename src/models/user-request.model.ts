import { User } from './user.model';
import Notification from './notification.model';
import { NotificationType } from '../types/enums';
import { UserRequestStatus } from '../types/enums';
import loggerService from '../utils/logger.service';
import emailService from '../services/email.service';
import { DataTypes, Model, Sequelize } from 'sequelize';
import notificationService from '../services/notification.service';

export class UserRequest extends Model {
    public id!: string;
    public sender_id!: string;
    public receiver_id!: string;
    public status!: UserRequestStatus;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        UserRequest.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                sender_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                receiver_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                status: {
                    type: DataTypes.ENUM(...Object.values(UserRequestStatus)),
                    allowNull: false,
                    defaultValue: UserRequestStatus.PENDING,
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
                tableName: 'user_requests',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        UserRequest.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
        UserRequest.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

        UserRequest.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        UserRequest.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        UserRequest.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
        UserRequest.afterCreate(async (request: UserRequest, options: any) => {
            try {
                await request.reload({
                    include: [
                        {
                            model: User,
                            as: 'sender',
                            attributes: ['id', 'name', 'email', 'username'],
                        },
                        {
                            model: User,
                            as: 'receiver',
                            attributes: ['id', 'name', 'email', 'username'],
                        },
                    ],
                    transaction: options?.transaction,
                });

                const sender = (request as any).sender;
                const receiver = (request as any).receiver;

                // Send email notification
                if (receiver?.email && sender) {
                    await emailService.sendNetworkRequestEmail(
                        receiver.email,
                        sender.name || 'User',
                        sender.username || '',
                        sender.id,
                        options?.transaction
                    );
                }

                // Send push notification
                if (receiver?.id && sender) {
                    await notificationService.sendNetworkRequestNotification(
                        receiver.id,
                        sender.id,
                        sender.name || 'User',
                        options?.transaction
                    );
                }
            } catch (error: any) {
                loggerService.error(`Error sending network request email/notification in hook: ${error.message}`);
            }
        });

        UserRequest.afterUpdate(async (request: UserRequest, options: any) => {
            try {
                // trigger notification update hook so user get updated notification
                const senderId = request.getDataValue('sender_id');
                const receiverId = request.getDataValue('receiver_id');

                const notification = await Notification.findOne({
                    where: {
                        is_deleted: false,
                        user_id: receiverId,
                        related_user_id: senderId,
                        type: NotificationType.NETWORK,
                    },
                    transaction: options?.transaction,
                });

                if (!notification) return;

                await Notification.update(
                    { updated_at: new Date() },
                    {
                        individualHooks: true,
                        where: { id: notification.id },
                        transaction: options?.transaction,
                    }
                );

                loggerService.info(`Notification updated successfully, hook should have fired for notification ${notification.id}`);
            } catch (error: any) {
                loggerService.error(`Error touching network request notification in UserRequest hook: ${error.message || error}`);
            }
        });
    }
}

export default UserRequest;
