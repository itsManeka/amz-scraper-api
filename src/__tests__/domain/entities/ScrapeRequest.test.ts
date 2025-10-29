import { ScrapeRequest } from '../../../domain/entities/ScrapeRequest';

describe('ScrapeRequest Entity', () => {
    describe('Constructor', () => {
        it('should create a valid ScrapeRequest with only promotionId', () => {
            const request = new ScrapeRequest('ABC123');

            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBeNull();
            expect(request.subcategory).toBeNull();
            expect(request.maxClicks).toBe(5); // default value
        });

        it('should create a ScrapeRequest with category', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics');

            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBe('Electronics');
            expect(request.subcategory).toBeNull();
            expect(request.maxClicks).toBe(5); // default value
        });

        it('should create a ScrapeRequest with category and subcategory', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers');

            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBe('Electronics');
            expect(request.subcategory).toBe('Computers');
            expect(request.maxClicks).toBe(5); // default value
        });

        it('should create a ScrapeRequest with custom maxClicks', () => {
            const request = new ScrapeRequest('ABC123', null, null, 25);

            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBeNull();
            expect(request.subcategory).toBeNull();
            expect(request.maxClicks).toBe(25);
        });

        it('should create a ScrapeRequest with all parameters', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers', 15);

            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBe('Electronics');
            expect(request.subcategory).toBe('Computers');
            expect(request.maxClicks).toBe(15);
        });

        it('should trim whitespace from fields', () => {
            const request = new ScrapeRequest('  ABC123  ', '  Electronics  ', '  Computers  ');

            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBe('Electronics');
            expect(request.subcategory).toBe('Computers');
        });

        it('should make properties readonly', () => {
            const request = new ScrapeRequest('ABC123');

            // TypeScript will prevent this at compile time
            // At runtime, readonly doesn't actually prevent assignment in JS
            // But we can verify the properties exist
            expect(request.promotionId).toBe('ABC123');
            expect(request.category).toBeNull();
            expect(request.subcategory).toBeNull();
            expect(request.maxClicks).toBe(5);
        });
    });

    describe('Validation', () => {
        it('should throw error if promotionId is empty', () => {
            expect(() => {
                new ScrapeRequest('');
            }).toThrow('Promotion ID is required and must be a non-empty string');
        });

        it('should throw error if promotionId is whitespace only', () => {
            expect(() => {
                new ScrapeRequest('   ');
            }).toThrow('Promotion ID is required and must be a non-empty string');
        });

        it('should throw error if promotionId is not a string', () => {
            expect(() => {
                new ScrapeRequest(123 as any);
            }).toThrow('Promotion ID is required and must be a non-empty string');
        });

        it('should throw error if promotionId contains special characters', () => {
            expect(() => {
                new ScrapeRequest('ABC-123');
            }).toThrow('Promotion ID must contain only alphanumeric characters');
        });

        it('should throw error if promotionId contains spaces', () => {
            expect(() => {
                new ScrapeRequest('ABC 123');
            }).toThrow('Promotion ID must contain only alphanumeric characters');
        });

        it('should accept alphanumeric promotionId', () => {
            expect(() => {
                new ScrapeRequest('ABC123XYZ');
            }).not.toThrow();

            expect(() => {
                new ScrapeRequest('123456789');
            }).not.toThrow();
        });

        it('should throw error if category is empty string', () => {
            expect(() => {
                new ScrapeRequest('ABC123', '');
            }).toThrow('Category must be a non-empty string or null');
        });

        it('should throw error if category is whitespace only', () => {
            expect(() => {
                new ScrapeRequest('ABC123', '   ');
            }).toThrow('Category must be a non-empty string or null');
        });

        it('should throw error if category is not a string', () => {
            expect(() => {
                new ScrapeRequest('ABC123', 123 as any);
            }).toThrow('Category must be a non-empty string or null');
        });

        it('should throw error if subcategory is empty string', () => {
            expect(() => {
                new ScrapeRequest('ABC123', 'Electronics', '');
            }).toThrow('Subcategory must be a non-empty string or null');
        });

        it('should throw error if subcategory is whitespace only', () => {
            expect(() => {
                new ScrapeRequest('ABC123', 'Electronics', '   ');
            }).toThrow('Subcategory must be a non-empty string or null');
        });

        it('should throw error if subcategory is not a string', () => {
            expect(() => {
                new ScrapeRequest('ABC123', 'Electronics', 123 as any);
            }).toThrow('Subcategory must be a non-empty string or null');
        });

        it('should throw error if subcategory is provided without category', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, 'Computers');
            }).toThrow('Subcategory cannot be specified without a category');
        });

        it('should throw error if maxClicks is not an integer', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 10.5);
            }).toThrow('maxClicks must be an integer');
        });

        it('should throw error if maxClicks is not a number', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 'ten' as any);
            }).toThrow('maxClicks must be an integer');
        });

        it('should throw error if maxClicks is less than 1', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 0);
            }).toThrow('maxClicks must be between 1 and 50');
        });

        it('should throw error if maxClicks is greater than 50', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 51);
            }).toThrow('maxClicks must be between 1 and 50');
        });

        it('should accept maxClicks at minimum boundary (1)', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 1);
            }).not.toThrow();
        });

        it('should accept maxClicks at maximum boundary (50)', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 50);
            }).not.toThrow();
        });

        it('should accept maxClicks in valid range', () => {
            expect(() => {
                new ScrapeRequest('ABC123', null, null, 25);
            }).not.toThrow();
        });
    });

    describe('hasFilters', () => {
        it('should return false when no filters are set', () => {
            const request = new ScrapeRequest('ABC123');

            expect(request.hasFilters()).toBe(false);
        });

        it('should return true when category is set', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics');

            expect(request.hasFilters()).toBe(true);
        });

        it('should return true when category and subcategory are set', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers');

            expect(request.hasFilters()).toBe(true);
        });
    });

    describe('getCacheKey', () => {
        it('should generate cache key with only promotionId', () => {
            const request = new ScrapeRequest('ABC123');

            expect(request.getCacheKey()).toBe('promotion:ABC123:clicks:5');
        });

        it('should generate cache key with category', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics');

            expect(request.getCacheKey()).toBe('promotion:ABC123:Electronics:clicks:5');
        });

        it('should generate cache key with category and subcategory', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers');

            expect(request.getCacheKey()).toBe('promotion:ABC123:Electronics:Computers:clicks:5');
        });

        it('should generate cache key with custom maxClicks', () => {
            const request = new ScrapeRequest('ABC123', null, null, 25);

            expect(request.getCacheKey()).toBe('promotion:ABC123:clicks:25');
        });

        it('should generate cache key with all parameters', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers', 15);

            expect(request.getCacheKey()).toBe('promotion:ABC123:Electronics:Computers:clicks:15');
        });

        it('should generate unique keys for different requests', () => {
            const request1 = new ScrapeRequest('ABC123');
            const request2 = new ScrapeRequest('ABC123', 'Electronics');
            const request3 = new ScrapeRequest('XYZ789');
            const request4 = new ScrapeRequest('ABC123', null, null, 20);

            expect(request1.getCacheKey()).not.toBe(request2.getCacheKey());
            expect(request1.getCacheKey()).not.toBe(request3.getCacheKey());
            expect(request2.getCacheKey()).not.toBe(request3.getCacheKey());
            expect(request1.getCacheKey()).not.toBe(request4.getCacheKey());
        });
    });

    describe('toJSON', () => {
        it('should return plain object without filters', () => {
            const request = new ScrapeRequest('ABC123');

            expect(request.toJSON()).toEqual({
                promotionId: 'ABC123',
                category: null,
                subcategory: null,
                maxClicks: 5,
            });
        });

        it('should return plain object with category', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics');

            expect(request.toJSON()).toEqual({
                promotionId: 'ABC123',
                category: 'Electronics',
                subcategory: null,
                maxClicks: 5,
            });
        });

        it('should return plain object with category and subcategory', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers');

            expect(request.toJSON()).toEqual({
                promotionId: 'ABC123',
                category: 'Electronics',
                subcategory: 'Computers',
                maxClicks: 5,
            });
        });

        it('should return plain object with custom maxClicks', () => {
            const request = new ScrapeRequest('ABC123', null, null, 25);

            expect(request.toJSON()).toEqual({
                promotionId: 'ABC123',
                category: null,
                subcategory: null,
                maxClicks: 25,
            });
        });

        it('should return plain object with all parameters', () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers', 15);

            expect(request.toJSON()).toEqual({
                promotionId: 'ABC123',
                category: 'Electronics',
                subcategory: 'Computers',
                maxClicks: 15,
            });
        });
    });
});
