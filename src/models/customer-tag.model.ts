import Tag from './tag.model';
import Customer from './customer.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class CustomerTag extends Model {
    public id!: string;
    public customer_id!: string;
    public tag_id!: string;

    static initModel(connection: Sequelize): void {
        CustomerTag.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                customer_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'customers', key: 'id' },
                    onDelete: 'CASCADE',
                },
                tag_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'tags', key: 'id' },
                    onDelete: 'CASCADE',
                },
            },
            {
                tableName: 'customer_tags',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        CustomerTag.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
        CustomerTag.belongsTo(Tag, { foreignKey: 'tag_id', as: 'tag' });
    }

    static initHooks(): void {}
}

export default CustomerTag;
