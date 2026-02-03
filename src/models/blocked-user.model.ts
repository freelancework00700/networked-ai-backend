import { DataTypes, Model, Sequelize } from 'sequelize';
import { User } from './user.model';

export class BlockedUser extends Model {
    public id!: string;
    public user_id!: string;
    public peer_id!: string;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        BlockedUser.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                peer_id: {
                    type: DataTypes.UUID,
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
                tableName: 'blocked_users',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        BlockedUser.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        BlockedUser.belongsTo(User, { foreignKey: 'peer_id', as: 'peer' });

        BlockedUser.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        BlockedUser.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        BlockedUser.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {

    }
}

export default BlockedUser;
