import { DataTypes, Model, Sequelize } from 'sequelize';
import Event from './event.model';
import FeedEvents from './feed-events.model';
import FeedMedia from './feed-media.model';
import FeedMention from './feed-mention.model';
import User from './user.model';

/**
 * Feed model
 */
export class Feed extends Model {
    public id!: string;
    public address!: string;
    public latitude!: string;
    public longitude!: string;
    public user_id!: string;
    public content!: string;
    public total_likes!: number;
    public total_comments!: number;
    public total_shares!: number;
    public is_public!: boolean;
    public created_by!: string;
    public updated_by!: string;
    public deleted_by!: string;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public user!: User;
 

    static initModel(connection: Sequelize): void {
        Feed.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                address: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                latitude: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                longitude: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                content: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                total_likes: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_comments: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_shares: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                is_public: {
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
                tableName: 'feeds',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        // Feed.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        Feed.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        Feed.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Feed.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Feed.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        Feed.hasMany(FeedMedia, { foreignKey: 'feed_id', as: 'medias' });

        Feed.belongsToMany(User, {
            through: FeedMention,
            foreignKey: 'feed_id',
            otherKey: 'user_id',
            constraints: false,
            as: 'mentions'
        });

        Feed.belongsToMany(Event, {
            through: FeedEvents,
            foreignKey: 'feed_id',
            otherKey: 'event_id',
            constraints: false,
            as: 'events'
        });
    }

    static initHooks(): void {
    }

}

export default Feed;