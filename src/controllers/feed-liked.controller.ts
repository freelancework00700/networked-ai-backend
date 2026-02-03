import { NextFunction, Request, Response } from 'express';
import feedLikedService from '../services/feed-liked.service';
import feedService from '../services/feed.service';
import notificationService from '../services/notification.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse, sendBadRequestResponse } from '../utils/response.service';
import { responseMessages } from '../utils/response-message.service';
import loggerService from '../utils/logger.service';
import { sequelize } from '../server';
import { emitFeedUpdated } from '../socket/event';
import { FeedLiked } from '../models/feed-liked.model';


export const LikeUnlikeFeed = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feedId } = req.params;

        const feed = await feedService.getFeedById(feedId, authenticatedUser.id, false);
        if (!feed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedLiked.notFound);
        }

        // Check if liked within transaction to avoid race conditions
        const isLiked = await feedLikedService.checkIfLiked(feedId, authenticatedUser.id, transaction);

        if (isLiked) {
            const unliked = await feedLikedService.removeLiked(feedId, authenticatedUser.id, authenticatedUser.id, transaction);
            if (!unliked) {
                await transaction.rollback();
                return sendNotFoundResponse(res, responseMessages.feedLiked.notFound);
            }
            await transaction.commit();

            await emitFeedUpdated(feedId, feedService, FeedLiked);
            return sendSuccessResponse(res, responseMessages.feedLiked.unliked, { content: false });
        }

        const liked = await feedLikedService.createLiked(feedId, authenticatedUser.id, authenticatedUser.id, transaction);
        const postOwnerId = (feed as any).user_id;
        if (postOwnerId && postOwnerId !== authenticatedUser.id) {
            const likerName = (authenticatedUser as any).name || (authenticatedUser as any).username || 'Someone';
            const postContent = (feed as any).content;
            await notificationService.sendPostLikedNotification(postOwnerId, authenticatedUser.id, likerName, feedId, transaction, postContent);
        }
        await transaction.commit();
        
        await emitFeedUpdated(feedId, feedService, FeedLiked);
        return sendSuccessResponse(res, responseMessages.feedLiked.liked, { content: true, like: liked });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error toggling feed like: ${error}`);
        if ((error as Error).name === 'SequelizeUniqueConstraintError') {
            return sendBadRequestResponse(res, responseMessages.feedLiked.alreadyLiked);
        }
        sendServerErrorResponse(res, responseMessages.feedLiked.failedToCreate, error);
        next(error);
    }
};

export const getAllLikesByFeedId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { feedId } = req.params;

        // Check if feed exists
        const feed = await feedService.getFeedById(feedId, null, false);
        if (!feed) {
            return sendNotFoundResponse(res, responseMessages.feedLiked.notFound);
        }

        const likes = await feedLikedService.findByFeedId(feedId);
        
        return sendSuccessResponse(res, responseMessages.feedLiked.retrieved, { content: likes, count: likes.length });
    } catch (error) {
        loggerService.error(`Error getting feed likes: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedLiked.failedToFetch, error);
        next(error);
    }
};

export const getUserLikedFeeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId || res.locals.auth?.user?.id;
        const likedFeeds = await feedLikedService.findByUserId(userId);
        
        return sendSuccessResponse(res, responseMessages.feedLiked.retrieved, { content: likedFeeds, count: likedFeeds.length });
    } catch (error) {
        loggerService.error(`Error getting user liked feeds: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedLiked.failedToFetch, error);
        next(error);
    }
};

export const getMyLikedFeeds = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        
        const likedFeeds = await feedLikedService.findByUserId(authenticatedUser.id);
        
        return sendSuccessResponse(res, responseMessages.feedLiked.retrieved, { content: likedFeeds, count: likedFeeds.length });
    } catch (error) {
        loggerService.error(`Error getting my liked feeds: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedLiked.failedToFetch, error);
        next(error);
    }
};

export const checkIfFeedLiked = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feedId } = req.params;

        // Check if feed exists
        const feed = await feedService.getFeedById(feedId, null, false);
        if (!feed) {
            return sendNotFoundResponse(res, responseMessages.feed.notFound);
        }

        const isLiked = await feedLikedService.checkIfLiked(feedId, authenticatedUser.id);
        
        return sendSuccessResponse(res, responseMessages.feedLiked.retrieved, { content: isLiked });
    } catch (error) {
        loggerService.error(`Error checking if feed is liked: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedLiked.failedToFetch, error);
        next(error);
    }
};

