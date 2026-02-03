import { DataTypes, Model, Sequelize } from 'sequelize';
import Event from './event.model';
import User from './user.model';

export class EventViewer extends Model {
    public id!: string;
    public event_id!: string;
    public user_id!: string | null;
    public device_id!: string | null;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventViewer.init(
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
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                device_id: {
                    type: DataTypes.TEXT,
                    allowNull: true,
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
                tableName: 'event_viewers',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventViewer.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventViewer.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventViewer.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        EventViewer.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        EventViewer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
    }

    static initHooks(): void {

    }
}

export default EventViewer;
