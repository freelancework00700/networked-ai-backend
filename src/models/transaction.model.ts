import User from "./user.model";
import Event from "./event.model";
import StripePrice from "./stripe-price.model";
import StripeProduct from "./stripe-product.model";
import { DataTypes, Model, Sequelize } from "sequelize";
import { TransactionStatus, TransactionType } from "../types/enums";

export class Transaction extends Model {
  public id!: string;
  public type!: TransactionType;
  public product_id!: string | null;
  public price_id!: string | null;
  public event_id!: string | null;
  public user_id!: string;
  public stripe_payment_intent_id!: string;
  public amount!: number;
  public currency!: string;
  public status!: TransactionStatus;
  public payment_method!: string | null;
  public transfer_amount!: number | null;
  public host_user_id!: string | null;
  public metadata!: string | null;
  public is_deleted!: boolean;
  public created_by!: string | null;
  public updated_by!: string | null;
  public deleted_by!: string | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

  static initModel(connection: Sequelize): void {
    Transaction.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        type: {
          type: DataTypes.ENUM(...Object.values(TransactionType)),
          allowNull: false,
        },

        product_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },

        price_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },

        event_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },

        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Payer user ID",
        },

        stripe_payment_intent_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },

        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          comment: "Amount in dollars",
        },

        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: "usd",
        },

        status: {
          type: DataTypes.ENUM(...Object.values(TransactionStatus)),
          allowNull: false,
          defaultValue: TransactionStatus.PENDING,
        },

        payment_method: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: "Payment method type",
        },

        transfer_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: "Amount transferred to host (90%)",
        },

        host_user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Product creator/host user ID",
        },

        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Additional transaction data as JSON",
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
        tableName: "transactions",
        sequelize: connection,
        freezeTableName: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          {
            fields: ["user_id"],
          },
          {
            fields: ["host_user_id"],
          },
          {
            fields: ["product_id"],
          },
          {
            fields: ["price_id"],
          },
          {
            fields: ["event_id"],
          },
          {
            unique: true,
            fields: ["stripe_payment_intent_id"],
          },
        ],
      }
    );
  }

  static initAssociations(): void {
    Transaction.belongsTo(User, { foreignKey: "user_id", as: "user" });
    Transaction.belongsTo(Event, {foreignKey: "event_id", as: "event" });
    Transaction.belongsTo(User, { foreignKey: "host_user_id", as: "host_user" });
    Transaction.belongsTo(StripePrice, {foreignKey: "price_id", as: "price" });
    Transaction.belongsTo(User, {foreignKey: "created_by", as: "created_by_user" });
    Transaction.belongsTo(User, {foreignKey: "updated_by", as: "updated_by_user" });
    Transaction.belongsTo(User, {foreignKey: "deleted_by", as: "deleted_by_user" });
    Transaction.belongsTo(StripeProduct, {foreignKey: "product_id", as: "product" });
  }

  static initHooks(): void {}
}

export default Transaction;


