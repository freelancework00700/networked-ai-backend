import { DataTypes, Model, Sequelize } from 'sequelize';
import Event from './event.model';
import EventPromoCode from './event-promo-code.model';
import EventTickets from './event-tickets.model';
import User from './user.model';
import Transaction from './transaction.model';
import { RSVPStatus } from '../types/enums';

export class EventAttendee extends Model {
    public id!: string;
    public event_id!: string;
    public user_id!: string;
    public parent_user_id!: string | null;
    public name!: string | null;
    public is_incognito!: boolean;
    public rsvp_status!: RSVPStatus;
    public is_checked_in!: boolean;
    public event_ticket_id!: string | null;
    public event_promo_code_id!: string | null;
    public platform_fee_amount!: number;
    public amount_paid!: number;
    public apple_wallet_pass_url!: string | null;
    public transaction_id!: string | null;
    public host_payout_amount!: number;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventAttendee.init(
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
                    allowNull: false,
                },
                parent_user_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                name: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                is_incognito: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                rsvp_status: {
                    type: DataTypes.ENUM(...Object.values(RSVPStatus)),
                    allowNull: false,
                },
                is_checked_in: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                event_ticket_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                event_promo_code_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                platform_fee_amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                },
                amount_paid: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                },
                apple_wallet_pass_url: {
                    type: DataTypes.STRING(500),
                    allowNull: true,
                },
                transaction_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                host_payout_amount: {
                    type: DataTypes.DECIMAL(10, 2),
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
                tableName: 'event_attendees',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                      unique: false,
                      fields: ["event_id", "user_id"],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        EventAttendee.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventAttendee.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventAttendee.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        EventAttendee.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        EventAttendee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        EventAttendee.belongsTo(User, { foreignKey: 'parent_user_id', as: 'parent_user' });
        EventAttendee.belongsTo(EventTickets, { foreignKey: 'event_ticket_id', as: 'event_ticket' });
        EventAttendee.belongsTo(EventPromoCode, { foreignKey: 'event_promo_code_id', as: 'event_promo_code' });
        EventAttendee.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
    }

    static initHooks(): void {

    }
}

export default EventAttendee;

