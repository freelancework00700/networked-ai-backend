import { DataTypes, Model, Sequelize } from 'sequelize';
import { RepeatingFrequency } from '../types/enums';
import Event from './event.model';
import User from './user.model';

export class EventSetting extends Model {
    public id!: string;
    public event_id!: string;
    public is_repeating_event!: boolean;
    public repeating_frequency!: RepeatingFrequency | null;
    public is_rsvp_approval_required!: boolean;
    public is_show_timer!: boolean;
    public max_attendees_per_user!: number | null;
    public host_pays_platform_fee!: boolean;
    public additional_fees!: number | null;
    public is_subscriber_exclusive!: boolean;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventSetting.init(
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
                is_repeating_event: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                repeating_frequency: {
                    type: DataTypes.ENUM(...Object.values(RepeatingFrequency)),
                    allowNull: true,
                },
                is_rsvp_approval_required: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                is_show_timer: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                max_attendees_per_user: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                host_pays_platform_fee: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                additional_fees: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                is_subscriber_exclusive: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
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
                tableName: 'event_settings',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        unique: true,
                        fields: ['event_id'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        EventSetting.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventSetting.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventSetting.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        EventSetting.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
    }

    static initHooks(): void {

    }
}

export default EventSetting;
