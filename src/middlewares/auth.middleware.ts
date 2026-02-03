import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import userService from '../services/user.service';
import { responseMessages } from '../utils/constants';
import { verifyToken } from '../utils/crypto.service';
import { sendUnauthorizedResponse } from '../utils/response.service';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return sendUnauthorizedResponse(res, responseMessages.tokenInvalid);
        }

        // Token is provided - check if it's valid
        let decoded: JwtPayload | null = null;
        try {
            decoded = verifyToken(token) as JwtPayload;
        } catch (error: any) {
            // If token is provided but expired or invalid, send TOKEN_EXPIRED
            return sendUnauthorizedResponse(res, responseMessages.tokenExpired, null, 'TOKEN_EXPIRED');
        }

        if(!decoded) {
            // Token provided but couldn't decode - send TOKEN_EXPIRED
            return sendUnauthorizedResponse(res, responseMessages.tokenExpired, null, 'TOKEN_EXPIRED');
        }

        const userData = await userService.findUserById(decoded.userId);
        if (!userData) {
            // Token provided but user not found - send TOKEN_EXPIRED
            return sendUnauthorizedResponse(res, responseMessages.tokenExpired, null, 'TOKEN_EXPIRED');
        }

        res.locals.auth = {
            user: userData.toJSON()
        };
        next();
    } catch (error) {
        // Catch any unexpected errors - if we got here, token was provided but something went wrong
        return sendUnauthorizedResponse(res, responseMessages.tokenExpired, null, 'TOKEN_EXPIRED');
    }
};

/** Optional authentication middleware - sets user if token is valid, but doesn't fail if token is missing */
export const optionalAuthenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        res.locals.auth = null;
        
        if (!token) {
            return next();
        }

        const decoded: JwtPayload | null = verifyToken(token);
        if (!decoded) {
            return next();
        }

        const userData = await userService.findUserById(decoded.userId);
        if (!userData) {
            return next();
        }

        res.locals.auth = {
            user: userData.toJSON()
        };
        next();
    } catch (error) {
        next();
    }
};