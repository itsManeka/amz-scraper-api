import { AmazonPromotionHtmlParser } from '../../../infrastructure/parsers/AmazonPromotionHtmlParser';
import { MOCK_PROMOTION_HTML } from '../../helpers/mockHtml';

describe('AmazonPromotionHtmlParser', () => {
    let parser: AmazonPromotionHtmlParser;

    beforeEach(() => {
        parser = new AmazonPromotionHtmlParser();
    });

    describe('parsePromotionDetails', () => {
        it('should extract promotion title and details', () => {
            const result = parser.parsePromotionDetails(MOCK_PROMOTION_HTML);

            expect(result.title).toBe('20% off em Livros de Halloween');
            expect(result.details).toContain('De sexta-feira 24 de outubro de 2025');
            expect(result.details).toContain('até sexta-feira 31 de outubro de 2025');
        });

        it('should return empty strings when elements not found', () => {
            const html = '<html><body></body></html>';
            const result = parser.parsePromotionDetails(html);

            expect(result.title).toBe('');
            expect(result.details).toBe('');
        });
    });

    describe('parseDiscountInfo', () => {
        it('should extract percentage discount', () => {
            const result = parser.parseDiscountInfo('20% off em Livros');

            expect(result.type).toBe('percentage');
            expect(result.value).toBe(20);
        });

        it('should extract percentage discount with comma', () => {
            const result = parser.parseDiscountInfo('15,5% de desconto');

            expect(result.type).toBe('percentage');
            expect(result.value).toBe(15.5);
        });

        it('should extract fixed discount', () => {
            const result = parser.parseDiscountInfo('R$ 50 de desconto');

            expect(result.type).toBe('fixed');
            expect(result.value).toBe(50);
        });

        it('should extract fixed discount with decimals', () => {
            const result = parser.parseDiscountInfo('R$ 99,90 off');

            expect(result.type).toBe('fixed');
            expect(result.value).toBe(99.9);
        });

        it('should return default values when no discount found', () => {
            const result = parser.parseDiscountInfo('Promoção especial');

            expect(result.type).toBe('percentage');
            expect(result.value).toBe(0);
        });
    });

    describe('parseDates', () => {
        it('should parse Portuguese date range', () => {
            const details =
                'De sexta-feira 24 de outubro de 2025 às 09:00 BRT até sexta-feira 31 de outubro de 2025';
            const result = parser.parseDates(details);

            expect(result.startDate).not.toBeNull();
            expect(result.endDate).not.toBeNull();

            if (result.startDate) {
                expect(result.startDate.getFullYear()).toBe(2025);
                expect(result.startDate.getMonth()).toBe(9); // October (0-indexed)
                expect(result.startDate.getDate()).toBe(24);
                expect(result.startDate.getHours()).toBe(9);
                expect(result.startDate.getMinutes()).toBe(0);
            }

            if (result.endDate) {
                expect(result.endDate.getFullYear()).toBe(2025);
                expect(result.endDate.getMonth()).toBe(9);
                expect(result.endDate.getDate()).toBe(31);
            }
        });

        it('should return null dates when parsing fails', () => {
            const details = 'Invalid date format';
            const result = parser.parseDates(details);

            expect(result.startDate).toBeNull();
            expect(result.endDate).toBeNull();
        });

        it('should return null dates when empty string', () => {
            const result = parser.parseDates('');

            expect(result.startDate).toBeNull();
            expect(result.endDate).toBeNull();
        });
    });

    describe('parseInitialAsins', () => {
        it('should extract ASINs from product links', () => {
            const result = parser.parseInitialAsins(MOCK_PROMOTION_HTML);

            expect(result).toContain('6589737258');
            expect(result).toContain('8594318782');
            expect(result).toContain('6555655062');
            expect(result.length).toBeGreaterThanOrEqual(3); // May find more ASINs with multi-strategy extraction
        });

        it('should return unique ASINs only', () => {
            const html = `
        <html><body>
          <a href="/dp/ASIN123456">Product 1</a>
          <a href="/dp/ASIN123456">Product 1 again</a>
          <a href="/dp/ASIN789012">Product 2</a>
        </body></html>
      `;
            const result = parser.parseInitialAsins(html);

            expect(result).toEqual(['ASIN123456', 'ASIN789012']);
        });

        it('should return empty array when no ASINs found', () => {
            const html = '<html><body><p>No products here</p></body></html>';
            const result = parser.parseInitialAsins(html);

            expect(result).toEqual([]);
        });

        it('should extract ASINs from relative URLs', () => {
            const html = '<a href="/dp/TEST123456">Product</a>';
            const result = parser.parseInitialAsins(html);

            expect(result).toContain('TEST123456');
        });
    });

    describe('extractPromotionId', () => {
        it('should extract promotion ID from JavaScript', () => {
            const result = parser.extractPromotionId(MOCK_PROMOTION_HTML);

            expect(result).toBe('A2P3X1AN29HWHX');
        });

        it('should return null when promotion ID not found', () => {
            const html = '<html><body><p>No promotion ID</p></body></html>';
            const result = parser.extractPromotionId(html);

            expect(result).toBeNull();
        });

        it('should extract from canonical URL', () => {
            const html =
                '<link rel="canonical" href="https://www.amazon.com.br/promotion/psp/TESTPROMO123" />';
            const result = parser.extractPromotionId(html);

            expect(result).toBe('TESTPROMO123');
        });
    });
});
