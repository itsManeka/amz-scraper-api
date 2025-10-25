/**
 * Mock HTML responses for testing
 * Based on real Amazon Brazil product pages
 */

export const MOCK_HTML_WITH_COUPON = `
<!DOCTYPE html>
<html lang="pt-br">
<head><title>Product with Coupon</title></head>
<body>
  <div id="dp">
    <h1 id="productTitle">Reckless Volume 1</h1>
    <div id="buybox" data-feature-name="buybox">
      <div data-asin="6589737258">
        <div class="offersConsistencyEnabled">
          <div id="ppd_newAccordionRow">
            <span class="promoPriceBlockMessage" data-csa-c-content-id="amzn1.asin.6589737258:amzn1.bot.NEW">
              <div style="padding:5px 0px 5px 0px;">
                <span data-csa-c-type="item" data-csa-c-item-id="amzn1.asin.6589737258:amzn1.promotion.A2P3X1AN29HWHX" id="promoMessageCXCWpctch0293569346607917">
                  <span class="a-size-small a-color-secondary">Faça login para resgatar.</span>
                  <label for="checkboxpctch0293569346607917" id="greenBadgepctch0293569346607917">Salve o cupom 20%</label>
                  <span id="promoMessageCXCWpctch0293569346607917">  : HALLOWEEN20  <span class="instrumentationElement">
                    <a id="emphasisLink" class="a-link-emphasis cxcwEmphasisLink" href="https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX?ref=psp_external&redirectAsin=6589737258">Ver itens participantes</a>
                  </span>
                  </span>
                </span>
              </div>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const MOCK_HTML_WITHOUT_COUPON = `
<!DOCTYPE html>
<html lang="pt-br">
<head><title>Product without Coupon</title></head>
<body>
  <div id="dp">
    <h1 id="productTitle">Product Without Coupon</h1>
    <div id="buybox" data-feature-name="buybox">
      <div data-asin="1234567890">
        <div class="price-section">
          <span class="a-price">R$ 99,90</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const MOCK_HTML_INVALID_PAGE = `
<!DOCTYPE html>
<html>
<head><title>Not a product page</title></head>
<body>
  <h1>404 Not Found</h1>
  <p>The page you requested was not found.</p>
</body>
</html>
`;

export const MOCK_HTML_RELATIVE_URL = `
<!DOCTYPE html>
<html lang="pt-br">
<head><title>Product with Relative URL Coupon</title></head>
<body>
  <div id="dp">
    <h1 id="productTitle">Test Product</h1>
    <div data-asin="TEST123456">
      <span id="promoMessageCXCWtest123">  : TESTCODE  
        <a class="cxcwEmphasisLink" href="/promotion/psp/TESTPROMO123">Ver itens</a>
      </span>
    </div>
  </div>
</body>
</html>
`;

export const MOCK_PROMOTION_HTML = `
<!DOCTYPE html>
<html lang="pt-br">
<head><title>Amazon.com.br: 20% off em Livros de Halloween promoção</title></head>
<body>
  <div id="promotionTitle">
    <h1><span class="a-size-extra-large a-text-bold">20% off em Livros de Halloween</span></h1>
  </div>
  <div id="promotionSchedule">
    <span class="a-size-base inlineBlock">De sexta-feira 24 de outubro de 2025 às 09:00 BRT até sexta-feira 31 de outubro de 2025</span>
  </div>
  <div id="productInfoList_gridItem">
    <div class="productGrid">
      <a href="https://www.amazon.com.br/dp/6589737258?ref=psp_pc_a_A2P3X1AN29HWHX">Product 1</a>
    </div>
    <div class="productGrid">
      <a href="https://www.amazon.com.br/dp/8594318782?ref=psp_pc_a_A2P3X1AN29HWHX">Product 2</a>
    </div>
    <div class="productGrid">
      <a href="https://www.amazon.com.br/dp/6555655062?ref=psp_pc_a_A2P3X1AN29HWHX">Product 3</a>
    </div>
  </div>
  <script>
    var queryParameter = {
      "promotionId": "A2P3X1AN29HWHX",
      "anti-csrftoken-a2z": 'testCSRFToken123'
    };
  </script>
</body>
</html>
`;

export const MOCK_PROMOTION_HTML_NO_DATES = `
<!DOCTYPE html>
<html lang="pt-br">
<head><title>Promotion Without Dates</title></head>
<body>
  <div id="promotionTitle">
    <h1><span>R$ 50 de desconto</span></h1>
  </div>
  <div id="promotionSchedule">
    <span>Promoção válida</span>
  </div>
  <div id="productInfoList_gridItem">
    <a href="/dp/ASIN123456">Product</a>
  </div>
  <script>
    var queryParameter = { "promotionId": "TESTPROMO" };
  </script>
</body>
</html>
`;
