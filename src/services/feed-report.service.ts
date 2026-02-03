import { Transaction } from 'sequelize';
import {FeedReport, Feed, User} from '../models/index';

const IncludeClause = [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
            },
            {
                model: Feed,
                as: 'feed',
                attributes: ['id', 'total_likes', 'total_comments', 'total_shares', 'created_at'],
            },
        ];

const getAllReport = async (feedId?: string, userId?: string): Promise<FeedReport[]> => {
    const where: Partial<FeedReport> = { is_deleted: false };
    if (feedId) where.feed_id = feedId;
    if (userId) where.user_id = userId;

    return FeedReport.findAll({
        where,
        include: IncludeClause,
        order: [['created_at', 'DESC']],
    });
};

const findById = async (id: string) => {
    return FeedReport.findOne({
        where: { id, is_deleted: false },
        include: IncludeClause,
    });
};

const create = async (data: Partial<FeedReport>, transaction?: Transaction) => {
    return FeedReport.create(data, { transaction });
};

const update = async (id: string, data: Partial<FeedReport>, transaction?: Transaction) => {
    await FeedReport.update(data, {
        where: { id, is_deleted: false },
        transaction,
    });
    return await findById(id);
};

const softDelete = async (id: string, deletedBy?: string, transaction?: Transaction) => {
    const report = await findById(id);
    if (!report) return null;
    report.is_deleted = true;
    report.deleted_at = new Date();
    if (deletedBy !== undefined) {
        report.deleted_by = deletedBy;
    }
    await report.save({ transaction });
    return report;
};

const findByFeedId = async (feedId: string) => {
    return getAllReport(feedId);
};

const findByUserId = async (userId: string) => {
    return getAllReport(undefined, userId);
};

export default {
    getAllReport,
    findById,
    create,
    update,
    softDelete,
    findByFeedId,
    findByUserId,
};

