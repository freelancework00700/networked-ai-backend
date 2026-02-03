import User from './user.model';
import Event from './event.model';
import StripePrice from './stripe-price.model';
import { DataTypes, Model, Sequelize } from 'sequelize';
import StripeProductEvent from './stripe-product-event.model';

export class StripeProduct extends Model {
    public id!: string;
    public stripe_product_id!: string;
    public user_id!: string;
    public stripe_account_id!: string | null;
    public name!: string;
    public description!: string | null;
    public plan_benefits!: string | null;
    public is_sponsor!: boolean;
    public active!: boolean;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        StripeProduct.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },

                stripe_product_id: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },

                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },

                stripe_account_id: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },

                name: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },

                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },

                plan_benefits: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },

                is_sponsor: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },

                active: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
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
                tableName: 'stripe_products',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    {
                        fields: ["user_id"],
                    },
                    {
                        unique: true,
                        fields: ["stripe_product_id"],
                    },
                    {
                        fields: ["stripe_account_id"],
                    },
                ],
            }
        );
    }

    static initAssociations(): void {
        StripeProduct.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        StripeProduct.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        StripeProduct.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        StripeProduct.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        StripeProduct.hasMany(StripePrice, { foreignKey: 'product_id', as: 'prices' });
        StripeProduct.belongsToMany(Event, {
            through: StripeProductEvent,
            foreignKey: 'product_id',
            otherKey: 'event_id',
            constraints: false,
            as: 'events'
        });
    }

    static initHooks(): void { }
}

export default StripeProduct;

