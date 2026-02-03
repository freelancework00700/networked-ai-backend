import { DataTypes, Model, Sequelize } from 'sequelize';
import Feed from './feed.model';
import User from './user.model';
import ReportReason from './report-reason.model';

/**
 * FeedReport model
 */
export class FeedReport extends Model {
    public id!: string;
    public feed_id!: string;
    public user_id!: string;
    public reason_id!: string | null;
    public reason!: string | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        FeedReport.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                feed_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                reason_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                reason: {
                    type: DataTypes.TEXT,
                    allowNull: true,
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
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'feed_report',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                indexes: [
                    { fields: ['feed_id'] },
                    { fields: ['user_id'] },
                    { fields: ['reason_id'] },
                ],
            }
        );
    }

    static initAssociations(): void {
        FeedReport.belongsTo(Feed, { foreignKey: 'feed_id', as: 'feed' });
        FeedReport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        FeedReport.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        FeedReport.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        FeedReport.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        FeedReport.belongsTo(ReportReason, { foreignKey: 'reason_id', as: 'report_reason' });
    }

    static initHooks(): void {
    }
}

export default FeedReport;

