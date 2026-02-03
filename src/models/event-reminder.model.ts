import { Event } from './event.model';
import { ReminderType } from '../types/enums';
import { Model, DataTypes, Sequelize } from 'sequelize';

export class EventReminder extends Model {
    public id!: string;
    public event_id!: string;
    public reminder_type!: ReminderType;
    public reminder_time!: Date;
    public is_sent!: boolean;
    public sent_at!: Date | null;

    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        EventReminder.init(
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
                reminder_type: {
                    type: DataTypes.ENUM(...Object.values(ReminderType)),
                    allowNull: false,
                },
                reminder_time: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                is_sent: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                sent_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'event_reminders',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        unique: false,
                        fields: ['event_id'],
                    },
                    {
                        unique: false,
                        fields: ['reminder_time', 'is_sent'],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        EventReminder.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
    }

    static initHooks(): void {
    }
}

export default EventReminder;
