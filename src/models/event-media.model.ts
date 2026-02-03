import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Event from './event.model';
import { MediaType } from '../types/enums';

export class EventMedia extends Model {
    public id!: string;
    public event_id!: string;
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
        EventMedia.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                event_id: {
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
                tableName: 'event_media',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventMedia.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventMedia.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventMedia.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        
        EventMedia.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
    }

    static initHooks(): void {
        
    }
}

export default EventMedia;
