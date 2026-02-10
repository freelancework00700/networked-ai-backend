import User from './user.model';
import { FeatureKey } from '../types/enums';
import { DataTypes, Model, Sequelize } from 'sequelize';
import PlatformStripeProduct from './platform-stripe-product.model';

export class PlatformStripeProductFeature extends Model {
    public id!: string;
    public platform_stripe_product_id!: string;
    public feature_key!: FeatureKey;
    public limit_value!: number;

    public created_at!: Date;
    public updated_at!: Date;
    public created_by!: string | null;
    public updated_by!: string | null;

    static initModel(connection: Sequelize): void {
        PlatformStripeProductFeature.init(
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

                feature_key: {
                    type: DataTypes.ENUM(...Object.values(FeatureKey)),
                    allowNull: false,
                },

                limit_value: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    comment: "Maximum allowed value for this feature",
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
                tableName: 'platform_stripe_product_features',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        PlatformStripeProductFeature.belongsTo(PlatformStripeProduct, { foreignKey: 'platform_stripe_product_id', as: 'product' });
        PlatformStripeProductFeature.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        PlatformStripeProductFeature.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
    }

    static initHooks(): void { }
}

export default PlatformStripeProductFeature;
