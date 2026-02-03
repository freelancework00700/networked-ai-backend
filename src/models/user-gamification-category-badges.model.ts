import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import GamificationCategory from './gamification-category.model';
import GamificationBadge from './gamification-badge.model';

export class UserGamificationCategoryBadges extends Model {
    public id!: string;
    public user_id!: string;
    public gamification_category_id!: string;
    public gamification_badge_id!: string;
    public completed_date!: Date;
    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        UserGamificationCategoryBadges.init(
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
                gamification_category_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                gamification_badge_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                completed_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
            },
            {
                tableName: 'user_gamification_category_badges',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        UserGamificationCategoryBadges.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserGamificationCategoryBadges.belongsTo(GamificationCategory, { foreignKey: 'gamification_category_id', as: 'gamification_category' });
        UserGamificationCategoryBadges.belongsTo(GamificationBadge, { foreignKey: 'gamification_badge_id', as: 'gamification_badge' });
    }

    static initHooks(): void {

    }
}

export default UserGamificationCategoryBadges;

