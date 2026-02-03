import { NextFunction, Request, Response } from 'express';
import { Feed, User } from '../models';
import { FeedLiked } from '../models/feed-liked.model';
import { sequelize } from '../server';
import smsService from '../services/sms.service';
import feedService from '../services/feed.service';
import userService from '../services/user.service';
import emailService from '../services/email.service';
import feedSharedService from '../services/feed-shared.service';
import notificationService from '../services/notification.service';
import { emitFeedCreated, emitFeedDeleted, emitFeedUpdated } from '../socket/event';
import { CreateFeedParams } from '../types/feed.interfaces';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse } from '../utils/response.service';

export const getAllFeeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query;
        const authUserId = res.locals.auth?.user?.id ?? null;
        const isAuthenticated = !!authUserId;
        const isPublic: boolean | undefined = !isAuthenticated ? true : req.query.is_public !== undefined ? req.query.is_public === 'true' : undefined;

        const result = await feedService.getAllFeeds(Number(page) || 1, Number(limit) || 10, isPublic, authUserId);
        if (!result.data.length) {
            return sendSuccessResponse(res, responseMessages.feed.notFound, result);
        }

        const transformedFeeds = await feedService.transformFeedsWithIds(result.data, authUserId);

        // Add connection status to feed owners
        const usersWithStatus = await userService.addConnectionStatusToUsers(
            transformedFeeds.map((feed: Feed) => (feed.user.toJSON ? feed.user.toJSON() : feed.user)),
            authUserId || null
        );

        const feedsWithStatus = transformedFeeds.map((feed: Feed, index: number) => {
            const userWithStatus = usersWithStatus[index];
            if (userWithStatus && userWithStatus.id === (feed.user as User).id) {
                feed.user = userWithStatus as unknown as User;
            }
            return feed;
        });

        return sendSuccessResponse(res, responseMessages.feed.retrieved, {
            ...result,
            data: feedsWithStatus,
        });
    } catch (error) {
        loggerService.error(`Error listing feeds: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToFetch, error);
        next(error);
    }
};

export const getFeedById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUserId = res.locals.auth?.user?.id ?? null;
        const isAuthenticated = !!authUserId;
        const feedId = req.params.id;

        const feed = await feedService.getFeedById(feedId, authUserId, true, true);
        if (!feed) {
            return sendNotFoundResponse(res, responseMessages.feed.notFoundSingle);
        }

        // If not authenticated, only allow access to public feeds
        if (!isAuthenticated && !feed.is_public) {
            return sendNotFoundResponse(res, responseMessages.feed.notFoundSingle);
        }

        // Check if user has liked this feed
        const usersWithStatus = await userService.addConnectionStatusToUsers(
            [feed.user.toJSON ? feed.user.toJSON() : feed.user],
            authUserId as string | null
        );

        const transformedFeedWithStatus = {
            ...feed,
            user: usersWithStatus[0] as unknown as User,
        };

        return sendSuccessResponse(res, responseMessages.feed.retrieved, transformedFeedWithStatus);
    } catch (error) {
        loggerService.error(`Error getting feed: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToFetch, error);
        next(error);
    }
};

export const createFeed = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;

        const feedData: CreateFeedParams = {
            ...req.body,
            user_id: authenticatedUser.id,
        };

        const created = await feedService.createFeed(feedData, authenticatedUser.id, transaction);
        if (!created) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.feed.failedToCreate);
        }
        const mentionIds = feedData.mention_ids;
        if (mentionIds && Array.isArray(mentionIds) && mentionIds.length > 0) {
            const authorName = (authenticatedUser as any).name || (authenticatedUser as any).username || 'Someone';
            const postContent = (created as any).content;
            const uniqueMentions = [...new Set(mentionIds)].filter((id: string) => id && id !== authenticatedUser.id);
            await Promise.all(
                uniqueMentions.map((mentionedUserId: string) =>
                    notificationService.sendMentionNotification(mentionedUserId, authenticatedUser.id, authorName, created.id, null, transaction, postContent)
                )
            );
        }
        await transaction.commit();

        const getFeed = await feedService.getFeedById(created.id, authenticatedUser.id, true, true);

        await emitFeedCreated(getFeed);
        return sendSuccessResponse(res, responseMessages.feed.created, getFeed);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating feed: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToCreate, error);
        next(error);
    }
};

export const updateFeed = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const feedId = req.params.id;
        const authenticatedUser = res.locals.auth?.user;

        // Check if feed exists
        const existingFeed = await feedService.getFeedById(feedId, authenticatedUser.id, false);
        if (!existingFeed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feed.notFoundSingle);
        }

        // Check if user owns the feed or is admin
        if (existingFeed.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.feed.forbidden);
        }

        const updateData: CreateFeedParams = {
            ...req.body,
        };

        await feedService.updateFeed(feedId, updateData, authenticatedUser.id, transaction);

        await transaction.commit();
        const updatedFeed = await feedService.getFeedById(feedId, authenticatedUser.id, true, true);

        await emitFeedUpdated(feedId, feedService, FeedLiked);

        return sendSuccessResponse(res, responseMessages.feed.updated, updatedFeed);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating feed: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToUpdate, error);
        next(error);
    }
};

export const deleteFeed = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const feedId = req.params.id;
        const authenticatedUser = res.locals.auth?.user;

        // Check if feed exists
        const existingFeed = await feedService.getFeedById(feedId, authenticatedUser.id, false);
        if (!existingFeed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feed.notFoundSingle);
        }

        // Check if user owns the feed or is admin
        if (existingFeed.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.feed.forbidden);
        }

        const deleted = await feedService.deleteFeed(existingFeed, authenticatedUser.id, transaction);

        if (!deleted) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feed.notFoundSingle);
        }

        await transaction.commit();

        // Emit real-time feed deleted event
        emitFeedDeleted({ feed_id: feedId, deleted_by: authenticatedUser.id });

        return sendSuccessResponse(res, responseMessages.feed.deleted, true);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting feed: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToDelete, error);
        next(error);
    }
};

export const getFeedsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query;
        const userId = req.params.userId || res.locals.auth?.user?.id;
        const authUserId = res.locals.auth?.user?.id ?? null;

        const feeds = await feedService.findByUserId(userId, Number(page) || 1, Number(limit) || 10);
        if (!feeds.data.length) {
            return sendSuccessResponse(res, responseMessages.feed.notFound, feeds);
        }

        const transformedFeeds = await feedService.transformFeedsWithIds(feeds.data, authUserId);
        const usersWithStatus = await userService.addConnectionStatusToUsers(
            transformedFeeds.map((feed: Feed) => (feed.user.toJSON ? feed.user.toJSON() : feed.user)),
            authUserId as string | null
        );

        const feedsWithStatus = transformedFeeds.map((feed: Feed, index: number) => {
            const userWithStatus = usersWithStatus[index];
            if (userWithStatus && userWithStatus.id === (feed.user as User).id) {
                feed.user = userWithStatus as unknown as User;
            }
            return feed;
        });

        return sendSuccessResponse(res, responseMessages.feed.retrieved, {
            ...feeds,
            data: feedsWithStatus,
        });
    } catch (error) {
        loggerService.error(`Error getting feeds by user: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToFetch, error);
        next(error);
    }
};

export const getMyFeeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query;
        const userId = res.locals.auth?.user?.id;
        const authUserId = res.locals.auth?.user?.id ?? null;

        const feeds = await feedService.findByUserId(userId, Number(page) || 1, Number(limit) || 10);
        if (!feeds.data.length) {
            return sendSuccessResponse(res, responseMessages.feed.notFound, feeds);
        }

        const transformedFeeds = await feedService.transformFeedsWithIds(feeds.data, authUserId);

        const usersWithStatus = await userService.addConnectionStatusToUsers(
            transformedFeeds.map((feed: Feed) => (feed.user.toJSON ? feed.user.toJSON() : feed.user)),
            authUserId as string | null
        );

        const feedsWithStatus = transformedFeeds.map((feed: Feed, index: number) => {
            const userWithStatus = usersWithStatus[index];
            if (userWithStatus && userWithStatus.id === (feed.user as User).id) {
                feed.user = userWithStatus as unknown as User;
            }
            return feed;
        });

        return sendSuccessResponse(res, responseMessages.feed.retrieved, {
            ...feeds,
            data: feedsWithStatus,
        });
    } catch (error) {
        loggerService.error(`Error getting my feeds: ${error}`);
        sendServerErrorResponse(res, responseMessages.feed.failedToFetch, error);
        next(error);
    }
};

/** POST API: Send email and SMS to entire network for a feed */
export const sendFeedNetworkBroadcast = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { feed_id, type } = req.body;
        const authenticatedUser = res.locals.auth?.user;

        // Fetch feed
        const feed = await feedService.getFeedById(feed_id, authenticatedUser.id, false);

        if (!feed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feed.notFoundSingle);
        }

        // Get all network user IDs
        const networkUserIds = await feedSharedService.getAllNetworkUserIds(authenticatedUser.id);

        if (networkUserIds.length === 0) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.user.noNetworkUsers);
        }

        let emailResult = null;
        let smsResult = null;

        // Send emails if type is email
        if (type === 'email') {
            emailResult = await emailService.sendPostShareEmail(
                authenticatedUser.name || authenticatedUser.username || 'Someone', 
                feed.id,
                feed.content || 'Check out this post!',
                networkUserIds,
                transaction
            );
        }

        // Send SMS if type is sms
        if (type === 'sms') {
            smsResult = await smsService.sendFeedNetworkBroadcastSms(
                feed,
                networkUserIds,
                authenticatedUser.id,
                transaction
            );
        }

        await transaction.commit();

        return sendSuccessResponse(res, responseMessages.user.networkBroadcastSent, {
            sms_sent: smsResult ? true : false,
            email_sent: emailResult ? true : false,
            recipients_count: networkUserIds.length
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error sending feed network broadcast: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.networkBroadcastFailed, error);
        next(error);
    }
};

