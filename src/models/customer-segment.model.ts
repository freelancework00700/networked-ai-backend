import Segment from './segment.model';
import Customer from './customer.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class CustomerSegment extends Model {
    public id!: string;
    public customer_id!: string;
    public segment_id!: string;

    static initModel(connection: Sequelize): void {
        CustomerSegment.init(
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
                segment_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'segments', key: 'id' },
                    onDelete: 'CASCADE',
                },
            },
            {
                tableName: 'customer_segments',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        CustomerSegment.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
        CustomerSegment.belongsTo(Segment, { foreignKey: 'segment_id', as: 'segment' });
    }

    static initHooks(): void {}
}

export default CustomerSegment;
