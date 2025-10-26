import { JobManager } from '../../infrastructure/jobs/JobManager';
import { IStorage } from '../../infrastructure/storage/IStorage';
import { Promotion } from '../../domain/entities/Promotion';

describe('JobManager - findJobByPromotion', () => {
    let jobManager: JobManager;
    let mockStorage: jest.Mocked<IStorage>;

    beforeEach(() => {
        mockStorage = {
            save: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue(null),
            delete: jest.fn().mockResolvedValue(undefined),
            exists: jest.fn().mockResolvedValue(false),
            listKeys: jest.fn().mockResolvedValue([]),
            clear: jest.fn().mockResolvedValue(undefined),
        } as jest.Mocked<IStorage>;

        jobManager = new JobManager(mockStorage, 2);
    });

    describe('findJobByPromotion', () => {
        it('should return null when no jobs exist', async () => {
            const result = await jobManager.findJobByPromotion('ABC123');
            expect(result).toBeNull();
        });

        it('should find pending job by promotion ID', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            const job = await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                { promotionId: 'ABC123' }
            );

            const found = await jobManager.findJobByPromotion('ABC123');

            expect(found).not.toBeNull();
            expect(found?.id).toBe(job.id);
            // Job can be pending or running depending on timing
            expect(['pending', 'running']).toContain(found?.status);
        });

        it('should find running job by promotion ID', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            // Create job
            const job = await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    return promotion;
                },
                { promotionId: 'ABC123' }
            );

            // Give it time to start running
            await new Promise((resolve) => setTimeout(resolve, 50));

            const found = await jobManager.findJobByPromotion('ABC123');

            expect(found).not.toBeNull();
            expect(found?.id).toBe(job.id);
        });

        it('should find completed job by promotion ID', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            const job = await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                { promotionId: 'ABC123' }
            );

            // Wait for job to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            const found = await jobManager.findJobByPromotion('ABC123');

            expect(found).not.toBeNull();
            expect(found?.id).toBe(job.id);
            expect(found?.status).toBe('completed');
        });

        it('should return null when only failed jobs exist', async () => {
            await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => {
                    throw new Error('Test error');
                },
                { promotionId: 'ABC123' }
            );

            // Wait for job to fail
            await new Promise((resolve) => setTimeout(resolve, 100));

            const found = await jobManager.findJobByPromotion('ABC123');

            expect(found).toBeNull();
        });

        it('should match job by promotion ID and category', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                { promotionId: 'ABC123', category: 'Livros' }
            );

            const found = await jobManager.findJobByPromotion('ABC123', 'Livros');

            expect(found).not.toBeNull();
            expect(found?.metadata?.promotionId).toBe('ABC123');
            expect(found?.metadata?.category).toBe('Livros');
        });

        it('should not match job with different category', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                { promotionId: 'ABC123', category: 'Livros' }
            );

            const found = await jobManager.findJobByPromotion('ABC123', 'Eletrônicos');

            expect(found).toBeNull();
        });

        it('should match job by promotion ID, category, and subcategory', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                {
                    promotionId: 'ABC123',
                    category: 'Livros',
                    subcategory: 'Mangá HQs, Mangás e Graphic Novels',
                }
            );

            const found = await jobManager.findJobByPromotion(
                'ABC123',
                'Livros',
                'Mangá HQs, Mangás e Graphic Novels'
            );

            expect(found).not.toBeNull();
            expect(found?.metadata?.promotionId).toBe('ABC123');
            expect(found?.metadata?.category).toBe('Livros');
            expect(found?.metadata?.subcategory).toBe('Mangá HQs, Mangás e Graphic Novels');
        });

        it('should not match job with different subcategory', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                {
                    promotionId: 'ABC123',
                    category: 'Livros',
                    subcategory: 'Mangá HQs, Mangás e Graphic Novels',
                }
            );

            const found = await jobManager.findJobByPromotion('ABC123', 'Livros', 'Literatura e Ficção');

            expect(found).toBeNull();
        });

        it('should return most recent non-failed job when multiple exist', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            // Create first job (will fail)
            await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => {
                    throw new Error('Failed');
                },
                { promotionId: 'ABC123' }
            );

            await new Promise((resolve) => setTimeout(resolve, 50));

            // Create second job (will succeed)
            const job2 = await jobManager.createJob<Promotion>(
                'promotion-scraping',
                async () => promotion,
                { promotionId: 'ABC123' }
            );

            const found = await jobManager.findJobByPromotion('ABC123');

            expect(found).not.toBeNull();
            expect(found?.id).toBe(job2.id);
        });

        it('should not match job without metadata', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test',
                details: 'Details',
                discountType: 'percentage',
                discountValue: 10,
                startDate: null,
                endDate: null,
                asins: [],
            });

            // Create job without metadata
            await jobManager.createJob<Promotion>('promotion-scraping', async () => promotion);

            const found = await jobManager.findJobByPromotion('ABC123');

            expect(found).toBeNull();
        });
    });
});

