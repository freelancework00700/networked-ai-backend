import User from './user.model';
import { DataTypes, Model, Sequelize } from 'sequelize';
import { PlatformProductPriority } from '../types/enums';
import PlatformStripePrice from './platform-stripe-price.model';
import PlatformUserSubscription from './platform-user-subscription.model';
import PlatformStripeProductFeature from './platform-stripe-product-feature.model';

export class PlatformStripeProduct extends Model {
    public id!: string;
    public stripe_product_id!: string;
    public name!: string;
    public description!: string | null;
    public plan_benefits!: string | null;
    public active!: boolean;
    public priority!: PlatformProductPriority;

    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        PlatformStripeProduct.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },

                stripe_product_id: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                    unique: true,
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
                    type: DataTypes.JSON,
                    allowNull: true,
                    comment: "JSON array of benefits",
                },

                active: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
                },

                priority: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: PlatformProductPriority.FREE,
                    comment: "1 free, 2 growth, 3 enterprise",
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
                tableName: 'platform_stripe_products',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        PlatformStripeProduct.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        PlatformStripeProduct.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        PlatformStripeProduct.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        PlatformStripeProduct.hasMany(PlatformStripeProductFeature, { foreignKey: 'platform_stripe_product_id', as: 'features' });
        PlatformStripeProduct.hasMany(PlatformStripePrice, { foreignKey: 'platform_stripe_product_id', as: 'prices' });
        PlatformStripeProduct.hasMany(PlatformUserSubscription, { foreignKey: 'platform_stripe_product_id', as: 'subscriptions' });
    }

    static initHooks(): void { }
}

export default PlatformStripeProduct;
