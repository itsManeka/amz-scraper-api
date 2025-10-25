export class Promotion {
    readonly id: string;
    readonly description: string;
    readonly details: string;
    readonly discountType: 'percentage' | 'fixed';
    readonly discountValue: number;
    readonly startDate: Date | null;
    readonly endDate: Date | null;
    readonly asins: readonly string[];

    constructor(data: {
        id: string;
        description: string;
        details: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        startDate: Date | null;
        endDate: Date | null;
        asins: readonly string[];
    }) {
        this.validateData(data);

        this.id = data.id;
        this.description = data.description;
        this.details = data.details;
        this.discountType = data.discountType;
        this.discountValue = data.discountValue;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.asins = Object.freeze([...data.asins]);
    }

    private validateData(data: {
        id: string;
        description: string;
        details: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        startDate: Date | null;
        endDate: Date | null;
        asins: readonly string[];
    }): void {
        if (!data.id || typeof data.id !== 'string') {
            throw new Error('Promotion ID is required and must be a string');
        }

        if (!data.description || typeof data.description !== 'string') {
            throw new Error('Promotion description is required and must be a string');
        }

        if (typeof data.details !== 'string') {
            throw new Error('Promotion details must be a string');
        }

        if (data.discountType !== 'percentage' && data.discountType !== 'fixed') {
            throw new Error('Discount type must be either "percentage" or "fixed"');
        }

        if (typeof data.discountValue !== 'number' || data.discountValue < 0) {
            throw new Error('Discount value must be a non-negative number');
        }

        if (data.startDate !== null && !(data.startDate instanceof Date)) {
            throw new Error('Start date must be a Date object or null');
        }

        if (data.endDate !== null && !(data.endDate instanceof Date)) {
            throw new Error('End date must be a Date object or null');
        }

        if (!Array.isArray(data.asins)) {
            throw new Error('ASINs must be an array');
        }

        if (data.asins.some((asin) => typeof asin !== 'string' || asin.length === 0)) {
            throw new Error('All ASINs must be non-empty strings');
        }
    }
}
