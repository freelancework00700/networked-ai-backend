import { User } from './user.model';
import Notification from './notification.model';
import { NotificationType } from '../types/enums';
import loggerService from '../utils/logger.service';
import emailService from '../services/email.service';
import { DataTypes, Model, Sequelize } from 'sequelize';
import notificationService from '../services/notification.service';
const DEFAULT_PROFILE_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/networked-6f29b.appspot.com/o/email-template-photos%2Fnetworked.png?alt=media&token=f5cba863-5c90-4a4f-bd9d-132c42f21841';

export class UserNetwork extends Model {
    public id!: string;
    public user_id!: string;
    public peer_id!: string;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public peer!: User;

    static initModel(connection: Sequelize): void {
        UserNetwork.init(
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
                peer_id: {
                    type: DataTypes.UUID,
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
                tableName: 'user_networks',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        UserNetwork.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserNetwork.belongsTo(User, { foreignKey: 'peer_id', as: 'peer' });

        UserNetwork.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        UserNetwork.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        UserNetwork.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
        UserNetwork.afterCreate(async (connection: UserNetwork, options: any) => {
            try {
                const userId = connection.getDataValue('user_id');
                const createdBy = connection.getDataValue('created_by');

                // Dedupe: accepting a request creates two UserNetwork rows. Only notify the original sender once.
                // In accept flow, `created_by` is the accepter. The row where `user_id !== created_by` corresponds
                // to the original sender receiving the "accepted" notification.
                if (!createdBy || createdBy === userId) {
                    return;
                }

                await connection.reload({
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'email'],
                        },
                        {
                            model: User,
                            as: 'created_by_user',
                            attributes: ['id', 'name', 'username', 'image_url'],
                        },
                    ],
                    transaction: options?.transaction,
                });

                const sender = (connection as any).user;
                const accepter = (connection as any).created_by_user;

                if (sender?.email) {
                    await emailService.sendNetworkRequestAcceptedEmail(
                        sender.email,
                        accepter?.name || 'User',
                        accepter?.username || '',
                        createdBy,
                        accepter?.image_url || DEFAULT_PROFILE_IMAGE || '',
                        options?.transaction
                    );
                }

                await notificationService.sendNetworkRequestAcceptedNotification(
                    userId,
                    createdBy,
                    accepter?.name || 'User',
                    options?.transaction
                );

                // trigger notification update hook so user get updated notification
                const notification = await Notification.findOne({
                    where: {
                        is_deleted: false,
                        user_id: createdBy,
                        related_user_id: userId,
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
                loggerService.error(`Error sending network request accepted notification in UserNetwork hook: ${error.message || error}`);
            }
        });
    }
}

export default UserNetwork;
