import { Transaction } from 'sequelize';
import { CommentReport, FeedComment, User, Feed } from '../models/index';

const IncludeClause = [
    {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
    },
    {
        model: FeedComment,
        as: 'comment',
        include: [
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
        ],
    },
];

const getAllCommentReport = async (commentId?: string, userId?: string) => {
    const where: Partial<CommentReport> = { is_deleted: false };
    if (commentId) where.comment_id = commentId;
    if (userId) where.user_id = userId;

    return CommentReport.findAll({
        where,
        include: IncludeClause,
        order: [['created_at', 'DESC']],
    });
};

const findById = async (id: string) => {
    return CommentReport.findOne({
        where: { id, is_deleted: false },
        include: IncludeClause,
    });
};

const createReport = async (data: Partial<CommentReport>, transaction?: Transaction) => {
    return CommentReport.create(data, { transaction });
};

const updateReport = async (id: string, data: Partial<CommentReport>, transaction?: Transaction) => {
    await CommentReport.update(data, {
        where: { id, is_deleted: false },
        transaction,
    });
    return await findById(id);
};

const deleteReport = async (id: string, deletedBy?: string, transaction?: Transaction) => {
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

const findByCommentId = async (commentId: string) => {
    return getAllCommentReport(commentId);
};

const findByUserId = async (userId: string) => {
    return getAllCommentReport(undefined, userId);
};

export default {
    getAllCommentReport,
    findById,
    createReport,
    updateReport,
    deleteReport,
    findByCommentId,
    findByUserId,
};

