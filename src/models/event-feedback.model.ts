import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Event from './event.model';
import EventFeedbackQuestion from './event-question.model';
import EventQuestionOption from './event-question-option.model';

export class EventFeedback extends Model {
    public id!: string;
    public event_id!: string;
    public user_id!: string;
    public question_id!: string;
    public answer_option_id!: string | null; // single_choice, multiple_choice
    public answer!: string | null; // text, number, phone number, rating
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventFeedback.init(
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
                question_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                answer_option_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                answer: {
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
                tableName: 'event_feedbacks',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventFeedback.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventFeedback.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventFeedback.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        
        EventFeedback.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        EventFeedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        EventFeedback.belongsTo(EventFeedbackQuestion, { foreignKey: 'question_id', as: 'question' });
        EventFeedback.belongsTo(EventQuestionOption, { foreignKey: 'answer_option_id', as: 'answer_option' });
    }

    static initHooks(): void {

    }
}

export default EventFeedback;
