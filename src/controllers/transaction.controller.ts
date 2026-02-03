import loggerService from '../utils/logger.service';
import { NextFunction, Request, Response } from 'express';
import transactionService from '../services/transaction.service';
import { responseMessages } from '../utils/response-message.service';
import { sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/**
 * Get all transactions of the current user with pagination
 * @route GET /api/transactions
 */
export const getCurrentUserTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { page, limit } = req.query;

        const result = await transactionService.getUserTransactionsPaginated(user.id, Number(page), Number(limit));

        const formattedData = result.data.map((transaction: any) => {
            if (transaction.product && transaction.product.plan_benefits) {
                try {
                    transaction.product.plan_benefits = JSON.parse(transaction.product.plan_benefits);
                } catch (error) {
                    transaction.product.plan_benefits = [];
                }
            }
            return transaction;
        });

        return sendSuccessResponse(res, responseMessages.transaction.transactionsRetrieved, {
            data: formattedData,
            pagination: result.pagination,
        });
    } catch (error: any) {
        loggerService.error(`Error getting user transactions: ${error}`);
        return sendServerErrorResponse(res, responseMessages.transaction.failedToGetTransactions, error);
    }
};

/**
 * Get a single transaction of the current user by ID
 * @route GET /api/transaction/:id
 */
export const getCurrentUserTransactionById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { id } = req.params;

        if (!id) {
            return sendServerErrorResponse(res, responseMessages.transaction.transactionIdRequired, null);
        }

        const transaction = await transactionService.getTransactionByIdForUser(id, user.id);

        if (!transaction) {
            return sendServerErrorResponse(res, responseMessages.transaction.transactionNotFound, null);
        }

        const formattedTransaction: any = transaction;
        if (formattedTransaction.product && formattedTransaction.product.plan_benefits) {
            try {
                formattedTransaction.product.plan_benefits = JSON.parse(formattedTransaction.product.plan_benefits);
            } catch (error) {
                formattedTransaction.product.plan_benefits = [];
            }
        }

        return sendSuccessResponse(res, responseMessages.transaction.transactionRetrieved, formattedTransaction);
    } catch (error: any) {
        loggerService.error(`Error getting transaction by id: ${error}`);
        return sendServerErrorResponse(res, responseMessages.transaction.failedToGetTransactions, error);
    }
};

export default {
    getCurrentUserTransactions,
    getCurrentUserTransactionById,
};


