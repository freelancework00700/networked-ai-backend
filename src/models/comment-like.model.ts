import { DataTypes, Model, Sequelize } from 'sequelize';
import FeedComment from './feed-comment.model';
import User from './user.model';

/**
 * CommentLike model
 */
export class CommentLike extends Model {
    public id!: string;
    public comment_id!: string;
    public user_id!: string;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        CommentLike.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                comment_id: {
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
                tableName: 'comment_like',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        unique: true,
                        fields: ['comment_id', 'user_id'],
                        name: 'uq_comment_like',
                    },
                    { fields: ['comment_id'] },
                    { fields: ['user_id'] },
                ],
            }
        );
    }

    static initAssociations(): void {
        CommentLike.belongsTo(FeedComment, { foreignKey: 'comment_id', as: 'comment' });
        CommentLike.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        CommentLike.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        CommentLike.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        CommentLike.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
    }
}

export default CommentLike;

