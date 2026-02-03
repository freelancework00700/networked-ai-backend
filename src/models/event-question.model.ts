import { DataTypes, Model, Sequelize } from 'sequelize';
import { EventPhase, QuestionType } from '../types/enums';
import EventQuestionOption from './event-question-option.model';
import Event from './event.model';
import User from './user.model';
import EventFeedback from './event-feedback.model';

export class EventQuestion extends Model {
    public id!: string;
    public event_id!: string;
    public question!: string;
    public event_phase!: EventPhase;
    public question_type!: QuestionType;
    public is_required!: boolean;
    public max!: number | null;
    public min!: number | null;
    public rating_scale!: number | null;
    public is_public!: boolean;
    public order!: number;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        EventQuestion.init(
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
                question: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                event_phase: {
                    type: DataTypes.ENUM(...Object.values(EventPhase)),
                    allowNull: false,
                },
                question_type: {
                    type: DataTypes.ENUM(...Object.values(QuestionType)),
                    allowNull: false,
                },
                is_required: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                max: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                min: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                rating_scale: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                is_public: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
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
                tableName: 'event_questions',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        EventQuestion.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        EventQuestion.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        EventQuestion.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        
        EventQuestion.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        
        EventQuestion.hasMany(EventQuestionOption, { foreignKey: 'question_id', as: 'options' });
        EventQuestion.hasMany(EventFeedback, { foreignKey: 'question_id', as: 'feedbacks' });
    }

    static initHooks(): void {

    }
}

export default EventQuestion;
