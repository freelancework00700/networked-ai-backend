import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import { MediaContext, MediaType, MediaVariant } from '../types/enums';

export class Media extends Model {
    public id!: string;
    public filename!: string;
    public type!: MediaType;
    public extension!: string;
    public context!: MediaContext;
    public variant!: MediaVariant;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        Media.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                filename: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                type: {
                    type: DataTypes.ENUM(...Object.values(MediaType)),
                    allowNull: false,
                },
                extension: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                context: {
                    type: DataTypes.ENUM(...Object.values(MediaContext)),
                    allowNull: false,
                    defaultValue: MediaContext.OTHER,
                },
                variant: {
                    type: DataTypes.ENUM(...Object.values(MediaVariant)),
                    allowNull: false,
                    defaultValue: MediaVariant.ORIGINAL,
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
                tableName: 'media',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        Media.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Media.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Media.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
        
    }
}

export default Media;

