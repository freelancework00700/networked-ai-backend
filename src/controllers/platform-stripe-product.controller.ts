import loggerService from '../utils/logger.service';
import { NextFunction, Request, Response } from 'express';
import { responseMessages } from '../utils/response-message.service';
import platformStripeProductService from '../services/platform-stripe-product.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

export const getPlatformProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = res.locals.auth?.user;
        const products = await platformStripeProductService.getPlatformProducts(user?.id);
        return sendSuccessResponse(res, responseMessages.subscription.productsRetrieved, products);
    } catch (error: any) {
        loggerService.error(`Error getting platform products: ${error}`);
        return sendServerErrorResponse(res, responseMessages.subscription.failedToGetProducts, error);
    }
};

export const getPlatformProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = res.locals.auth?.user;
        if (!id) return sendBadRequestResponse(res, responseMessages.subscription.productIdRequired);

        const product = await platformStripeProductService.getPlatformProductById(id as string, user?.id);
        if (!product) return sendNotFoundResponse(res, responseMessages.subscription.productNotFound);

        return sendSuccessResponse(res, responseMessages.subscription.productRetrieved, product);
    } catch (error: any) {
        loggerService.error(`Error getting platform product: ${error}`);
        return sendServerErrorResponse(res, responseMessages.subscription.failedToGetProduct, error);
    }
};

export const createPlatformProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productData = req.body;
        if (!productData.name) return sendBadRequestResponse(res, 'Product name is required');

        const product = await platformStripeProductService.createPlatformProduct(productData);
        return sendSuccessResponse(res, 'Platform product created successfully', product);
    } catch (error: any) {
        loggerService.error(`Error creating platform product: ${error}`);
        return sendServerErrorResponse(res, 'Failed to create platform product', error);
    }
};
