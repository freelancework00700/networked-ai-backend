import { Transaction } from 'sequelize';
import { CommentLike, FeedComment, User } from '../models/index';
import feedCommentService from './feed-comment.service';

const findByCommentId = async (commentId: string): Promise<CommentLike[]> => {
    return CommentLike.findAll({
        where: { comment_id: commentId, is_deleted: false },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
            },
        ],
        order: [['created_at', 'DESC']],
    });
};

const findByUserId = async (userId: string) => {
    return CommentLike.findAll({
        where: { user_id: userId, is_deleted: false },
        include: [
            {
                model: FeedComment,
                as: 'comment',
                attributes: ['id', 'comment', 'total_likes', 'total_replies', 'created_at'],
            },
        ],
        order: [['created_at', 'DESC']],
    });
};

const findByCommentIdAndUserId = async (commentId: string, userId: string) => {
    return CommentLike.findOne({
        where: { comment_id: commentId, user_id: userId, is_deleted: false },
    });
};

const createCommentLike = async (commentId: string, userId: string, createdBy: string, transaction: Transaction) => {
    const existing = await findByCommentIdAndUserId(commentId, userId);
    if (existing) {
        return existing; // Already liked
    }

    const liked = await CommentLike.create({
        comment_id: commentId,
        user_id: userId,
        created_by: createdBy,
    }, { transaction });

    await feedCommentService.incrementCommentLikeCount(commentId, transaction);

    return liked;
};

const removeCommentLike = async (commentId: string, userId: string, deletedBy: string, transaction: Transaction) => {
    const liked = await CommentLike.findOne({
        where: { comment_id: commentId, user_id: userId }
    });

    if (!liked) {
        return null;
    }

    // Hard delete - remove the record completely
    await liked.destroy({ transaction });

    await feedCommentService.decrementCommentLikeCount(commentId, transaction);

    return { deleted: true };
};

const checkIfLiked = async (commentId: string, userId: string) => {
    const liked = await findByCommentIdAndUserId(commentId, userId);
    return !!liked;
};

export default {
    findByCommentId,
    findByUserId,
    findByCommentIdAndUserId,
    createCommentLike,
    removeCommentLike,
    checkIfLiked,
};

