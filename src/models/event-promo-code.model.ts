import { DataTypes, Model, Sequelize } from 'sequelize';
import Event from './event.model';
import User from './user.model';
import { PromoCodeType } from '../types/enums';

export class EventPromoCode extends Model {
    public id!: string;
    public event_id!: string;
    public promo_code!: string;
    public type!: PromoCodeType;
    public value!: number;
    public capped_amount!: number | null;
    public available_quantity!: number | null;
    public quantity!: number | null;
    public max_uses_per_user!: number | null;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventPromoCode.init(
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
                promo_code: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                type: {
                    type: DataTypes.ENUM(...Object.values(PromoCodeType)),
                    allowNull: false,
                },
                value: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                capped_amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                available_quantity: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                quantity: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                max_uses_per_user: {
                    type: DataTypes.INTEGER,
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
                tableName: 'event_promo_codes',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventPromoCode.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventPromoCode.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventPromoCode.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        EventPromoCode.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
    }

    static initHooks(): void {

    }
}

export default EventPromoCode;
