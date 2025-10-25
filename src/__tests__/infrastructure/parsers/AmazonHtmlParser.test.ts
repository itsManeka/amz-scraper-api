import { AmazonHtmlParser } from '../../../infrastructure/parsers/AmazonHtmlParser';
import { ParsingError } from '../../../infrastructure/errors/ScraperError';
import {
    MOCK_HTML_WITH_COUPON,
    MOCK_HTML_WITHOUT_COUPON,
    MOCK_HTML_INVALID_PAGE,
    MOCK_HTML_RELATIVE_URL,
} from '../../helpers/mockHtml';

describe('AmazonHtmlParser', () => {
    let parser: AmazonHtmlParser;

    beforeEach(() => {
        parser = new AmazonHtmlParser();
    });

    describe('parsePromoCode', () => {
        it('should extract promo code from HTML with coupon', () => {
            const promoCode = parser.parsePromoCode(MOCK_HTML_WITH_COUPON);

            expect(promoCode).not.toBeNull();
            expect(promoCode?.name).toBe('HALLOWEEN20');
            expect(promoCode?.url).toBe(
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX?ref=psp_external&redirectAsin=6589737258'
            );
            expect(promoCode?.promotionId).toBe('A2P3X1AN29HWHX');
        });

        it('should return null for HTML without coupon', () => {
            const promoCode = parser.parsePromoCode(MOCK_HTML_WITHOUT_COUPON);

            expect(promoCode).toBeNull();
        });

        it('should throw error for empty HTML', () => {
            expect(() => {
                parser.parsePromoCode('');
            }).toThrow(ParsingError);
            expect(() => {
                parser.parsePromoCode('');
            }).toThrow('HTML content cannot be empty');
        });

        it('should throw error for whitespace-only HTML', () => {
            expect(() => {
                parser.parsePromoCode('   ');
            }).toThrow(ParsingError);
        });

        it('should handle relative URLs by converting to absolute', () => {
            const promoCode = parser.parsePromoCode(MOCK_HTML_RELATIVE_URL);

            expect(promoCode).not.toBeNull();
            expect(promoCode?.name).toBe('TESTCODE');
            expect(promoCode?.url).toBe('https://www.amazon.com.br/promotion/psp/TESTPROMO123');
            expect(promoCode?.promotionId).toBe('TESTPROMO123');
        });

        it('should return null if coupon element exists but has no link', () => {
            const htmlWithoutLink = `
        <html>
          <body>
            <span id="promoMessageCXCWtest">  : TESTCODE  </span>
          </body>
        </html>
      `;

            const promoCode = parser.parsePromoCode(htmlWithoutLink);
            expect(promoCode).toBeNull();
        });

        it('should return null if coupon element exists but link has no href', () => {
            const htmlWithoutHref = `
        <html>
          <body>
            <span id="promoMessageCXCWtest">  : TESTCODE  
              <a class="cxcwEmphasisLink">Ver itens</a>
            </span>
          </body>
        </html>
      `;

            const promoCode = parser.parsePromoCode(htmlWithoutHref);
            expect(promoCode).toBeNull();
        });

        it('should return null if URL does not contain promotion ID', () => {
            const htmlWithInvalidUrl = `
        <html>
          <body>
            <span id="promoMessageCXCWtest">  : TESTCODE  
              <a class="cxcwEmphasisLink" href="https://www.amazon.com.br/invalid-url">Ver itens</a>
            </span>
          </body>
        </html>
      `;

            const promoCode = parser.parsePromoCode(htmlWithInvalidUrl);
            expect(promoCode).toBeNull();
        });
    });

    describe('isValidProductPage', () => {
        it('should return true for valid product page with productTitle', () => {
            const isValid = parser.isValidProductPage(MOCK_HTML_WITH_COUPON);
            expect(isValid).toBe(true);
        });

        it('should return true for valid product page with buybox', () => {
            const isValid = parser.isValidProductPage(MOCK_HTML_WITHOUT_COUPON);
            expect(isValid).toBe(true);
        });

        it('should return true for page with data-asin attribute', () => {
            const htmlWithAsin = `
        <html>
          <body>
            <div data-asin="6589737258">Product content</div>
          </body>
        </html>
      `;
            const isValid = parser.isValidProductPage(htmlWithAsin);
            expect(isValid).toBe(true);
        });

        it('should return false for invalid product page', () => {
            const isValid = parser.isValidProductPage(MOCK_HTML_INVALID_PAGE);
            expect(isValid).toBe(false);
        });

        it('should return false for empty HTML', () => {
            const isValid = parser.isValidProductPage('');
            expect(isValid).toBe(false);
        });

        it('should return false for whitespace-only HTML', () => {
            const isValid = parser.isValidProductPage('   ');
            expect(isValid).toBe(false);
        });
    });
});
