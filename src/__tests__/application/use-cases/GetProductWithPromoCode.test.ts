import { GetProductWithPromoCode } from '../../../application/use-cases/GetProductWithPromoCode';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { Product } from '../../../domain/entities/Product';
import { PromoCode } from '../../../domain/entities/PromoCode';

describe('GetProductWithPromoCode', () => {
    let useCase: GetProductWithPromoCode;
    let mockRepository: jest.Mocked<IProductRepository>;

    beforeEach(() => {
        mockRepository = {
            getProductByAsin: jest.fn(),
        } as jest.Mocked<IProductRepository>;
        useCase = new GetProductWithPromoCode(mockRepository);
    });

    describe('execute', () => {
        it('should return product with promo code', async () => {
            const promoCode = new PromoCode(
                'HALLOWEEN20',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );
            const product = new Product('6589737258', promoCode);
            mockRepository.getProductByAsin.mockResolvedValue(product);

            const result = await useCase.execute('6589737258');

            expect(result).toBe(product);
            expect(result.hasPromoCode()).toBe(true);
            expect(mockRepository.getProductByAsin).toHaveBeenCalledWith('6589737258');
        });

        it('should return product without promo code', async () => {
            const product = new Product('1234567890');
            mockRepository.getProductByAsin.mockResolvedValue(product);

            const result = await useCase.execute('1234567890');

            expect(result).toBe(product);
            expect(result.hasPromoCode()).toBe(false);
        });

        it('should trim whitespace from ASIN', async () => {
            const product = new Product('6589737258');
            mockRepository.getProductByAsin.mockResolvedValue(product);

            await useCase.execute('  6589737258  ');

            expect(mockRepository.getProductByAsin).toHaveBeenCalledWith('6589737258');
        });

        it('should throw error if ASIN is empty', async () => {
            await expect(useCase.execute('')).rejects.toThrow('ASIN is required');
            expect(mockRepository.getProductByAsin).not.toHaveBeenCalled();
        });

        it('should throw error if ASIN is whitespace only', async () => {
            await expect(useCase.execute('   ')).rejects.toThrow('ASIN is required');
            expect(mockRepository.getProductByAsin).not.toHaveBeenCalled();
        });

        it('should propagate repository errors', async () => {
            const error = new Error('Repository error');
            mockRepository.getProductByAsin.mockRejectedValue(error);

            await expect(useCase.execute('6589737258')).rejects.toThrow(error);
        });
    });
});
