import User from './user.model';
import { SubscriptionStatus } from '../types/enums';
import { DataTypes, Model, Sequelize } from 'sequelize';
import PlatformStripePrice from './platform-stripe-price.model';
import PlatformStripeProduct from './platform-stripe-product.model';
import PlatformUserFeatureUsage from './platform-user-feature-usage.model';

export class PlatformUserSubscription extends Model {
    public id!: string;
    public user_id!: string;
    public platform_stripe_product_id!: string;
    public platform_stripe_price_id!: string | null;
    public stripe_subscription_id!: string | null;
    public status!: SubscriptionStatus;
    public start_date!: Date;
    public end_date!: Date | null;
    public cancel_at_end_date!: boolean;

    public canceled_at!: Date | null;
    public created_at!: Date;
    public updated_at!: Date;
    public created_by!: string | null;
    public updated_by!: string | null;

    static initModel(connection: Sequelize): void {
        PlatformUserSubscription.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },

                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },

                platform_stripe_product_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },

                platform_stripe_price_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },

                stripe_subscription_id: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                    unique: true,
                },

                status: {
                    type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
                    allowNull: false,
                    defaultValue: SubscriptionStatus.UNPAID,
                },

                start_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },

                end_date: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },

                cancel_at_end_date: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },

                canceled_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    comment: "Date when subscription was actually canceled",
                },

                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },

                updated_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
            },
            {
                tableName: 'platform_user_subscriptions',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        PlatformUserSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        PlatformUserSubscription.belongsTo(PlatformStripeProduct, { foreignKey: 'platform_stripe_product_id', as: 'product' });
        PlatformUserSubscription.belongsTo(PlatformStripePrice, { foreignKey: 'platform_stripe_price_id', as: 'price' });
        PlatformUserSubscription.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        PlatformUserSubscription.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        PlatformUserSubscription.hasMany(PlatformUserFeatureUsage, { foreignKey: 'platform_user_subscription_id', as: 'feature_usage' });
    }

    static initHooks(): void { }
}

export default PlatformUserSubscription;
