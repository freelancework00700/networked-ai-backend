import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';

export class ReportReason extends Model {
    public id!: string;
    public reason!: string;
    public order!: number;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        ReportReason.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                reason: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                order: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
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
                tableName: 'report_reasons',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        ReportReason.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        ReportReason.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        ReportReason.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
    }
}

export default ReportReason;

