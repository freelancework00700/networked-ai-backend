import { DataTypes, Model, Sequelize } from 'sequelize';
import Feed from './feed.model';
import User from './user.model';

/**
 * FeedMention model
 */
export class FeedMention extends Model {
    public id!: string;
    public feed_id!: string;
    public user_id!: string;
    public mentioned_by!: string;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        FeedMention.init(
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
                mentioned_by: {
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
                tableName: 'feed_mentions',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        unique: true,
                        fields: ['feed_id', 'user_id'],
                        name: 'uq_feed_mention',
                    },
                    {
                        fields: ['feed_id'],
                    },
                    {
                        fields: ['user_id'],
                    },
                    {
                        fields: ['mentioned_by'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        FeedMention.belongsTo(Feed, { foreignKey: 'feed_id', as: 'feed' });
        FeedMention.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        FeedMention.belongsTo(User, { foreignKey: 'mentioned_by', as: 'mentioned_by_user' });
        FeedMention.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        FeedMention.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        FeedMention.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
    }
}

export default FeedMention;

