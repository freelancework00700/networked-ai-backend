import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import { MessageType } from '../types/enums';
import emailService from '../services/email.service';
import messageService from '../services/message.service';
import feedSharedService from '../services/feed-shared.service';
import feedService from '../services/feed.service';
import { emitFeedUpdated } from '../socket/event';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';
import { FeedLiked } from '../models/feed-liked.model';

export const shareFeed = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feed_id, peer_ids, send_entire_network } = req.body;

        // Check if feed exists
        const feed = await feedService.getFeedById(feed_id, authenticatedUser.id, false);
        if (!feed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedShared.notFound);
        }

        // Handle sharing to entire network
        if (send_entire_network === true) {
            const networkUserIds = await feedSharedService.getAllNetworkUserIds(authenticatedUser.id);

            if (networkUserIds.length === 0) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.feedShared.noUsersFoundInNetwork);
            }

            // Share feed with all network users
            const sharedRecords = await feedSharedService.createBulkShared(
                feed_id,
                authenticatedUser.id,
                networkUserIds,
                authenticatedUser.id,
                transaction
            );

            // Share feed in chat to all network users
            await messageService.shareInChat(authenticatedUser.id, networkUserIds, null, MessageType.POST, feed_id, null, transaction);

            // Send email notifications to all network users
            await emailService.sendPostShareEmail(authenticatedUser.name || authenticatedUser.username || 'Someone', feed_id, feed.content || '', networkUserIds, transaction);

            await transaction.commit();

            await emitFeedUpdated(feed_id, feedService, FeedLiked);
            return sendSuccessResponse(res, responseMessages.feedShared.feedShared, {
                content: sharedRecords,
                count: sharedRecords.length,
                shared_to_network: true
            });
        }

        // Handle multiple peer_ids (array)
        if (!peer_ids || !Array.isArray(peer_ids) || peer_ids.length === 0) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.feedShared.peerIdRequired);
        }

        // Filter out authenticated user's ID (cannot share to themselves)
        const validPeerIds = peer_ids.filter((id: string) => id && id !== authenticatedUser.id);

        if (validPeerIds.length === 0) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.feedShared.cannotShareToSelf);
        }

        // Share feed with multiple users
        const sharedRecords = await feedSharedService.createBulkShared(
            feed_id,
            authenticatedUser.id,
            validPeerIds,
            authenticatedUser.id,
            transaction
        );

        // Share feed in chat to all peer users
        await messageService.shareInChat(authenticatedUser.id, validPeerIds, null, MessageType.POST, feed_id, null, transaction);

        // Send email notifications to all peer users
        await emailService.sendPostShareEmail(authenticatedUser.name || authenticatedUser.username || 'Someone', feed_id, feed.content || '', validPeerIds, transaction);

        await transaction.commit();

        await emitFeedUpdated(feed_id, feedService, FeedLiked);
        return sendSuccessResponse(res, responseMessages.feedShared.feedShared, {
            content: sharedRecords,
            count: sharedRecords.length
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error sharing feed: ${error}`);
        if ((error as Error).name === 'SequelizeUniqueConstraintError') {
            return sendBadRequestResponse(res, responseMessages.feedShared.alreadyShared);
        }
        sendServerErrorResponse(res, responseMessages.feedShared.failedToShare, error);
        next(error);
    }
};

export const unshareFeed = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feedId, peerId } = req.params;

        // Check if feed exists
        const feed = await feedService.getFeedById(feedId, authenticatedUser.id, false);
        if (!feed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedShared.notFound);
        }

        const unshared = await feedSharedService.removeShared(feedId, authenticatedUser.id, peerId, authenticatedUser.id, transaction);

        if (!unshared) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedShared.notFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.feedShared.feedUnshared, { content: true });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error unsharing feed: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedShared.failedToUnshare, error);
        next(error);
    }
};

export const getFeedShares = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { feedId } = req.params;

        // Check if feed exists
        const feed = await feedService.getFeedById(feedId, null, false);
        if (!feed) {
            return sendNotFoundResponse(res, responseMessages.feedShared.notFound);
        }

        const shares = await feedSharedService.findByFeedId(feedId);

        return sendSuccessResponse(res, responseMessages.feedShared.retrieved, { content: shares, count: shares.length });
    } catch (error) {
        loggerService.error(`Error getting feed shares: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedShared.failedToFetch, error);
        next(error);
    }
};

export const getUserSharedFeeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId || res.locals.auth?.user?.id;
        const sharedFeeds = await feedSharedService.findByUserId(userId);

        return sendSuccessResponse(res, responseMessages.feedShared.retrieved, { content: sharedFeeds, count: sharedFeeds.length });
    } catch (error) {
        loggerService.error(`Error getting user shared feeds: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedShared.failedToFetch, error);
        next(error);
    }
};

export const getMySharedFeeds = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const sharedFeeds = await feedSharedService.findByUserId(authenticatedUser.id);

        return sendSuccessResponse(res, responseMessages.feedShared.retrieved, { content: sharedFeeds, count: sharedFeeds.length });
    } catch (error) {
        loggerService.error(`Error getting my shared feeds: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedShared.failedToFetch, error);
        next(error);
    }
};

export const checkIfFeedShared = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feedId, peerId } = req.params;

        // Check if feed exists
        const feed = await feedService.getFeedById(feedId, authenticatedUser.id, false);
        if (!feed) {
            return sendNotFoundResponse(res, responseMessages.feedShared.notFound);
        }

        const isShared = await feedSharedService.checkIfShared(feedId, authenticatedUser.id, peerId);

        return sendSuccessResponse(res, responseMessages.feedShared.retrieved, { content: isShared });
    } catch (error) {
        loggerService.error(`Error checking if feed is shared: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedShared.failedToFetch, error);
        next(error);
    }
};

