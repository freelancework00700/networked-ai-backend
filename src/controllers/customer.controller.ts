import fs from 'fs';
import * as XLSX from 'xlsx';
import { sequelize } from '../server';
import tagService from '../services/tag.service';
import loggerService from '../utils/logger.service';
import segmentService from '../services/segment.service';
import { NextFunction, Request, Response } from 'express';
import customerService from '../services/customer.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

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
        const customer = await customerService.getCustomerById(req.params.id as string, userId);

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
        const { tag_ids, segment_ids, is_all_tag, is_all_segment, ...data } = req.body;

        // Check for duplicate customer
        const isDuplicate = await customerService.checkDuplicateCustomer(
            data.email || null, 
            data.mobile || null, 
            userId, 
            undefined, // excludeCustomerId - not needed for create
            transaction
        );

        if (isDuplicate) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'Customer with same email or mobile already exists');
        }

        const customer = await customerService.createCustomer(data, userId, transaction);

        const finalTagIds = is_all_tag === true ? await tagService.getAssignableTagIdsForUser(userId) : (Array.isArray(tag_ids) ? tag_ids : []);
        const finalSegmentIds = is_all_segment === true ? await segmentService.getSegmentIdsForUser(userId) : (Array.isArray(segment_ids) ? segment_ids : []);

        if (finalTagIds.length) await customerService.setCustomerTags(customer.id, finalTagIds, userId, transaction);
        if (finalSegmentIds.length) await customerService.setCustomerSegments(customer.id, finalSegmentIds, transaction);
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
        const existing = await customerService.getCustomerById(req.params.id as string, userId, transaction);
        if (!existing) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.customer.notFoundSingle);
        }
        const { tag_ids, segment_ids, is_all_tag, is_all_segment, ...data } = req.body;
        
        // Check for duplicate customer if email or mobile is being updated
        if (data.email !== undefined || data.mobile !== undefined) {
            const isDuplicate = await customerService.checkDuplicateCustomer(
                data.email || null, 
                data.mobile || null, 
                userId, 
                req.params.id as string, // exclude current customer from duplicate check
                transaction
            );

            if (isDuplicate) {
                await transaction.rollback();
                return sendBadRequestResponse(res, 'Customer with same email or mobile already exists');
            }
        }
        
        if (Object.keys(data).length) await customerService.updateCustomer(req.params.id as string, data, userId, transaction);

        if (tag_ids !== undefined || is_all_tag !== undefined) {
            const finalTagIds = is_all_tag === true ? await tagService.getAssignableTagIdsForUser(userId) : (Array.isArray(tag_ids) ? tag_ids : []);
            await customerService.setCustomerTags(req.params.id as string, finalTagIds, userId, transaction);
        }

        if (segment_ids !== undefined || is_all_segment !== undefined) {
            const finalSegmentIds = is_all_segment === true ? await segmentService.getSegmentIdsForUser(userId) : (Array.isArray(segment_ids) ? segment_ids : []);
            await customerService.setCustomerSegments(req.params.id as string, finalSegmentIds, transaction);
        }
        await transaction.commit();
        const updated = await customerService.getCustomerById(req.params.id as string, userId);
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
        const customer = await customerService.getCustomerById(req.params.id as string, userId, transaction);
        if (!customer) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.customer.notFoundSingle);
        }
        await customerService.deleteCustomer(req.params.id as string, userId, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.customer.deleted, { id: req.params.id });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting customer: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToDelete, error);
        next(error);
    }
};

export const uploadCustomersFromExcel = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    let uploadedFilePath: string | null = null;
    
    try {
        if (!req.file) {
            await transaction.rollback();
            return sendServerErrorResponse(res, 'No file uploaded', new Error('No file provided'));
        }

        const userId = res.locals.auth?.user?.id;
        const { tag_ids, segment_ids, is_all_tag, is_all_segment } = req.body;

        // Parse tag_ids and segment_ids if they are strings (from form-data)
        let parsedTagIds = tag_ids;
        let parsedSegmentIds = segment_ids;
        
        if (typeof tag_ids === 'string') {
            try {
                parsedTagIds = JSON.parse(tag_ids);
            } catch (e) {
                parsedTagIds = [];
            }
        }
        
        if (typeof segment_ids === 'string') {
            try {
                parsedSegmentIds = JSON.parse(segment_ids);
            } catch (e) {
                parsedSegmentIds = [];
            }
        }

        // Parse is_all_tag and is_all_segment from strings to booleans
        const isAllTag = is_all_tag === 'true';
        const isAllSegment = is_all_segment === 'true';

        uploadedFilePath = req.file.path;

        // Read the Excel file
        const workbook = XLSX.readFile(uploadedFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!Array.isArray(data) || data.length === 0) {
            await transaction.rollback();
            return sendServerErrorResponse(res, 'Excel file is empty or invalid', new Error('No data found in Excel file'));
        }

        const finalTagIds = isAllTag === true ? await tagService.getAssignableTagIdsForUser(userId) : (Array.isArray(parsedTagIds) ? parsedTagIds : []);
        const finalSegmentIds = isAllSegment === true ? await segmentService.getSegmentIdsForUser(userId) : (Array.isArray(parsedSegmentIds) ? parsedSegmentIds : []);

        const results = {
            created: 0,
            skipped: 0,
            total: data.length,
            errors: [] as string[]
        };

        for (let i = 1; i < data.length; i++) {
            const row = data[i] as any;
            
            try {
                // Extract customer data from row
                const customerData = {
                    name: row[0] ? String(row[0]).trim() : '',
                    email: row[1] ? String(row[1]).trim() : null,
                    mobile: row[2] ? String(row[2]).trim() : null
                };

                // Validate required fields
                if (!customerData.name || typeof customerData.name !== 'string' || customerData.name.trim() === '') {
                    results.skipped++;
                    results.errors.push(`Row ${i + 2}: Name is required and cannot be empty`);
                    continue;
                }

                // Check for duplicates
                const isDuplicate = await customerService.checkDuplicateCustomer(
                    customerData.email, 
                    customerData.mobile, 
                    userId, 
                    undefined, // excludeCustomerId - not needed for bulk upload
                    transaction
                );

                if (isDuplicate) {
                    results.skipped++;
                    results.errors.push(`Row ${i + 2}: Customer with same email or mobile already exists`);
                    continue;
                }

                // Create customer
                const customer = await customerService.createCustomer(customerData, userId, transaction);

                // Set tags and segments
                if (finalTagIds.length) {
                    await customerService.setCustomerTags(customer.id, finalTagIds, userId, transaction);
                }
                if (finalSegmentIds.length) {
                    await customerService.setCustomerSegments(customer.id, finalSegmentIds, transaction);
                }

                results.created++;
            } catch (error) {
                results.skipped++;
                results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        await transaction.commit();

        // Clean up uploaded file
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }

        return sendSuccessResponse(res, 'Customers uploaded successfully', results);
    } catch (error) {
        await transaction.rollback();
        
        // Clean up uploaded file on error
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        
        loggerService.error(`Error uploading customers from Excel: ${error}`);
        sendServerErrorResponse(res, responseMessages.customer.failedToCreate, error);
        next(error);
    }
};
