import { Transaction } from "sequelize";
import { FeedLiked, User } from "../models/index";
import feedService from "./feed.service";

const IncludeClause = [
  {
    model: User,
    as: "user",
    attributes: [
      "id",
      "name",
      "username",
      "email",
      "image_url",
      "thumbnail_url",
    ],
  },
];

const findByFeedId = async (feedId: string) => {
  return FeedLiked.findAll({
    where: { feed_id: feedId, is_deleted: false },
    include: IncludeClause,
    order: [["created_at", "DESC"]],
  });
};

const findByUserId = async (userId: string) => {
  return FeedLiked.findAll({
    where: { user_id: userId, is_deleted: false },
    include: IncludeClause,
    order: [["created_at", "DESC"]],
  });
};

const findByFeedIdAndUserId = async (feedId: string, userId: string, transaction?: Transaction) => {
  return FeedLiked.findOne({
    where: { feed_id: feedId, user_id: userId, is_deleted: false },
    transaction,
  });
};

const createLiked = async (feedId: string, userId: string, createdBy: string, transaction: Transaction) => {
  // Check if already liked within transaction to avoid race conditions
  const existing = await findByFeedIdAndUserId(feedId, userId, transaction);
  if (existing) {
    return existing; // Already liked
  }

  // Create new like
  const liked = await FeedLiked.create({
    feed_id: feedId,
    user_id: userId,
    created_by: createdBy,
  }, { transaction });

  // Increment feed like count
  await feedService.incrementFeedTotals(feedId, 'total_likes', transaction);

  return liked;
};

const removeLiked = async (feedId: string, userId: string, deletedBy: string, transaction: Transaction) => {
  const liked = await FeedLiked.findOne({
    where: { feed_id: feedId, user_id: userId, is_deleted: false },
    transaction,
  });

  if (!liked) {
    return null;
  }

  // Hard delete - remove the record completely
  await liked.destroy({ transaction });

  // Decrement feed like count
  await feedService.decrementFeedTotals(feedId, 'total_likes', transaction);

  return { deleted: true };
};

const checkIfLiked = async (feedId: string, userId: string, transaction?: Transaction) => {
  const liked = await findByFeedIdAndUserId(feedId, userId, transaction);
  return !!liked;
};

export default {
  findByFeedId,
  findByUserId,
  findByFeedIdAndUserId,
  createLiked,
  removeLiked,
  checkIfLiked,
};
