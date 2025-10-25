import { Promotion } from '../../../domain/entities/Promotion';

describe('Promotion Entity', () => {
    describe('Constructor', () => {
        it('should create a valid Promotion entity', () => {
            const promotion = new Promotion({
                id: 'A2P3X1AN29HWHX',
                description: '20% off em Livros de Halloween',
                details:
                    'De sexta-feira 24 de outubro de 2025 às 09:00 BRT até sexta-feira 31 de outubro de 2025',
                discountType: 'percentage',
                discountValue: 20,
                startDate: new Date(2025, 9, 24, 9, 0),
                endDate: new Date(2025, 9, 31, 23, 59),
                asins: ['6589737258', '8594318782', '6555655062'],
            });

            expect(promotion.id).toBe('A2P3X1AN29HWHX');
            expect(promotion.description).toBe('20% off em Livros de Halloween');
            expect(promotion.discountType).toBe('percentage');
            expect(promotion.discountValue).toBe(20);
            expect(promotion.asins).toEqual(['6589737258', '8594318782', '6555655062']);
        });

        it('should accept null dates', () => {
            const promotion = new Promotion({
                id: 'TEST123',
                description: 'Test Promotion',
                details: 'No dates available',
                discountType: 'fixed',
                discountValue: 50,
                startDate: null,
                endDate: null,
                asins: ['ASIN123456'],
            });

            expect(promotion.startDate).toBeNull();
            expect(promotion.endDate).toBeNull();
        });

        it('should make asins array immutable', () => {
            const asins = ['ASIN1', 'ASIN2'];
            const promotion = new Promotion({
                id: 'TEST123',
                description: 'Test',
                details: '',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins,
            });

            expect(() => {
                (promotion.asins as any).push('ASIN3');
            }).toThrow();
        });
    });

    describe('Validation', () => {
        it('should throw error if id is missing', () => {
            expect(() => {
                new Promotion({
                    id: '',
                    description: 'Test',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    startDate: null,
                    endDate: null,
                    asins: ['ASIN123'],
                });
            }).toThrow('Promotion ID is required and must be a string');
        });

        it('should throw error if description is missing', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: '',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    startDate: null,
                    endDate: null,
                    asins: ['ASIN123'],
                });
            }).toThrow('Promotion description is required and must be a string');
        });

        it('should throw error if discount type is invalid', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: 'Test',
                    details: '',
                    discountType: 'invalid' as any,
                    discountValue: 10,
                    startDate: null,
                    endDate: null,
                    asins: ['ASIN123'],
                });
            }).toThrow('Discount type must be either "percentage" or "fixed"');
        });

        it('should throw error if discount value is negative', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: 'Test',
                    details: '',
                    discountType: 'percentage',
                    discountValue: -10,
                    startDate: null,
                    endDate: null,
                    asins: ['ASIN123'],
                });
            }).toThrow('Discount value must be a non-negative number');
        });

        it('should throw error if asins array contains non-string', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: 'Test',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    startDate: null,
                    endDate: null,
                    asins: ['ASIN1', 123 as any, 'ASIN2'],
                });
            }).toThrow('All ASINs must be non-empty strings');
        });

        it('should throw error if asins array contains empty string', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: 'Test',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    startDate: null,
                    endDate: null,
                    asins: ['ASIN1', '', 'ASIN2'],
                });
            }).toThrow('All ASINs must be non-empty strings');
        });

        it('should throw error if startDate is not a Date or null', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: 'Test',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    startDate: '2025-10-24' as any,
                    endDate: null,
                    asins: ['ASIN123'],
                });
            }).toThrow('Start date must be a Date object or null');
        });

        it('should throw error if endDate is not a Date or null', () => {
            expect(() => {
                new Promotion({
                    id: 'TEST123',
                    description: 'Test',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    startDate: null,
                    endDate: '2025-10-31' as any,
                    asins: ['ASIN123'],
                });
            }).toThrow('End date must be a Date object or null');
        });
    });
});
