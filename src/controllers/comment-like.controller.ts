import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import commentLikeService from '../services/comment-like.service';
import feedCommentService from '../services/feed-comment.service';
import notificationService from '../services/notification.service';
import { emitFeedCommentUpdated } from '../socket/event';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';
import { CommentLike } from '../models/comment-like.model';

export const likeUnlikeComment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    let transactionCommitted = false;
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { commentId } = req.params;

        const comment = await feedCommentService.findById(commentId as string, authenticatedUser.id, true);
        if (!comment) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        const isLiked = await commentLikeService.checkIfLiked(commentId as string, authenticatedUser.id);

        if (isLiked) {
            const unliked = await commentLikeService.removeCommentLike(commentId as string, authenticatedUser.id, authenticatedUser.id, transaction);
            if (!unliked) {
                await transaction.rollback();
                return sendNotFoundResponse(res, responseMessages.commentLiked.notFound);
            }
            await transaction.commit();
            transactionCommitted = true;
            
            try {
                await emitFeedCommentUpdated(commentId as string, comment.feed_id, feedCommentService, CommentLike);
                return sendSuccessResponse(res, responseMessages.commentLiked.unliked, { content: false });
            } catch (postCommitError) {
                loggerService.error(`Error in post-commit operations (unlike): ${postCommitError}`);
                return sendSuccessResponse(res, responseMessages.commentLiked.unliked, { content: false });
            }
        }

        const liked = await commentLikeService.createCommentLike(commentId as string, authenticatedUser.id, authenticatedUser.id, transaction);
        const commentAuthorId = (comment as any).user_id;
        if (commentAuthorId && commentAuthorId !== authenticatedUser.id) {
            const likerName = (authenticatedUser as any).name || (authenticatedUser as any).username || 'Someone';
            const commentContent = (comment as any).comment;
            await notificationService.sendCommentLikedNotification(commentAuthorId, authenticatedUser.id, likerName, commentId as string, comment.feed_id, transaction, commentContent);
        }
        await transaction.commit();
        transactionCommitted = true;

        try {
            await emitFeedCommentUpdated(commentId as string, comment.feed_id, feedCommentService, CommentLike);
            return sendSuccessResponse(res, responseMessages.commentLiked.liked,
                 { content: true, like: liked });
        } catch (postCommitError) {
            loggerService.error(`Error in post-commit operations (like): ${postCommitError}`);
            return sendSuccessResponse(res, responseMessages.commentLiked.liked,
                 { content: true, like: liked });
        }
    } catch (error) {
        if (!transactionCommitted) {
            await transaction.rollback();
        }
        loggerService.error(`Error toggling comment like: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentLiked.failedToCreate, error);
        next(error);
    }
};

export const getCommentLikes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { commentId } = req.params;

        const comment = await feedCommentService.findById(commentId as string);
        if (!comment) {
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        const likes = await commentLikeService.findByCommentId(commentId as string);

        return sendSuccessResponse(res, responseMessages.commentLiked.retrieved, { content: likes, count: likes.length });
    } catch (error) {
        loggerService.error(`Error getting comment likes: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentLiked.failedToFetch, error);
        next(error);
    }
};

export const getUserLikedComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId || res.locals.auth?.user?.id;

        const likedComments = await commentLikeService.findByUserId(userId);

        return sendSuccessResponse(res, responseMessages.commentLiked.retrieved, { content: likedComments, count: likedComments.length });
    } catch (error) {
        loggerService.error(`Error getting user liked comments: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentLiked.failedToFetch, error);
        next(error);
    }
};

export const getMyLikedComments = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;

        const likedComments = await commentLikeService.findByUserId(userId);

        return sendSuccessResponse(res, responseMessages.commentLiked.retrieved, { content: likedComments, count: likedComments.length });
    } catch (error) {
        loggerService.error(`Error getting my liked comments: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentLiked.failedToFetch, error);
        next(error);
    }
};

export const checkIfCommentLiked = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { commentId } = req.params;

        const comment = await feedCommentService.findById(commentId as string);
        if (!comment) {
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        const isLiked = await commentLikeService.checkIfLiked(commentId as string, authenticatedUser.id);

        return sendSuccessResponse(res, responseMessages.commentLiked.retrieved, { content: isLiked });
    } catch (error) {
        loggerService.error(`Error checking if comment is liked: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentLiked.failedToFetch, error);
        next(error);
    }
};

