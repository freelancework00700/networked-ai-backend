import User from "./user.model";
import StripePrice from "./stripe-price.model";
import StripeProduct from "./stripe-product.model";
import { SubscriptionStatus } from "../types/enums";
import { DataTypes, Model, Sequelize } from "sequelize";

export class Subscription extends Model {
  public id!: string;
  public user_id!: string;
  public owner_id!: string;
  public product_id!: string;
  public price_id!: string;
  public stripe_subscription_id!: string;
  public status!: SubscriptionStatus;
  public start_date!: Date;
  public end_date!: Date;
  public cancel_at_end_date!: boolean;
  public canceled_at!: Date | null;
  public is_deleted!: boolean;
  public created_by!: string | null;
  public updated_by!: string | null;
  public deleted_by!: string | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

  static initModel(connection: Sequelize): void {
    Subscription.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        stripe_subscription_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },

        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Subscriber user ID",
        },

        owner_id: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Owner/Creator user ID",
        },

        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },

        price_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
          allowNull: false,
          defaultValue: SubscriptionStatus.UNPAID,
        },

        start_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        
        end_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },

        cancel_at_end_date: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        canceled_at: {
          type: DataTypes.DATE,
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
        tableName: "subscriptions",
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
            fields: ["owner_id"],
          },
          {
            fields: ["product_id"],
          },
          {
            fields: ["price_id"],
          },
          {
            unique: true,
            fields: ["stripe_subscription_id"],
          },
        ],
      }
    );
  }

  static initAssociations(): void {
    Subscription.belongsTo(User, {foreignKey: "owner_id", as: "owner"});
    Subscription.belongsTo(User, {foreignKey: "user_id", as: "user"});
    Subscription.belongsTo(StripePrice, {foreignKey: "price_id", as: "price" });
    Subscription.belongsTo(StripeProduct, {foreignKey: "product_id", as: "product"});
    Subscription.belongsTo(User, {foreignKey: "created_by", as: "created_by_user"});
    Subscription.belongsTo(User, {foreignKey: "updated_by", as: "updated_by_user"});
    Subscription.belongsTo(User, {foreignKey: "deleted_by", as: "deleted_by_user"});
  }

  static initHooks(): void {}
}

export default Subscription;


