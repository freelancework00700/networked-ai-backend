import User from './user.model';
import { FeatureKey } from '../types/enums';
import { DataTypes, Model, Sequelize } from 'sequelize';
import PlatformUserSubscription from './platform-user-subscription.model';

export class PlatformUserFeatureUsage extends Model {
    public id!: string;
    public platform_user_subscription_id!: string;
    public feature_key!: FeatureKey;
    public limit_value!: number;
    public used_value!: number;

    public created_at!: Date;
    public updated_at!: Date;
    public created_by!: string | null;
    public updated_by!: string | null;

    static initModel(connection: Sequelize): void {
        PlatformUserFeatureUsage.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },

                platform_user_subscription_id: {
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
                    comment: "Copied at purchase time from product feature",
                },

                used_value: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: "Incremented as user consumes the feature",
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
                tableName: 'platform_user_feature_usage',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        PlatformUserFeatureUsage.belongsTo(PlatformUserSubscription, { foreignKey: 'platform_user_subscription_id', as: 'subscription' });
        PlatformUserFeatureUsage.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        PlatformUserFeatureUsage.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
    }

    static initHooks(): void { }
}

export default PlatformUserFeatureUsage;
