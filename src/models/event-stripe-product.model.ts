import Event from './event.model';
import StripeProduct from './stripe-product.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class StripeProductEvent extends Model {
    public id!: string;
    public event_id!: string;
    public product_id!: string;

    static initModel(connection: Sequelize): void {
        StripeProductEvent.init(
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
                product_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
            },
            {
                tableName: 'stripe_products_events',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        StripeProductEvent.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        StripeProductEvent.belongsTo(StripeProduct, { foreignKey: 'product_id', as: 'stripe_product' });
    }

    static initHooks(): void {}
}

export default StripeProductEvent;

