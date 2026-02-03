import { DataTypes, Model, Sequelize } from 'sequelize';
import Event from './event.model';
import User from './user.model';
import ReportReason from './report-reason.model';

export class EventReport extends Model {
    public id!: string;
    public event_id!: string;
    public user_id!: string;
    public report_reason_id!: string;
    public reason!: string | null;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventReport.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                event_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                report_reason_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                reason: {
                    type: DataTypes.TEXT,
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
                tableName: 'event_reports',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventReport.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventReport.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventReport.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        EventReport.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        EventReport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        EventReport.belongsTo(ReportReason, { foreignKey: 'report_reason_id', as: 'report_reason' });
    }

    static initHooks(): void {

    }
}

export default EventReport;

