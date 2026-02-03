import { DataTypes, Model, Sequelize } from 'sequelize';
import Feed from './feed.model';
import User from './user.model';

/**
 * FeedLiked model
 */
export class FeedLiked extends Model {
    public id!: string;
    public feed_id!: string;
    public user_id!: string;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        FeedLiked.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                feed_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
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
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'feed_liked',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        unique: true,
                        fields: ['feed_id', 'user_id'],
                        name: 'uq_feed_liked',
                    },
                    {
                        fields: ['feed_id'],
                    },
                    {
                        fields: ['user_id'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        FeedLiked.belongsTo(Feed, { foreignKey: 'feed_id', as: 'feed' });
        FeedLiked.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        FeedLiked.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        FeedLiked.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        FeedLiked.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
    }
}

export default FeedLiked;