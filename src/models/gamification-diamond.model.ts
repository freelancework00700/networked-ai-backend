import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';

export class GamificationDiamond extends Model {
    public id!: string;
    public color!: string;
    public points!: number;
    public description!: string | null;
    public priority!: number | null;
    public icon_url!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        GamificationDiamond.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                color: {
                    type: DataTypes.STRING(45),
                    allowNull: false,
                },
                points: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                priority: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                icon_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
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
                tableName: 'gamification_diamonds',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        GamificationDiamond.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        GamificationDiamond.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        GamificationDiamond.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {

    }
}

export default GamificationDiamond;

