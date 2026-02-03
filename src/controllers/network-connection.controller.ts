import { NextFunction, Request, Response } from "express";
import { sequelize } from "../server";
import blockedUserService from "../services/blocked-user.service";
import locationService from "../services/location.service";
import networkConnectionService from "../services/network-connection.service";
import userService from "../services/user.service";
import { UserRequestStatus } from "../types/enums";
import loggerService from "../utils/logger.service";
import * as socketManager from "../socket/socket-manager";
import { responseMessages } from "../utils/response-message.service";
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse } from "../utils/response.service";

// Helper function to emit network connection socket events to both users
const emitNetworkConnectionSocketEvent = async (currentUserId: string, peerUserId: string): Promise<void> => {
    try {
        // Get user data for both users
        const [currentUser, peerUser] = await Promise.all([
            userService.findUserById(currentUserId),
            userService.findUserById(peerUserId)
        ]);

        if (!currentUser || !peerUser) {
            loggerService.error(`Failed to find users for socket event: currentUserId=${currentUserId}, peerUserId=${peerUserId}`);
            return;
        }

        // Get connection status for both users relative to each other
        const [currentUserStatus, peerUserStatus] = await Promise.all([
            userService.getConnectionStatus(currentUserId, peerUserId),
            userService.getConnectionStatus(peerUserId, currentUserId)
        ]);

        // Prepare payload for current user (about peer user)
        const payloadForCurrentUser = {
            id: peerUser.id,
            name: peerUser.name,
            username: peerUser.username,
            image_url: peerUser.image_url,
            company_name: peerUser.company_name,
            connection_status: currentUserStatus,
            thumbnail_url: peerUser.thumbnail_url,
            total_gamification_points: peerUser.total_gamification_points,
            total_gamification_points_weekly: peerUser.total_gamification_points_weekly,
        };

        // Prepare payload for peer user (about current user)
        const payloadForPeerUser = {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            image_url: currentUser.image_url,
            connection_status: peerUserStatus,
            company_name: currentUser.company_name,
            thumbnail_url: currentUser.thumbnail_url,
            total_gamification_points: currentUser.total_gamification_points,
            total_gamification_points_weekly: currentUser.total_gamification_points_weekly,
        };

        // Emit to both users with single event name
        socketManager.emitNetworkConnectionUpdate(currentUserId, payloadForCurrentUser);
        socketManager.emitNetworkConnectionUpdate(peerUserId, payloadForPeerUser);
    } catch (error) {
        loggerService.error(`Error emitting network connection socket event: ${error}`);
    }
};

/**
 * Send a network connection request
 * @route POST /api/network-connections/send
 */
export const createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { peer_user_id } = req.body;
        const authenticatedUser = res.locals.auth?.user;

        const senderId = authenticatedUser.id;

        // Check if receiver exists
        const receiver = await userService.findUserById(peer_user_id);
        if (!receiver) {
            return sendNotFoundResponse(res, responseMessages.networkConnection.notFoundSingle);
        }

        // Check if trying to send request to self
        if (senderId === peer_user_id) {
            return sendBadRequestResponse(res, responseMessages.networkConnection.cannotSendRequestToSelf);
        }

        // Check if sender has blocked receiver or receiver has blocked sender
        const senderBlockedReceiver = await blockedUserService.checkIfBlocked(senderId, peer_user_id);
        const receiverBlockedSender = await blockedUserService.checkIfBlocked(peer_user_id, senderId);
        if (senderBlockedReceiver || receiverBlockedSender) {
            return sendBadRequestResponse(res, responseMessages.networkConnection.cannotSendRequestUserBlocked);
        }

        // Check if already connected
        const existingConnection = await networkConnectionService.findConnection(senderId, peer_user_id);
        if (existingConnection) {
            return sendBadRequestResponse(res, responseMessages.networkConnection.usersAlreadyConnected);
        }

        // Check if request already exists in either direction
        const existingRequest = await networkConnectionService.findRequestBetweenUsers(senderId, peer_user_id);
        if (existingRequest) {
            // Check if the current user sent the request
            if (existingRequest.sender_id === senderId) {
                return sendBadRequestResponse(res, responseMessages.networkConnection.connectionRequestExists);
            } else {
                // The other user has already sent a request
                return sendBadRequestResponse(res, responseMessages.networkConnection.requestAlreadySentByOtherUser);
            }
        }

        // Create request
        const request = await networkConnectionService.createRequest(senderId, peer_user_id, senderId);

        // Emit socket event to both users
        await emitNetworkConnectionSocketEvent(senderId, peer_user_id);

        return sendSuccessResponse(res, responseMessages.networkConnection.connectionRequestCreated, request.toJSON || request);
    } catch (error) {
        loggerService.error(`Error creating connection request: ${error}`);
        sendServerErrorResponse(res, responseMessages.networkConnection.failedToCreate, error);
        next(error);
    }
};

/**
 * Cancel a network connection request
 * @route PUT /api/network-connections/cancel
 */
export const cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { peer_user_id } = req.body;
        const currentUserId = authenticatedUser.id;

        // Check if peer user exists
        const peerUser = await userService.findUserById(peer_user_id);
        if (!peerUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.notFoundSingle);
        }

        // Find request sent by current user to peer
        const request = await networkConnectionService.findRequestBySenderAndReceiver(currentUserId, peer_user_id);
        if (!request) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.connectionRequestNotFound);
        }

        // Delete the request
        await networkConnectionService.deleteRequestsBetweenUsers(currentUserId, peer_user_id, currentUserId, transaction);
        
        await transaction.commit();

        // Emit socket event to both users
        await emitNetworkConnectionSocketEvent(currentUserId, peer_user_id);

        return sendSuccessResponse(res, responseMessages.networkConnection.connectionRequestCancelled);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error canceling connection request: ${error}`);
        sendServerErrorResponse(res, 'Failed to cancel connection request', error);
        next(error);
    }
};

/**
 * Reject a network connection request
 * @route PUT /api/network-connections/reject
 */
export const rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { peer_user_id } = req.body;
        const currentUserId = authenticatedUser.id;

        // Check if peer user exists
        const peerUser = await userService.findUserById(peer_user_id);
        if (!peerUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.notFoundSingle);
        }

        // Find request received by current user from peer
        const request = await networkConnectionService.findRequestBySenderAndReceiver(peer_user_id, currentUserId);
        if (!request) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.connectionRequestNotFound);
        }

        // Update request status to rejected
        await networkConnectionService.updateRequestStatus(request.id, UserRequestStatus.REJECTED, currentUserId, transaction);
        
        // Decrement total_network_requests for receiver (currentUserId) since request is being rejected
        await userService.decrementUserTotal(currentUserId, 'total_network_requests', transaction);
        
        await transaction.commit();

        // Emit socket event to both users
        await emitNetworkConnectionSocketEvent(currentUserId, peer_user_id);

        return sendSuccessResponse(res, responseMessages.networkConnection.connectionRequestRejected);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error rejecting connection request: ${error}`);
        sendServerErrorResponse(res, 'Failed to reject connection request', error);
        next(error);
    }
};

/**
 * Accept a network connection request
 * @route PUT /api/network-connections/accept
 */
export const acceptRequest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { peer_user_id } = req.body;
        const currentUserId = authenticatedUser.id;

        // Check if peer user exists
        const peerUser = await userService.findUserById(peer_user_id);
        if (!peerUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.notFoundSingle);
        }

        // Find request received by current user from peer
        const request = await networkConnectionService.findRequestBySenderAndReceiver(peer_user_id, currentUserId);
        if (!request) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.connectionRequestNotFound);
        }

        // Update request status to accepted
        await networkConnectionService.updateRequestStatus(request.id, UserRequestStatus.ACCEPTED, currentUserId, transaction);

        // Decrement total_network_requests for receiver (current user) since request is no longer pending
        await userService.decrementUserTotal(currentUserId, 'total_network_requests', transaction);

        // Create network connections between sender and receiver
        // Increment total_networks for both users
        await Promise.all([
            networkConnectionService.createConnection(peer_user_id, currentUserId, currentUserId, true, transaction),
            networkConnectionService.createConnection(currentUserId, peer_user_id, currentUserId, true, transaction)
        ]);

        await transaction.commit();

        // Emit socket event to both users
        await emitNetworkConnectionSocketEvent(currentUserId, peer_user_id);

        return sendSuccessResponse(res, responseMessages.networkConnection.connectionRequestAccepted);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error accepting connection request: ${error}`);
        sendServerErrorResponse(res, 'Failed to accept connection request', error);
        next(error);
    }
};

/**
 * Remove a network connection
 * @route PUT /api/network-connections/remove
 */
export const removeConnection = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { peer_user_id } = req.body;
        const currentUserId = authenticatedUser.id;

        // Check if trying to perform action on self
        if (currentUserId === peer_user_id) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.networkConnection.cannotSendRequestToSelf);
        }

        // Check if peer user exists
        const peerUser = await userService.findUserById(peer_user_id);
        if (!peerUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.notFoundSingle);
        }

        // Check if connection exists
        const connection1 = await networkConnectionService.findConnection(currentUserId, peer_user_id);
        const connection2 = await networkConnectionService.findConnection(peer_user_id, currentUserId);
        
        if (!connection1 && !connection2) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.networkConnection.connectionNotFound);
        }

        // Delete the connection
        await networkConnectionService.deleteConnectionBetweenUsers(currentUserId, peer_user_id, currentUserId, transaction);
        
        // Also delete any pending requests between them
        await networkConnectionService.deleteRequestsBetweenUsers(currentUserId, peer_user_id, currentUserId, transaction);
        
        await transaction.commit();

        // Emit socket event to both users
        await emitNetworkConnectionSocketEvent(currentUserId, peer_user_id);

        return sendSuccessResponse(res, responseMessages.networkConnection.connectionRemoved);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error removing network connection: ${error}`);
        sendServerErrorResponse(res, 'Failed to remove network connection', error);
        next(error);
    }
};

/**
 * Get all network connection requests for the authenticated user
 * Returns requests where receiver_id matches and status is not accepted and is_deleted is false
 * @route GET /api/network-connections/requests
 */
export const getAllReceivedRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const receiverId = authenticatedUser.id;
        const { page = 1, limit = 10, search = '' } = req.query || {};

        const requests = await networkConnectionService.findAllRequestsByReceiver(receiverId, Number(page), Number(limit), search as string);

        return sendSuccessResponse(res, responseMessages.networkConnection.retrieved, requests);
    } catch (error) {
        loggerService.error(`Error getting connection requests: ${error}`);
        sendServerErrorResponse(res, responseMessages.networkConnection.failedToFetch, error);
        next(error);
    }
};

/** 
 * Get all network connections for given user id authenticated user
 * @route GET /api/network-connections/connections
 */
export const getNetworkConnections = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { userId, page, limit, search, latitude, longitude, radius } = req.query;

        // Use userId from query if provided, otherwise use authenticated user's ID
        const targetUserId = userId || authenticatedUser.id;

        // Validate that the target user exists
        const targetUser = await userService.findUserById(targetUserId);
        if (!targetUser) {
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        const connections = await networkConnectionService.findAllConnectionsByUserId(
            authenticatedUser.id,
            targetUserId, 
            Number(page) || 1, 
            Number(limit) || 10, 
            search as string,
            latitude as string,
            longitude as string,
            radius as string
        );
        return sendSuccessResponse(res, responseMessages.networkConnection.retrieved, connections);
    } catch (error) {
        loggerService.error(`Error getting network connections: ${error}`);
        sendServerErrorResponse(res, responseMessages.networkConnection.failedToFetch, error);
        next(error);
    }
};

/**
 * Get people you might know based on location and preferences
 * @route GET /api/users/people-you-might-know
 */
export const getPeopleYouMightKnow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { radius = 10, limit = 10 } = req.query;

        const lat = parseFloat(authenticatedUser.latitude || '0');
        const lon = parseFloat(authenticatedUser.longitude || '0');
        const radiusMiles = radius ? parseFloat(radius as string) : 10;
        const limitCount = limit ? parseInt(limit as string) : 10;

        const users = await locationService.findPeopleYouMightKnow(authenticatedUser.id, lat, lon, radiusMiles, limitCount);
        if (!users.length) {
            return sendSuccessResponse(res, responseMessages.networkConnection.peopleYouMightKnowNotFound, []);
        }

        return sendSuccessResponse(res, responseMessages.networkConnection.peopleYouMightKnowRetrieved, users);
    } catch (error) {
        loggerService.error(`Error getting people you might know: ${error}`);
        sendServerErrorResponse(res, responseMessages.networkConnection.failedToFetchPeopleYouMightKnow, error);
        next(error);
    }
};

/**
 * Get networks within radius
 * @route GET /api/users/networks-within-radius
 */
export const getNetworksWithinRadius = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { radius, latitude, longitude } = req.query;

        // Use provided coordinates or fall back to authenticated user's coordinates
        const lat = latitude ? parseFloat(latitude as string) : parseFloat(authenticatedUser.latitude || '0');
        const lon = longitude ? parseFloat(longitude as string) : parseFloat(authenticatedUser.longitude || '0');
        const radiusMiles = radius ? parseFloat(radius as string) : 10;

        if (isNaN(lat) || isNaN(lon)) {
            return sendBadRequestResponse(res, 'Invalid latitude or longitude');
        }

        const networks = await locationService.findNetworksWithinRadius(
            authenticatedUser.id,
            lat,
            lon,
            radiusMiles
        );

        if (!networks.length) {
            return sendSuccessResponse(res, responseMessages.networkConnection.myNetworkConnectionsNotFound, []);
        }

        return sendSuccessResponse(res, responseMessages.networkConnection.myNetworkConnectionsRetrieved, networks);
    } catch (error) {
        loggerService.error(`Error getting networks within radius: ${error}`);
        sendServerErrorResponse(res, responseMessages.networkConnection.failedToFetchMyNetworkConnections, error);
        next(error);
    }
};