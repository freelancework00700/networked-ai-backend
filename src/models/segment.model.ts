import User from './user.model';
import Customer from './customer.model';
import CustomerSegment from './customer-segment.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class Segment extends Model {
    public id!: string;
    public name!: string;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        Segment.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: {
                    type: DataTypes.STRING(255),
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
                tableName: 'segments',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        Segment.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Segment.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Segment.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        Segment.belongsToMany(Customer, { through: CustomerSegment, foreignKey: 'segment_id', otherKey: 'customer_id', as: 'customers' });
    }

    static initHooks(): void {}
}

export default Segment;
