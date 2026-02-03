import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Event from './event.model';
import { TicketType } from '../types/enums';

export class EventTickets extends Model {
    public id!: string;
    public event_id!: string;
    public name!: string;
    public price!: number;
    public available_quantity!: number;
    public quantity!: number;
    public description!: string;
    public ticket_type!: TicketType;
    public sales_start_date!: Date;
    public sales_end_date!: Date;
    public end_at_event_start!: boolean;
    public order!: number;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventTickets.init(
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
                name: {
                    type: DataTypes.STRING(100),
                    allowNull: false,
                },
                price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                available_quantity: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                quantity: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                ticket_type: {
                    type: DataTypes.ENUM(...Object.values(TicketType)),
                    allowNull: false,
                },
                sales_start_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                sales_end_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                end_at_event_start: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                },
                order: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
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
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'event_tickets',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventTickets.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        EventTickets.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventTickets.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventTickets.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {

    }
}

export default EventTickets;
