import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import GamificationCategory from './gamification-category.model';
import { ContentType } from '../types/enums';

export class UserGamificationPointsLog extends Model {
    public id!: string;
    public user_id!: string | null;
    public gamification_category_id!: string | null;
    public earned_points!: number | null;
    public content_id!: string | null;
    public content_type!: ContentType | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        UserGamificationPointsLog.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                gamification_category_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                // to store the id of the content (like event, post,which message, which QR etc.) associated with the points
                content_id:{
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                earned_points: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: null,
                },
                content_type: {
                    type: DataTypes.ENUM(...Object.values(ContentType)),
                    allowNull: true,
                    defaultValue: null,
                },
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                updated_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                deleted_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'user_gamification_points_log',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        UserGamificationPointsLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserGamificationPointsLog.belongsTo(GamificationCategory, { foreignKey: 'gamification_category_id', as: 'gamification_category' });
        UserGamificationPointsLog.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        UserGamificationPointsLog.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        UserGamificationPointsLog.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {

    }
}

export default UserGamificationPointsLog;

