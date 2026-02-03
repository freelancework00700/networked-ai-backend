import { IncludeOptions, Op, Sequelize } from 'sequelize';
import { Transaction } from 'sequelize/lib/transaction';
import { CommentLike, CommentMention, FeedComment, User } from '../models/index';
import feedService from './feed.service';

const userAttributes = ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'];

const IncludeClause = [
    {
        model: User,
        as: 'user',
        attributes: userAttributes,
    },
    {
        model: User,
        as: 'comment_mentions',
        required: false,
        through: { attributes: [] },
        attributes: userAttributes,
    }
]

const findByFeedId = async (feedId: string, includeReplies: boolean = true, page: number = 1, limit: number = 10) => {
    const where: Partial<FeedComment> = {
        feed_id: feedId,
        is_deleted: false,
        parent_comment_id: null // Only top-level comments
    };

    const offset = (Number(page) - 1) * Number(limit);

    const includes: IncludeOptions[] = IncludeClause;

    if (includeReplies) {
        includes.push({
            model: FeedComment,
            as: 'replies',
            order: [['created_at', 'DESC']],
            separate: true,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: userAttributes,
                },
                {
                    model: User,
                    as: 'comment_mentions',
                    required: false,
                    through: { attributes: [] },
                    attributes: userAttributes,
                }
            ],
            where: { is_deleted: false },
            required: false,
        });
    }

    const { count, rows: comments } = await FeedComment.findAndCountAll({
        where,
        include: includes,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: comments,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

const findByParentCommentId = async (parentCommentId: string) => {
    return FeedComment.findAll({
        where: { parent_comment_id: parentCommentId, is_deleted: false },
        include: IncludeClause,
        order: [['created_at', 'ASC']]
    });
};

const findByUserId = async (userId: string, page: number = 1, limit: number = 10) => {
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: comments } = await FeedComment.findAndCountAll({
        where: { user_id: userId, is_deleted: false, parent_comment_id: null },
        include: [...IncludeClause,
        {
            model: FeedComment,
            as: 'replies',
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: userAttributes,
                },
                {
                    model: User,
                    as: 'comment_mentions',
                    required: false,
                    through: { attributes: [] },
                    attributes: userAttributes,
                }
            ],
            where: { is_deleted: false },
            required: false,
        }],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: comments,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

const findById = async (id: string, userId: string | null = null, includeOtherDetails: boolean = false) => {
    const comment = await FeedComment.findOne({
        where: { id, is_deleted: false },
        include: [...IncludeClause,
        {
            model: FeedComment,
            as: 'parent_comment',
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: userAttributes,
                },
                {
                    model: User,
                    as: 'comment_mentions',
                    required: false,
                    through: { attributes: [] },
                    attributes: userAttributes,
                }
            ],
            required: false,
        }
        ]
    });
    if (!comment) {
        return null;
    }

    if (!includeOtherDetails) {
        return comment;
    }

    const likedCommentIds = await checkUserLikedComments([comment.id], userId);
    return transformCommentWithLike(comment, likedCommentIds);
};

const createCommentMentions = async (commentId: string, mentionIds: string[] | undefined, createdBy: string, transaction: Transaction) => {
    if (!(mentionIds && mentionIds.length > 0)) {
        return;
    }
    // Remove duplicates
    const uniqueMentionIds = [...new Set(mentionIds)];

    await CommentMention.bulkCreate(
        uniqueMentionIds.map(mentionId => ({
            comment_id: commentId,
            user_id: mentionId,
            created_by: createdBy,
            mentioned_by: createdBy,
        })),
        { transaction }
    );

}

const updateCommentMentions = async (commentId: string, mentionIds: string[] | undefined, updatedBy: string, transaction: Transaction) => {
    await CommentMention.destroy({
        where: { comment_id: commentId },
        transaction,
    });
    // Create new comment mentions if provided
    if (mentionIds && mentionIds.length > 0) {
        await createCommentMentions(commentId, mentionIds, updatedBy, transaction);
    }
}

const createComment = async (feedId: string, userId: string, comment: string, parentCommentId: string | null, createdBy: string, mentionIds: string[] | undefined, transaction: Transaction) => {
    // Create new comment
    const newComment = await FeedComment.create({
        feed_id: feedId,
        user_id: userId,
        comment,
        parent_comment_id: parentCommentId,
        created_by: createdBy,
    }, { transaction });

    if (mentionIds && mentionIds.length > 0) {
        await createCommentMentions(newComment.id, mentionIds, createdBy, transaction);
    }

    // If it's a reply, increment parent comment's reply count
    if (parentCommentId) {
        await FeedComment.increment('total_replies', {
            where: { id: parentCommentId, is_deleted: false },
            by: 1,
            transaction
        });
    } else {
        // If it's a top-level comment, increment feed comment count
        await feedService.incrementFeedTotals(feedId, 'total_comments', transaction);
    }

    return newComment;
};

const updateComment = async (id: string, comment: string, updatedBy: string, mentionIds: string[] | undefined, transaction: Transaction) => {
    await FeedComment.update(
        { comment, updated_by: updatedBy },
        {
            where: { id, is_deleted: false },
        }
    );

    if (mentionIds && mentionIds.length > 0) {
        await updateCommentMentions(id, mentionIds, updatedBy, transaction);
    }
};

const softDelete = async (id: string, deletedBy: string, transaction: Transaction) => {
    const comment = await FeedComment.findByPk(id);
    if (!comment || comment.is_deleted) {
        return null;
    }

    // Find all replies to this comment (direct children)
    const replies = await FeedComment.findAll({
        where: { parent_comment_id: id, is_deleted: false }
    });

    // Recursively soft delete all replies
    for (const reply of replies) {
        await softDelete(reply.id, deletedBy, transaction);
    }

    // Soft delete the comment itself
    comment.is_deleted = true;
    comment.deleted_at = new Date();
    comment.deleted_by = deletedBy;
    await comment.save({ transaction });

    // If it's a reply, decrement parent comment's reply count
    if (comment.parent_comment_id) {
        await FeedComment.increment('total_replies', {
            where: {
                id: comment.parent_comment_id,
                is_deleted: false,
                [Op.and]: [
                    Sequelize.literal(`\`total_replies\` > 0`)
                ]
            },
            by: -1,
            transaction
        });
    } else {
        // If it's a top-level comment, decrement feed comment count
        await feedService.decrementFeedTotals(comment.feed_id, 'total_comments', transaction);
    }

    return comment;
};

const incrementCommentLikeCount = async (id: string, transaction: Transaction) => {
    await FeedComment.increment('total_likes', {
        where: { id, is_deleted: false },
        by: 1,
        transaction
    });
};

const decrementCommentLikeCount = async (id: string, transaction: Transaction) => {
    await FeedComment.increment('total_likes', {
        where: {
            id,
            is_deleted: false,
            [Op.and]: [
                Sequelize.literal(`\`total_likes\` > 0`)
            ]
        },
        by: -1,
        transaction
    });
};

/** Check if user has liked specific comments */
const checkUserLikedComments = async (
    commentIds: string[],
    userId: string | null
): Promise<Set<string>> => {
    if (!userId || commentIds.length === 0) {
        return new Set();
    }

    const likedComments = await CommentLike.findAll({
        where: {
            comment_id: commentIds,
            user_id: userId,
            is_deleted: false,
        },
        attributes: ['comment_id'],
        raw: true,
    });

    return new Set(likedComments.map(like => like.comment_id));
};

/** Collect all comment IDs recursively */
const collectAllCommentIds = (comments: FeedComment[]): string[] => {
    return comments.flatMap(comment => {
        // Convert to plain object if it's a Sequelize instance
        const commentJson = comment?.toJSON ? comment.toJSON() : comment;
        if (!commentJson?.id) return [];

        const ids = [commentJson.id];
        if (Array.isArray(commentJson.replies)) {
            ids.push(...collectAllCommentIds(commentJson.replies));
        }
        return ids;
    });
};

/** Recursively transform comment with is_like flag */
const transformCommentWithLike = (
    comment: FeedComment,
    likedIds: Set<string>
): FeedComment => {
    // Convert to plain object to avoid circular references
    const commentJson = comment?.toJSON ? comment.toJSON() : comment;
    if (!commentJson) return comment;

    const isLiked = commentJson?.id ? likedIds.has(commentJson.id) : false;

    const transformed: any = {
        ...commentJson,
        is_like: isLiked,
    };

    // Recursively transform replies if they exist
    if (Array.isArray(commentJson.replies)) {
        transformed.replies = commentJson.replies.map((reply: any) =>
            transformCommentWithLike(reply, likedIds)
        );
    }

    return transformed;
};

/** Transform multiple comments to include is_like flags */
const transformCommentsWithLike = async (
    comments: FeedComment[],
    userId: string | null = null
): Promise<FeedComment[]> => {
    if (!comments || comments.length === 0) return [];

    // Convert all comments to plain objects once
    const commentsJson = comments.map(c =>
        c.toJSON ? c.toJSON() : c
    );

    const allCommentIds = collectAllCommentIds(commentsJson);
    const likedCommentIds = await checkUserLikedComments(allCommentIds, userId);

    return commentsJson.map(comment =>
        transformCommentWithLike(comment, likedCommentIds)
    );
};

export default {
    findByFeedId,
    findByParentCommentId,
    findByUserId,
    findById,
    createComment,
    updateComment,
    softDelete,
    incrementCommentLikeCount,
    decrementCommentLikeCount,
    checkUserLikedComments,
    transformCommentWithLike,
    transformCommentsWithLike,
};

