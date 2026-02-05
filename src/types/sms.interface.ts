export interface CreateSmsParams {
    to: string[];
    type: string;
    message: string;
    created_by?: string | null;
}

export interface SendSmsByTagsAndSegmentsParams {
    type: string;
    to?: string[];
    message: string;
    tag_ids?: string[];
    segment_ids?: string[];
}

export type GetAllSmsOptions = {
    page?: number;
    limit?: number;
    search?: string;
    date_to?: string;
    date_from?: string;
    order_direction?: 'ASC' | 'DESC';
    order_by?: 'message' | 'created_at';
};