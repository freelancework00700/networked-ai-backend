import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';

export class ProfileSubscription extends Model {
    public id!: string;
    public user_id!: string;
    public peer_id!: string;
    public created_at!: Date;
    public created_by!: string | null;

    static initModel(connection: Sequelize): void {
        ProfileSubscription.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    comment: 'Subscriber user id',
                },
                peer_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    comment: 'Subscribed to user id / profile owner id',
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
            },
            {
                tableName: 'profile_subscriptions',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: false,
                indexes: [
                    {
                        unique: true,
                        fields: ['user_id', 'peer_id'],
                    },
                    {
                        fields: ['peer_id'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        ProfileSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        ProfileSubscription.belongsTo(User, { foreignKey: 'peer_id', as: 'peer' });
        ProfileSubscription.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
    }

    static initHooks(): void {}
}

export default ProfileSubscription;
