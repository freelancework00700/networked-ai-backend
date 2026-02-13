import { DataTypes, Model, Sequelize } from 'sequelize';
import CommentMention from './comment-mention.model';
import Feed from './feed.model';
import User from './user.model';

/**
 * FeedComment model
 */
export class FeedComment extends Model {
    public id!: string;
    public firebase_comment_id!: string;
    public feed_id!: string;
    public user_id!: string;
    public parent_comment_id!: string | null;
    public total_likes!: number;
    public total_replies!: number;
    public comment!: string;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public replies!: FeedComment[] | null;
    public is_like!: boolean;
    public parent_comment!: FeedComment | null;

    static initModel(connection: Sequelize): void {
        FeedComment.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                firebase_comment_id: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                    unique: true,
                    comment: 'Firebase comment ID for migration and reference',
                },
                feed_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                parent_comment_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                total_likes: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_replies: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                comment: {
                    type: DataTypes.TEXT,
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
                tableName: 'feed_comment',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        fields: ['feed_id'],
                    },
                    {
                        fields: ['user_id'],
                    },
                    {
                        fields: ['parent_comment_id'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        FeedComment.belongsTo(Feed, { foreignKey: 'feed_id', as: 'feed' });
        FeedComment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        FeedComment.belongsTo(FeedComment, { foreignKey: 'parent_comment_id', as: 'parent_comment' });
        FeedComment.hasMany(FeedComment, { foreignKey: 'parent_comment_id', as: 'replies' });
        FeedComment.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        FeedComment.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        FeedComment.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        FeedComment.belongsToMany(User, {
            through: CommentMention,
            foreignKey: 'comment_id',
            otherKey: 'user_id',
            constraints: false,
            as: 'comment_mentions'
        });
    }

    static initHooks(): void {
    }
}

export default FeedComment;

