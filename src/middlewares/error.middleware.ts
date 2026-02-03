import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../types/common-interfaces';
import { StatusCode } from '../types/enums';
import { responseMessages } from '../utils/constants';
import Logger from '../utils/logger.service';

/**Create middleware for error log */
export const errorMiddleware = (error: CustomError, request: Request, response: Response, next: NextFunction) => {
    const status = error.status || StatusCode.INTERNAL_ERROR;
    const message = error.message || responseMessages.serverError;
    
    // Format current date and time
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Log error stack if available, otherwise log error message
    if (error.stack) {
        Logger.error(`[${formattedDate}] ${error.stack}`);
    } else {
        Logger.error(`[${formattedDate}] ${error.message}`);
    }

    // Guard against stringifying large request bodies to prevent memory exhaustion
    // Limit body stringification to first 500 characters to prevent heap overflow
    let bodyPreview = '{}';
    let isTruncated = false;
    
    if (request.body) {
        try {
            if (typeof request.body === 'string') {
                bodyPreview = request.body.length > 500 
                    ? request.body.substring(0, 500) + '... (truncated)'
                    : request.body;
                isTruncated = request.body.length > 500;
            } else {
                // Only stringify once and truncate immediately
                const bodyStr = JSON.stringify(request.body);
                isTruncated = bodyStr.length > 500;
                bodyPreview = isTruncated 
                    ? bodyStr.substring(0, 500) + '... (truncated)'
                    : bodyStr;
            }
        } catch (error) {
            // If stringification fails (circular reference, etc.), use minimal info
            bodyPreview = '[Body stringification failed]';
        }
    }
    
    const url = `Location: ${request.originalUrl} | Method: ${request.method} | Body: ${bodyPreview}`;
    Logger.error(message, url);

    if (response.headersSent) {
        return next(error);
    }
    
    response.status(status).send({ status, message });
};
