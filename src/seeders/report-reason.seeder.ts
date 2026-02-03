import { Sequelize } from 'sequelize';
import ReportReason from '../models/report-reason.model';
import Logger from '../utils/logger.service';
import { DEFAULT_REPORT_REASONS } from './constants';

export const seedReportReasons = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const reportReasonsToSeed = await Promise.all(
            DEFAULT_REPORT_REASONS.map(async (reportReason) => {
                return {
                    id: reportReason.id,
                    reason: reportReason.reason,
                    order: reportReason.order
                };
            })
        );

        await ReportReason.bulkCreate(reportReasonsToSeed, {
            transaction,
            updateOnDuplicate: ['reason', 'order', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_REPORT_REASONS.length} report reasons successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding report reasons: ", error);
        throw error;
    }
}
