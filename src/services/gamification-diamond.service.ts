import { Op, Transaction } from "sequelize";
import { GamificationDiamond, User } from "../models/index";
import env from "../utils/validate-env";

const gamificationDiamondAttributes = [
  "id",
  "color",
  "points",
  "description",
  "icon_url",
];

/** Get all gamification diamonds with optional search query. */
const getAllGamificationDiamonds = async (search: string = "") => {
  const whereClause: any = { is_deleted: false };

  if (search) {
    whereClause[Op.or] = [
      { color: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const diamonds = await GamificationDiamond.findAll({
    where: whereClause,
    attributes: gamificationDiamondAttributes,
    order: [["points", "ASC"]],
  });

  return diamonds;
};

/** Get all gamification diamonds with pagination and search query. */
const getAllGamificationDiamondsPaginated = async (
  page: number = 1,
  limit: number = 10,
  search: string = ""
) => {
  const whereClause: any = { is_deleted: false };
  const offset = (Number(page) - 1) * Number(limit);

  if (search) {
    whereClause[Op.or] = [
      { color: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows: diamonds } = await GamificationDiamond.findAndCountAll({
    attributes: gamificationDiamondAttributes,
    where: whereClause,
    order: [["points", "ASC"]],
    limit: Number(limit),
    offset,
  });

  return {
    data: diamonds,
    pagination: {
      totalCount: count,
      currentPage: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
};

/** Get a gamification diamond by id. */
const getGamificationDiamondById = async (
  id: string,
  transaction?: Transaction
) => {
  return await GamificationDiamond.findOne({
    attributes: gamificationDiamondAttributes,
    where: {
      id,
      is_deleted: false,
    },
    transaction,
  });
};

/** Get a gamification diamond by color. */
const getGamificationDiamondByColor = async (
  color: string,
  excludeDiamondId?: string
) => {
  const whereClause: any = { color, is_deleted: false };

  if (excludeDiamondId) {
    whereClause.id = { [Op.ne]: excludeDiamondId };
  }

  return await GamificationDiamond.findOne({ where: whereClause });
};

/** Create a new gamification diamond. */
const createGamificationDiamond = async (
  data: Partial<GamificationDiamond>,
  userId: string,
  transaction?: Transaction
) => {
  return await GamificationDiamond.create(
    {
      ...data,
      created_by: userId,
      updated_by: userId,
    },
    { transaction }
  );
};

/** Update a gamification diamond. */
const updateGamificationDiamond = async (
  id: string,
  data: Partial<GamificationDiamond>,
  userId: string,
  transaction?: Transaction
) => {
  await GamificationDiamond.update(
    {
      ...data,
      updated_by: userId,
    },
    {
      where: { id, is_deleted: false },
      transaction,
    }
  );
};

/** Delete a gamification diamond (soft delete). */
const deleteGamificationDiamond = async (
  id: string,
  userId: string,
  transaction?: Transaction
) => {
  await GamificationDiamond.update(
    {
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: userId,
    },
    {
      where: { id, is_deleted: false },
      transaction,
    }
  );
};

/** Get user diamond status based on user's total gamification points. */
const getUserDiamondStatusByUserId = async (
  userId: string,
  transaction?: Transaction
) => {
  // Fetch user's total_gamification_points
  const user = await User.findOne({
    where: { id: userId, is_deleted: false },
    attributes: ["total_gamification_points"],
    transaction,
  });

  if (!user) {
    return null;
  }

  const totalPoints = user.total_gamification_points || 0;

  // Find the highest diamond level that the user qualifies for
  // (the diamond with the highest points that is <= user's total points)
  const currentDiamond = await GamificationDiamond.findOne({
    attributes: gamificationDiamondAttributes,
    where: {
      points: { [Op.lte]: totalPoints },
      is_deleted: false,
    },
    order: [["points", "DESC"]],
    transaction,
  });

  // Find the next diamond level (the diamond with the lowest points that is > user's total points)
  const nextDiamond = await GamificationDiamond.findOne({
    attributes: gamificationDiamondAttributes,
    where: {
      points: { [Op.gt]: totalPoints },
      is_deleted: false,
    },
    order: [["points", "ASC"]],
    transaction,
  });

  // Calculate points needed to reach next diamond
  const pointsNeeded = nextDiamond ? nextDiamond.points - totalPoints : null;

  if (currentDiamond?.icon_url)
    currentDiamond.icon_url = env.API_URL + currentDiamond.icon_url;
  if (nextDiamond?.icon_url)
    nextDiamond.icon_url = env.API_URL + nextDiamond.icon_url;

  return {
    currentDiamond: currentDiamond,
    nextDiamond: nextDiamond,
    pointsNeeded,
  };
};

export default {
  getAllGamificationDiamonds,
  getAllGamificationDiamondsPaginated,
  getGamificationDiamondById,
  getGamificationDiamondByColor,
  createGamificationDiamond,
  updateGamificationDiamond,
  deleteGamificationDiamond,
  getUserDiamondStatusByUserId,
};
