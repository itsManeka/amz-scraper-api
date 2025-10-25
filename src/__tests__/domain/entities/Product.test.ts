import { Product } from '../../../domain/entities/Product';
import { PromoCode } from '../../../domain/entities/PromoCode';

describe('Product', () => {
    describe('constructor', () => {
        it('should create a Product without promo code', () => {
            const product = new Product('6589737258');

            expect(product.asin).toBe('6589737258');
            expect(product.promoCode).toBeNull();
        });

        it('should create a Product with promo code', () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );
            const product = new Product('6589737258', promoCode);

            expect(product.asin).toBe('6589737258');
            expect(product.promoCode).toBe(promoCode);
        });

        it('should trim whitespace from ASIN', () => {
            const product = new Product('  6589737258  ');

            expect(product.asin).toBe('6589737258');
        });

        it('should throw error if ASIN is empty', () => {
            expect(() => {
                new Product('');
            }).toThrow('Product ASIN cannot be empty');
        });

        it('should throw error if ASIN is invalid format', () => {
            expect(() => {
                new Product('123'); // Too short
            }).toThrow('Product ASIN must be 10 alphanumeric characters');
        });

        it('should throw error if ASIN contains special characters', () => {
            expect(() => {
                new Product('ABC-123456'); // Contains hyphen
            }).toThrow('Product ASIN must be 10 alphanumeric characters');
        });

        it('should accept valid 10-character alphanumeric ASIN', () => {
            const product1 = new Product('6589737258');
            const product2 = new Product('B08N5WRWNW');
            const product3 = new Product('ABC1234567');

            expect(product1.asin).toBe('6589737258');
            expect(product2.asin).toBe('B08N5WRWNW');
            expect(product3.asin).toBe('ABC1234567');
        });
    });

    describe('hasPromoCode', () => {
        it('should return false when product has no promo code', () => {
            const product = new Product('6589737258');

            expect(product.hasPromoCode()).toBe(false);
        });

        it('should return true when product has promo code', () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );
            const product = new Product('6589737258', promoCode);

            expect(product.hasPromoCode()).toBe(true);
        });
    });

    describe('toJSON', () => {
        it('should return plain object without promo code', () => {
            const product = new Product('6589737258');
            const json = product.toJSON();

            expect(json).toEqual({
                asin: '6589737258',
                promoCode: null,
            });
        });

        it('should return plain object with promo code', () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );
            const product = new Product('6589737258', promoCode);
            const json = product.toJSON();

            expect(json).toEqual({
                asin: '6589737258',
                promoCode: {
                    name: 'HALLOWEEN20',
                    url: 'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                    promotionId: 'A2P3X1AN29HWHX',
                },
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
            const product = new Product('6589737258', promoCode);

            expect(product.asin).toBe('6589737258');
            expect(product.promoCode).toBe(promoCode);
        });
    });
});
