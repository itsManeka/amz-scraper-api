import { GetPromotion } from '../../../application/use-cases/GetPromotion';
import { IPromotionRepository } from '../../../domain/repositories/IPromotionRepository';
import { Promotion } from '../../../domain/entities/Promotion';

describe('GetPromotion Use Case', () => {
    let useCase: GetPromotion;
    let mockRepository: jest.Mocked<IPromotionRepository>;

    beforeEach(() => {
        mockRepository = {
            getPromotionById: jest.fn(),
        };
        useCase = new GetPromotion(mockRepository);
    });

    it('should retrieve promotion by ID', async () => {
        const mockPromotion = new Promotion({
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

        mockRepository.getPromotionById.mockResolvedValue(mockPromotion);

        const result = await useCase.execute('A2P3X1AN29HWHX');

        expect(result).toBe(mockPromotion);
        expect(mockRepository.getPromotionById).toHaveBeenCalledWith(
            'A2P3X1AN29HWHX',
            undefined,
            undefined
        );
        expect(mockRepository.getPromotionById).toHaveBeenCalledTimes(1);
    });

    it('should retrieve promotion by ID with category filter', async () => {
        const mockPromotion = new Promotion({
            id: 'A2P3X1AN29HWHX',
            description: '20% off em Livros de Halloween',
            details:
                'De sexta-feira 24 de outubro de 2025 às 09:00 BRT até sexta-feira 31 de outubro de 2025',
            discountType: 'percentage',
            discountValue: 20,
            startDate: new Date(2025, 9, 24, 9, 0),
            endDate: new Date(2025, 9, 31, 23, 59),
            asins: ['6589737258', '8594318782'],
        });

        mockRepository.getPromotionById.mockResolvedValue(mockPromotion);

        const result = await useCase.execute('A2P3X1AN29HWHX', 'Livros');

        expect(result).toBe(mockPromotion);
        expect(mockRepository.getPromotionById).toHaveBeenCalledWith(
            'A2P3X1AN29HWHX',
            'Livros',
            undefined
        );
        expect(mockRepository.getPromotionById).toHaveBeenCalledTimes(1);
    });

    it('should throw error for empty promotion ID', async () => {
        await expect(useCase.execute('')).rejects.toThrow(
            'Promotion ID must be a non-empty string'
        );
        expect(mockRepository.getPromotionById).not.toHaveBeenCalled();
    });

    it('should throw error for non-string promotion ID', async () => {
        await expect(useCase.execute(123 as any)).rejects.toThrow(
            'Promotion ID must be a non-empty string'
        );
        expect(mockRepository.getPromotionById).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
        const error = new Error('Network error');
        mockRepository.getPromotionById.mockRejectedValue(error);

        await expect(useCase.execute('A2P3X1AN29HWHX')).rejects.toThrow('Network error');
    });
});
