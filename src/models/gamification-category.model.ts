import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';

export class GamificationCategory extends Model {
    public id!: string;
    public category_name!: string;
    public earned_point!: number;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        GamificationCategory.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                category_name: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                earned_point: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
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
                tableName: 'gamification_category',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        GamificationCategory.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        GamificationCategory.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        GamificationCategory.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {

    }
}

export default GamificationCategory;

