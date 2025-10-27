import { JobManager } from '../../infrastructure/jobs/JobManager';

describe('JobManager.findJobsByPromotionId', () => {
    let jobManager: JobManager;

    beforeEach(async () => {
        jobManager = new JobManager(null, 2);
    });

    it('should return empty array when no jobs exist for promotion', async () => {
        const jobs = await jobManager.findJobsByPromotionId('PROMO123');
        expect(jobs).toEqual([]);
    });

    it('should return all jobs for a promotion', async () => {
        // Create jobs for PROMO123
        const job1 = await jobManager.createJob(
            'promotion-scraping',
            async () => ({ test: 'data' }),
            { promotionId: 'PROMO123', subcategory: 'Romance' }
        );

        const job2 = await jobManager.createJob(
            'promotion-scraping',
            async () => ({ test: 'data' }),
            { promotionId: 'PROMO123', subcategory: 'Fiction' }
        );

        // Create job for different promotion
        await jobManager.createJob('promotion-scraping', async () => ({ test: 'data' }), {
            promotionId: 'PROMO456',
            subcategory: 'Romance',
        });

        const jobs = await jobManager.findJobsByPromotionId('PROMO123');

        expect(jobs).toHaveLength(2);
        expect(jobs.map((j) => j.id)).toContain(job1.id);
        expect(jobs.map((j) => j.id)).toContain(job2.id);
    });

    it('should return parent and child jobs', async () => {
        const parentJob = await jobManager.createJob(
            'promotion-scraping-orchestrator',
            async () => ({ test: 'data' }),
            {
                promotionId: 'PROMO123',
                category: 'Livros',
                childJobIds: [],
            }
        );

        const childJob1 = await jobManager.createJob(
            'promotion-scraping',
            async () => ({ test: 'data' }),
            {
                promotionId: 'PROMO123',
                category: 'Livros',
                subcategory: 'Romance',
                parentJobId: parentJob.id,
            }
        );

        const childJob2 = await jobManager.createJob(
            'promotion-scraping',
            async () => ({ test: 'data' }),
            {
                promotionId: 'PROMO123',
                category: 'Livros',
                subcategory: 'Fiction',
                parentJobId: parentJob.id,
            }
        );

        const jobs = await jobManager.findJobsByPromotionId('PROMO123');

        expect(jobs).toHaveLength(3);

        const parent = jobs.find((j) => j.id === parentJob.id);
        const child1 = jobs.find((j) => j.id === childJob1.id);
        const child2 = jobs.find((j) => j.id === childJob2.id);

        expect(parent).toBeDefined();
        expect(child1).toBeDefined();
        expect(child2).toBeDefined();
        expect(child1?.metadata?.parentJobId).toBe(parentJob.id);
        expect(child2?.metadata?.parentJobId).toBe(parentJob.id);
    });

    it('should return jobs regardless of status', async () => {
        await jobManager.createJob(
            'promotion-scraping',
            async () => {
                throw new Error('Failed');
            },
            { promotionId: 'PROMO123', subcategory: 'Romance' }
        );

        await jobManager.createJob('promotion-scraping', async () => ({ test: 'data' }), {
            promotionId: 'PROMO123',
            subcategory: 'Fiction',
        });

        // Wait a bit for jobs to potentially process
        await new Promise((resolve) => setTimeout(resolve, 100));

        const jobs = await jobManager.findJobsByPromotionId('PROMO123');

        expect(jobs).toHaveLength(2);
    });

    it('should not return jobs from other promotions', async () => {
        await jobManager.createJob('promotion-scraping', async () => ({ test: 'data' }), {
            promotionId: 'PROMO123',
        });

        await jobManager.createJob('promotion-scraping', async () => ({ test: 'data' }), {
            promotionId: 'PROMO456',
        });

        await jobManager.createJob('promotion-scraping', async () => ({ test: 'data' }), {
            promotionId: 'PROMO789',
        });

        const jobs = await jobManager.findJobsByPromotionId('PROMO123');

        expect(jobs).toHaveLength(1);
        expect(jobs[0].metadata?.promotionId).toBe('PROMO123');
    });
});
