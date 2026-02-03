import { DataTypes, Model, Sequelize } from 'sequelize';
import EventQuestion from './event-question.model';
import User from './user.model';

export class EventQuestionOption extends Model {
    public id!: string;
    public question_id!: string;
    public option!: string;
    public order!: number;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventQuestionOption.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                question_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                option: {
                    type: DataTypes.STRING(255),
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
                tableName: 'event_question_options',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventQuestionOption.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventQuestionOption.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventQuestionOption.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        
        EventQuestionOption.belongsTo(EventQuestion, { foreignKey: 'question_id', as: 'question' });
    }

    static initHooks(): void {

    }
}

export default EventQuestionOption;
