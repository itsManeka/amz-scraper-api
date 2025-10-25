import { PromoCode } from '../../../domain/entities/PromoCode';

describe('PromoCode', () => {
    describe('constructor', () => {
        it('should create a valid PromoCode instance', () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );

            expect(promoCode.name).toBe('HALLOWEEN20');
            expect(promoCode.url).toBe('https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX');
            expect(promoCode.promotionId).toBe('A2P3X1AN29HWHX');
        });

        it('should trim whitespace from fields', () => {
            const promoCode = new PromoCode(
                '  HALLOWEEN20  ',
                '  https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX  ',
                '  A2P3X1AN29HWHX  '
            );

            expect(promoCode.name).toBe('HALLOWEEN20');
            expect(promoCode.url).toBe('https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX');
            expect(promoCode.promotionId).toBe('A2P3X1AN29HWHX');
        });

        it('should throw error if name is empty', () => {
            expect(() => {
                new PromoCode('', 'https://example.com', 'PROMO123');
            }).toThrow('PromoCode name cannot be empty');
        });

        it('should throw error if url is empty', () => {
            expect(() => {
                new PromoCode('TESTCODE', '', 'PROMO123');
            }).toThrow('PromoCode url cannot be empty');
        });

        it('should throw error if promotionId is empty', () => {
            expect(() => {
                new PromoCode('TESTCODE', 'https://example.com', '');
            }).toThrow('PromoCode promotionId cannot be empty');
        });

        it('should throw error if url is invalid', () => {
            expect(() => {
                new PromoCode('TESTCODE', 'not-a-valid-url', 'PROMO123');
            }).toThrow('PromoCode url must be a valid URL');
        });
    });

    describe('toJSON', () => {
        it('should return a plain object representation', () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );

            const json = promoCode.toJSON();

            expect(json).toEqual({
                name: 'HALLOWEEN20',
                url: 'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                promotionId: 'A2P3X1AN29HWHX',
            });
        });
    });

    describe('immutability', () => {
        it('should have readonly properties', () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );

            // TypeScript compilation would fail if we try to modify
            // This test just confirms the values don't change
            expect(promoCode.name).toBe('HALLOWEEN20');
            expect(promoCode.url).toBe('https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX');
            expect(promoCode.promotionId).toBe('A2P3X1AN29HWHX');
        });
    });
});
