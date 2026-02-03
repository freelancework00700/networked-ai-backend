import { sequelize } from '../server';
import loggerService from '../utils/logger.service';
import { NextFunction, Request, Response } from 'express';
import customerService from '../services/customer.service';
import { responseMessages } from '../utils/response-message.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

const parseStringOrArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
    if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
};

/** Shape customer to include tag_ids and segment_ids in the response. */
const withTagAndSegmentIds = (customer: any): any => {
    const customerData = customer?.toJSON ? customer.toJSON() : customer ?? {};
    return {
        ...customerData,
        tag_ids: (customerData.tags || []).map((t: any) => t.id).filter(Boolean),
        segment_ids: (customerData.segments || []).map((s: any) => s.id).filter(Boolean),
    };
};

export const getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { page, limit, search, order_by, order_direction, tag_ids, segment_ids } = req.query;

        const result = await customerService.getAllCustomersPaginated(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            tag_ids: parseStringOrArray(tag_ids),
            segment_ids: parseStringOrArray(segment_ids),
            order_by: (order_by as string) || 'created_at',
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });
        const payload = {
            pagination: result.pagination,
            data: result.data.map(withTagAndSegmentIds),
        };
        return sendSuccessResponse(res, responseMessages.customer.retrieved, payload);
    } catch (error) {
        loggerService.error(`Error getting customers: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToFetch, error);
        next(error);
    }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const customer = await customerService.getCustomerById(req.params.id, userId);

        if (!customer) return sendNotFoundResponse(res, responseMessages.customer.notFoundSingle);
        return sendSuccessResponse(res, responseMessages.customer.retrievedSingle, withTagAndSegmentIds(customer));
    } catch (error) {
        loggerService.error(`Error getting customer: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToFetch, error);
        next(error);
    }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const { tag_ids, segment_ids, ...data } = req.body;

        const customer = await customerService.createCustomer(data, userId, transaction);
        if (tag_ids?.length) await customerService.setCustomerTags(customer.id, tag_ids, transaction);
        if (segment_ids?.length) await customerService.setCustomerSegments(customer.id, segment_ids, transaction);
        await transaction.commit();
        const created = await customerService.getCustomerById(customer.id, userId);
        return sendSuccessResponse(res, responseMessages.customer.created, withTagAndSegmentIds(created));
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating customer: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToCreate, error);
        next(error);
    }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const existing = await customerService.getCustomerById(req.params.id, userId, transaction);
        if (!existing) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.customer.notFoundSingle);
        }
        const { tag_ids, segment_ids, ...data } = req.body;
        if (Object.keys(data).length) await customerService.updateCustomer(req.params.id, data, userId, transaction);
        if (tag_ids !== undefined) await customerService.setCustomerTags(req.params.id, Array.isArray(tag_ids) ? tag_ids : [], transaction);
        if (segment_ids !== undefined) await customerService.setCustomerSegments(req.params.id, Array.isArray(segment_ids) ? segment_ids : [], transaction);
        await transaction.commit();
        const updated = await customerService.getCustomerById(req.params.id, userId);
        return sendSuccessResponse(res, responseMessages.customer.updated, withTagAndSegmentIds(updated));
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating customer: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToUpdate, error);
        next(error);
    }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const customer = await customerService.getCustomerById(req.params.id, userId, transaction);
        if (!customer) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.customer.notFoundSingle);
        }
        await customerService.deleteCustomer(req.params.id, userId, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.customer.deleted, { id: req.params.id });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting customer: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToDelete, error);
        next(error);
    }
};
