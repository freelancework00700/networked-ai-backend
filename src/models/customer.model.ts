import Tag from './tag.model';
import User from './user.model';
import Segment from './segment.model';
import CustomerTag from './customer-tag.model';
import CustomerSegment from './customer-segment.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class Customer extends Model {
    public id!: string;
    public name!: string;
    public email!: string | null;
    public mobile!: string | null;
    public is_deleted!: boolean;

    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        Customer.init(
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
                email: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                mobile: {
                    type: DataTypes.STRING(50),
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
                tableName: 'customers',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        Customer.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Customer.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Customer.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
        Customer.belongsToMany(Segment, { through: CustomerSegment, foreignKey: 'customer_id', otherKey: 'segment_id', as: 'segments' });
        Customer.belongsToMany(Tag, { through: CustomerTag, foreignKey: 'customer_id', otherKey: 'tag_id', as: 'tags' });
    }

    static initHooks(): void {}
}

export default Customer;
