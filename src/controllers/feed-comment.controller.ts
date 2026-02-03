import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import feedCommentService from '../services/feed-comment.service';
import feedService from '../services/feed.service';
import notificationService from '../services/notification.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse } from '../utils/response.service';
import { emitFeedCommentCreated, emitFeedCommentDeleted, emitFeedCommentUpdated, emitFeedUpdated } from '../socket/event';
import { FeedLiked } from '../models/feed-liked.model';
import { CommentLike } from '../models/comment-like.model';

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feed_id, comment, parent_comment_id, mention_ids } = req.body;

        // Check if feed exists
        const feed = await feedService.getFeedById(feed_id, authenticatedUser.id, false);
        if (!feed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feed.notFound);
        }

        let parentComment = null;
        // If it's a reply, check if parent comment exists
        if (parent_comment_id) {
            parentComment = await feedCommentService.findById(parent_comment_id);
            if (!parentComment) {
                await transaction.rollback();
                return sendNotFoundResponse(res, responseMessages.feedCommented.parentCommentNotFound);
            }
            // Ensure parent comment belongs to the same feed
            if (parentComment.feed_id !== feed_id) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.feedCommented.commentMismatch);
            }
        }

        const newComment = await feedCommentService.createComment(
            feed_id,
            authenticatedUser.id,
            comment,
            parent_comment_id || null,
            authenticatedUser.id,
            mention_ids || undefined,
            transaction
        );

        const commenterName = (authenticatedUser as any).name || (authenticatedUser as any).username || 'Someone';
        const postOwnerId = (feed as any).user_id;

        const commentContent = (newComment as any).comment;
        if (parent_comment_id) {
            const parentAuthorId = (parentComment as any).user_id;
            if (parentAuthorId && parentAuthorId !== authenticatedUser.id) {
                await notificationService.sendCommentReplyNotification(parentAuthorId, authenticatedUser.id, commenterName, newComment.id, feed_id, transaction, commentContent);
            }
        } else if (postOwnerId && postOwnerId !== authenticatedUser.id) {
            await notificationService.sendPostCommentedNotification(postOwnerId, authenticatedUser.id, commenterName, feed_id, newComment.id, transaction, commentContent);
        }

        if (mention_ids && Array.isArray(mention_ids) && mention_ids.length > 0) {
            const uniqueMentions = [...new Set(mention_ids)].filter((id: string) => id && id !== authenticatedUser.id);
            await Promise.all(
                uniqueMentions.map((mentionedUserId: string) =>
                    notificationService.sendMentionNotification(mentionedUserId, authenticatedUser.id, commenterName, feed_id, newComment.id, transaction, commentContent)
                )
            );
        }

        await transaction.commit();
        const commentWithRelations = await feedCommentService.findById(newComment.id);

        // Emit real-time feed comment event
        emitFeedCommentCreated({
            feed_id,
            comment: commentWithRelations || newComment
        });

        if (parent_comment_id) {
            await emitFeedCommentUpdated(parent_comment_id, feed_id, feedCommentService, CommentLike);
        } else {
            await emitFeedUpdated(feed_id, feedService, FeedLiked);
        }

        return sendSuccessResponse(res, responseMessages.feedCommented.commentAdded, { content: commentWithRelations });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating comment: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToCreate, error);
        next(error);
    }
};

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;

        const { id } = req.params;
        const { comment, mention_ids } = req.body;

        // Check if comment exists
        const existingComment = await feedCommentService.findById(id as string);
        if (!existingComment) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        // Check if user owns the comment or is admin
        if (existingComment.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.feedCommented.forbidden);
        }

        await feedCommentService.updateComment(id as string, comment, authenticatedUser.id, mention_ids || undefined, transaction);
        
        await transaction.commit();

        // Fetch the updated comment with relations
        const commentWithRelations = await feedCommentService.findById(id as string, authenticatedUser.id, true);
        await emitFeedCommentUpdated(id as string, existingComment.feed_id, feedCommentService, CommentLike);

        return sendSuccessResponse(res, responseMessages.feedCommented.commentUpdated, { content: commentWithRelations });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating comment: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToUpdate, error);
        next(error);
    }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { id } = req.params;

        // Check if comment exists
        const existingComment = await feedCommentService.findById(id as string);
        if (!existingComment) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        // Check if user owns the comment or is admin
        if (existingComment.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.feedCommented.forbidden);
        }

        const deleted = await feedCommentService.softDelete(id as string, authenticatedUser.id, transaction);

        if (!deleted) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        await transaction.commit();

        emitFeedCommentDeleted({ feed_id: existingComment.feed_id, comment_id: existingComment.id });

        if (existingComment.parent_comment_id) {
            await emitFeedCommentUpdated(existingComment.parent_comment_id, existingComment.feed_id, feedCommentService, CommentLike);
        } else {
            await emitFeedUpdated(existingComment.feed_id, feedService, FeedLiked);
        }
        return sendSuccessResponse(res, responseMessages.feedCommented.commentDeleted, { content: true });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting comment: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToDelete, error);
        next(error);
    }
};

export const getAllCommentsByFeedId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { feedId } = req.params;
        const { page, limit } = req.query;
        const includeReplies = req.query.include_replies !== 'false'; // Default to true
        const authUserId = res.locals.auth?.user?.id ?? null;

        // Check if feed exists
        const feed = await feedService.getFeedById(feedId as string, null, false);
        if (!feed) {
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        const comments = await feedCommentService.findByFeedId(feedId as string, includeReplies, Number(page) || 1, Number(limit) || 10);
        const transformedComments = await feedCommentService.transformCommentsWithLike(comments.data, authUserId);

        return sendSuccessResponse(res, responseMessages.feedCommented.retrieved, {
            ...comments,
            data: transformedComments,
        });
    } catch (error) {
        loggerService.error(`Error getting feed comments: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToFetch, error);
        next(error);
    }
};

export const getCommentReplies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { commentId } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        // Check if parent comment exists
        const parentComment = await feedCommentService.findById(commentId as string);
        if (!parentComment) {
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        const replies = await feedCommentService.findByParentCommentId(commentId as string);
        const transformedReplies = await feedCommentService.transformCommentsWithLike(replies, authUserId);

        return sendSuccessResponse(res, responseMessages.feedCommented.retrieved, {
            content: transformedReplies,
            count: transformedReplies.length
        });
    } catch (error) {
        loggerService.error(`Error getting comment replies: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToFetch, error);
        next(error);
    }
};

export const getCommentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        const comment = await feedCommentService.findById(id as string);
        if (!comment) {
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        // Check if user has liked this comment
        const likedCommentIds = await feedCommentService.checkUserLikedComments([comment.id], authUserId);
        const transformedComment = feedCommentService.transformCommentWithLike(comment, likedCommentIds);

        return sendSuccessResponse(res, responseMessages.feedCommented.retrieved, transformedComment);
    } catch (error) {
        loggerService.error(`Error getting comment: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToFetch, error);
        next(error);
    }
};

export const getUserComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query;
        const userId = req.params.userId;
        const authUserId = res.locals.auth?.user?.id ?? null;

        const comments = await feedCommentService.findByUserId(userId as string, Number(page) || 1, Number(limit) || 10);
        const transformedComments = await feedCommentService.transformCommentsWithLike(comments.data, authUserId);

        return sendSuccessResponse(res, responseMessages.feedCommented.retrieved, {
            ...comments,
            data: transformedComments,
        });
    } catch (error) {
        loggerService.error(`Error getting user comments: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToFetch, error);
        next(error);
    }
};

export const getMyComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query;
        const userId = res.locals.auth?.user?.id;

        const comments = await feedCommentService.findByUserId(userId, Number(page) || 1, Number(limit) || 10);
        const transformedComments = await feedCommentService.transformCommentsWithLike(comments.data, userId);

        return sendSuccessResponse(res, responseMessages.feedCommented.retrieved, {
            ...comments,
            data: transformedComments,
        });
    } catch (error) {
        loggerService.error(`Error getting my comments: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedCommented.failedToFetch, error);
        next(error);
    }
};
