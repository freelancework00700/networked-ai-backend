import User from './user.model';
import { DataTypes, Model, Sequelize } from 'sequelize';
import PlatformStripeProduct from './platform-stripe-product.model';
import { StripePriceInterval, BannerDisplayType } from '../types/enums';
import PlatformUserSubscription from './platform-user-subscription.model';

export class PlatformStripePrice extends Model {
    public id!: string;
    public platform_stripe_product_id!: string;
    public stripe_price_id!: string;
    public amount!: number;
    public currency!: string;
    public interval!: StripePriceInterval;
    public active!: boolean;
    public is_deleted!: boolean;
    public discount_percentage!: number | null;
    public banner_display_type!: BannerDisplayType | null;

    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        PlatformStripePrice.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },

                platform_stripe_product_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },

                stripe_price_id: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                    unique: true,
                },

                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    comment: "Amount in dollars",
                },

                currency: {
                    type: DataTypes.STRING(3),
                    allowNull: false,
                    defaultValue: "usd",
                },

                interval: {
                    type: DataTypes.ENUM(...Object.values(StripePriceInterval)),
                    allowNull: false,
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

                discount_percentage: {
                    type: DataTypes.DECIMAL(5, 2),
                    allowNull: true,
                    comment: "Discount percentage for annual subscription",
                },

                banner_display_type: {
                    type: DataTypes.ENUM(...Object.values(BannerDisplayType)),
                    allowNull: true,
                    comment: "How to display discount banner",
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
                tableName: 'platform_stripe_prices',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        PlatformStripePrice.belongsTo(PlatformStripeProduct, { foreignKey: 'platform_stripe_product_id', as: 'product' });
        PlatformStripePrice.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        PlatformStripePrice.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        PlatformStripePrice.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        PlatformStripePrice.hasMany(PlatformUserSubscription, { foreignKey: 'platform_stripe_price_id', as: 'subscriptions' });
    }

    static initHooks(): void { }
}

export default PlatformStripePrice;
