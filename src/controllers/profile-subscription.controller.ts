import { NextFunction, Request, Response } from 'express';
import userService from '../services/user.service';
import profileSubscriptionService from '../services/profile-subscription.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';
import loggerService from '../utils/logger.service';

export const toggleProfileSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { peerId } = req.params;
        const authenticatedUserId = res.locals.auth?.user?.id;

        const peer = await userService.findUserByIdOrUsername(peerId as string);

        if (!peer || peer.is_deleted) {
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        if (authenticatedUserId === peer.id) {
            return sendBadRequestResponse(res, responseMessages.user.cannotSubscribeToSelf);
        }

        const result = await profileSubscriptionService.toggleSubscription(
            authenticatedUserId,
            peer.id
        );

        const message = result.subscribed
            ? responseMessages.user.profileSubscribed
            : responseMessages.user.profileUnsubscribed;

        return sendSuccessResponse(res, message, {
            notification_enabled: result.subscribed,
        });
    } catch (error) {
        loggerService.error(`Error toggling profile subscription: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToUpdate, error);
        next(error);
    }
};
