import { DataTypes, Model, Sequelize } from 'sequelize';
import { MediaType } from '../types/enums';
import Feed from './feed.model';
import User from './user.model';

export class FeedMedia extends Model {
    public id!: string;
    public feed_id!: string;
    public media_url!: string;
    public media_type!: MediaType;
    public order!: number;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        FeedMedia.init(
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
                media_url: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                media_type: {
                    type: DataTypes.ENUM(...Object.values(MediaType)),
                    allowNull: false,
                },
                order: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
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
                tableName: 'feed_media',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        FeedMedia.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        FeedMedia.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        FeedMedia.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        FeedMedia.belongsTo(Feed, { foreignKey: 'feed_id', as: 'feed' });
    }

    static initHooks(): void {

    }
}

export default FeedMedia;
