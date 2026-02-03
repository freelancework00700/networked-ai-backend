import { NextFunction, Request, Response } from 'express';
import { MediaContext } from '../types/enums';
import { sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';
import env from '../utils/validate-env';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';

/**
 * Media upload API to upload media files to the server
 * @route POST /api/media-upload
 */
export const uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || files.length === 0) {
            return sendServerErrorResponse(res, responseMessages.mediaUpload.noFileUploaded);
        }

        const context = req.body.context as MediaContext;
        const uploadedFiles = files.map((file) => {
            const publicUrl = `${env.API_URL}/media/${context}/${file.filename}`;
            return {
                url: publicUrl,
                mimetype: file.mimetype,
            };
        });

        return sendSuccessResponse(res, responseMessages.mediaUpload.uploaded, uploadedFiles);
    } catch (error) {
        loggerService.error(`Error uploading media: ${error}`);
        sendServerErrorResponse(res, responseMessages.mediaUpload.failedToUpload, error);
        next(error);
    }
};


