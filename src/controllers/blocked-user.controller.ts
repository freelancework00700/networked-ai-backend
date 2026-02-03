import { NextFunction, Request, Response } from "express";
import { sequelize } from "../server";
import blockedUserService from "../services/blocked-user.service";
import networkConnectionService from "../services/network-connection.service";
import userService from "../services/user.service";
import loggerService from "../utils/logger.service";
import { responseMessages } from "../utils/response-message.service";
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from "../utils/response.service";

/**
 * Block a user
 * @route POST /api/blocked-users
 */
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const userId = authenticatedUser.id;
        const peerId = req.params.peer_id;

        // Check if trying to block self
        if (userId === peerId) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.blockedUser.cannotBlockSelf);
        }

        // Check if peer exists
        const peer = await userService.findUserById(peerId);
        if (!peer) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.blockedUser.userToBlockNotFound);
        }

        // Check if already blocked
        const isAlreadyBlocked = await blockedUserService.checkIfBlocked(userId, peerId);
        if (isAlreadyBlocked) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.blockedUser.userAlreadyBlocked);
        }

        // Delete any existing connection requests between these users
        await networkConnectionService.deleteRequestsBetweenUsers(userId, peerId, userId, transaction);

        // Delete any existing network connections between these users
        await networkConnectionService.deleteConnectionBetweenUsers(userId, peerId, userId, transaction);

        // Block the user
        const blocked = await blockedUserService.blockUser(userId, peerId, userId, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.blockedUser.userBlockedSuccess, {
            blocked: blocked.toJSON ? blocked.toJSON() : blocked
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error blocking user: ${error}`);
        sendServerErrorResponse(res, responseMessages.blockedUser.failedToBlock, error);
        next(error);
    }
};

/**
 * Unblock a user
 * @route DELETE /api/blocked-users/:peer_id
 */
export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const userId = authenticatedUser.id;
        const peerId = req.params.peer_id;

        // Find the blocked user
        const blockedUser = await blockedUserService.findBlockedUser(userId, peerId);
        if (!blockedUser) {
            return sendBadRequestResponse(res, responseMessages.blockedUser.userNotBlocked);
        }

        // Unblock the user
        await blockedUserService.unblockUser(blockedUser.id, userId);

        return sendSuccessResponse(res, responseMessages.blockedUser.userUnblockedSuccess);
    } catch (error) {
        loggerService.error(`Error unblocking user: ${error}`);
        sendServerErrorResponse(res, responseMessages.blockedUser.failedToUnblock, error);
        next(error);
    }
};

/**
 * Get all blocked users for the authenticated user
 * @route GET /api/blocked-users
 */
export const getAllBlockedUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const userId = authenticatedUser.id;
        const { page, limit } = req.query;

        // Get all blocked users
        const blockedUsers = await blockedUserService.findAllBlockedUsers(userId, Number(page), Number(limit));
        if (!blockedUsers.data.length) {
            return sendSuccessResponse(res, responseMessages.blockedUser.notFound, blockedUsers);
        }

        return sendSuccessResponse(res, responseMessages.blockedUser.retrieved, blockedUsers);
    } catch (error) {
        loggerService.error(`Error getting blocked users: ${error}`);
        sendServerErrorResponse(res, responseMessages.blockedUser.failedToFetch, error);
        next(error);
    }
};

/**
 * Check if a user is blocked
 * @route GET /api/blocked-users/check/:peer_id
 */
export const checkIfBlocked = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const peerId = req.params.peer_id;
        const userId = authenticatedUser.id;

        // Check if user is blocked
        const isBlocked = await blockedUserService.checkIfBlocked(userId, peerId);

        return sendSuccessResponse(res, responseMessages.blockedUser.retrieved, {
            is_blocked: isBlocked
        });
    } catch (error) {
        loggerService.error(`Error checking if user is blocked: ${error}`);
        sendServerErrorResponse(res, responseMessages.blockedUser.failedToCheck, error);
        next(error);
    }
};

