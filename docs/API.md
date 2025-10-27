# Amazon Scraper API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

## Overview

The Amazon Scraper API provides endpoints for extracting product information and promotional codes from Amazon Brazil (amazon.com.br). The API supports:

- Product verification with promo code extraction (Cheerio + Axios)
- Asynchronous promotion page scraping with Puppeteer
- Category and subcategory filtering
- Job-based architecture for long-running tasks

## Base URL

```
http://localhost:3000
```

Production: `https://your-app.onrender.com`

## Authentication

The API requires authentication via API Key for all endpoints except health check and root.

### API Key Header

All protected endpoints require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/products/B08N5WRWNW
```

### Protected Endpoints

- ✅ `/api/products/*` - Requires authentication
- ✅ `/api/promotions/*` - Requires authentication
- ❌ `/api/health` - Public (for monitoring)
- ❌ `/` - Public (API info)

### Error Responses

**Missing API Key:**
```json
{
  "error": {
    "message": "API key is required. Please provide X-API-Key header",
    "type": "AuthenticationError",
    "statusCode": 401
  }
}
```

**Invalid API Key:**
```json
{
  "error": {
    "message": "Invalid API key",
    "type": "AuthenticationError",
    "statusCode": 401
  }
}
```

### Configuration

API keys are configured via the `API_KEYS` environment variable. See the [README](../README.md) for setup instructions.

## Endpoints

### Health Check

#### `GET /api/health`

Returns API health status and job statistics.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-10-25T10:30:00.000Z",
  "jobs": {
    "running": 2,
    "pending": 0,
    "completed": 15,
    "failed": 1,
    "total": 18
  }
}
```

---

### Product Verification

#### `GET /api/products/:asin`

Retrieves product information and extracts promotional code if available. If a promo code with a promotion URL is found, automatically triggers a background job to scrape the full promotion page.

**Parameters:**
- `asin` (path, required): Amazon Standard Identification Number (10 alphanumeric characters)
- `category` (query, optional): Category filter for promotion scraping (e.g., "Livros", "Eletrônicos")
- `subcategory` (query, optional): Subcategory filter for promotion scraping (requires category)
- `maxClicks` (query, optional): Maximum number of "Show More" button clicks (1-50, default: 10)

**Example:**
```
GET /api/products/B08N5WRWNW?category=Livros&maxClicks=15
```

**Response:**
```json
{
  "product": {
    "asin": "B08N5WRWNW",
    "promoCode": {
      "name": "HALLOWEEN20",
      "url": "https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX",
      "promotionId": "A2P3X1AN29HWHX"
    }
  },
  "promotionJob": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending"
  }
}
```

**Response (no promo code):**
```json
{
  "product": {
    "asin": "B08N5WRWNW",
    "promoCode": null
  },
  "promotionJob": null
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ASIN format
- `404 Not Found`: Product not found
- `500 Internal Server Error`: Scraping or parsing error

---

#### `POST /api/products/batch`

Retrieves multiple products (up to 10) and extracts promotional codes. If promo codes with promotion URLs are found, automatically triggers background jobs to scrape the full promotion pages. Duplicate promotion jobs are prevented - if a promotion is already being scraped or has been successfully scraped, the existing job is returned.

**Request Body:**
```json
{
  "asins": ["B08N5WRWNW", "B08N5WRWNX", "B08N5WRWNY"],
  "category": "Livros",
  "subcategory": "Mangá HQs, Mangás e Graphic Novels",
  "maxClicks": 15
}
```

**Parameters:**
- `asins` (required): Array of product ASINs (1-10 items)
- `category` (optional): Category filter for promotion scraping
- `subcategory` (optional): Subcategory filter for promotion scraping (requires category)
- `maxClicks` (optional): Maximum number of "Show More" button clicks (1-50, default: 10)

**Response:**
```json
{
  "products": [
    {
      "product": {
        "asin": "B08N5WRWNW",
        "promoCode": {
          "name": "BOOKSPROMO",
          "url": "https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX",
          "promotionId": "A2P3X1AN29HWHX"
        }
      },
      "promotionJob": {
        "jobId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "pending"
      },
      "error": null
    },
    {
      "product": {
        "asin": "B08N5WRWNX",
        "promoCode": {
          "name": "BOOKSPROMO",
          "url": "https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX",
          "promotionId": "A2P3X1AN29HWHX"
        }
      },
      "promotionJob": {
        "jobId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "running"
      },
      "error": null
    },
    {
      "product": {
        "asin": "B08N5WRWNY",
        "promoCode": null
      },
      "promotionJob": null,
      "error": null
    }
  ],
  "total": 3,
  "successful": 3,
  "failed": 0
}
```

**Response with Errors:**
```json
{
  "products": [
    {
      "product": {
        "asin": "B08N5WRWNW",
        "promoCode": null
      },
      "promotionJob": null,
      "error": null
    },
    {
      "product": {
        "asin": "INVALIDASIN"
      },
      "promotionJob": null,
      "error": {
        "message": "Product not found",
        "type": "ProductNotFoundError"
      }
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

**Notes:**
- Products are fetched concurrently for better performance
- If multiple products share the same promo code, only one promotion scraping job is created
- Individual product failures don't affect other products in the batch
- Useful for automated hourly checks of multiple products

**Error Responses:**
- `400 Bad Request`: Invalid request body, array empty or >10 items, invalid ASIN format
- `500 Internal Server Error`: Server error

---

### Promotion Scraping

#### `POST /api/promotions/scrape`

Initiates an asynchronous promotion scraping job. The job uses Puppeteer to navigate the promotion page, apply filters, click "Show More" buttons, and extract all product ASINs.

**Request Body:**
```json
{
  "promotionId": "A2P3X1AN29HWHX",
  "category": "Livros",
  "subcategory": "Mangá HQs, Mangás e Graphic Novels",
  "maxClicks": 15
}
```

**Parameters:**
- `promotionId` (required): Amazon promotion ID (alphanumeric)
- `category` (optional): Product category filter
- `subcategory` (optional): Product subcategory filter (requires category)
- `maxClicks` (optional): Maximum number of "Show More" button clicks (1-50, default: 10)

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Promotion scraping job created successfully"
}
```

**Status Code:** `202 Accepted`

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Job creation failed

---

#### `GET /api/promotions/jobs/:jobId`

Retrieves the status and results of a promotion scraping job.

**Parameters:**
- `jobId` (path, required): Job ID returned from scrape endpoint

**Response (Pending):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "createdAt": "2025-10-25T10:30:00.000Z"
}
```

**Response (Running):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": {
    "productsFound": 45,
    "lastUpdate": "2025-10-25T10:32:00.000Z"
  },
  "startedAt": "2025-10-25T10:30:30.000Z"
}
```

**Response (Completed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "promotion": {
      "id": "A2P3X1AN29HWHX",
      "description": "20% off em Livros de Halloween",
      "details": "De sexta-feira 24 de outubro de 2025 às 09:00 BRT até sexta-feira 31 de outubro de 2025",
      "discountType": "percentage",
      "discountValue": 20,
      "startDate": "2025-10-24T09:00:00-03:00",
      "endDate": "2025-10-31T23:59:59-03:00",
      "asins": [
        "B08N5WRWNW",
        "B08N5WRWNX",
        "..."
      ]
    }
  },
  "completedAt": "2025-10-25T10:35:00.000Z"
}
```

**Response (Failed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Failed to scrape promotion: Timeout exceeded",
  "completedAt": "2025-10-25T10:40:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid job ID
- `404 Not Found`: Job not found
- `500 Internal Server Error`: Server error

---

#### `GET /api/promotions/:promotionId`

Retrieves cached promotion data if available. This is a quick check that doesn't trigger scraping.

**Parameters:**
- `promotionId` (path, required): Amazon promotion ID
- `category` (query, optional): Category filter used in original scraping
- `subcategory` (query, optional): Subcategory filter used in original scraping

**Example:**
```
GET /api/promotions/A2P3X1AN29HWHX?category=Livros&subcategory=Mangá
```

**Response:**
```json
{
  "promotion": {
    "id": "A2P3X1AN29HWHX",
    "description": "20% off em Livros de Halloween",
    "details": "...",
    "discountType": "percentage",
    "discountValue": 20,
    "startDate": "2025-10-24T09:00:00-03:00",
    "endDate": "2025-10-31T23:59:59-03:00",
    "asins": ["B08N5WRWNW", "..."]
  },
  "cached": true
}
```

**Error Responses:**
- `400 Bad Request`: Invalid promotion ID
- `404 Not Found`: Promotion not found in cache
- `500 Internal Server Error`: Server error

---

## Error Handling

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "type": "ErrorType",
    "statusCode": 400,
    "details": {}
  }
}
```

### Error Types

- `ValidationError`: Invalid request parameters
- `ProductNotFoundError`: Product not found on Amazon
- `AuthenticationError`: Missing or invalid API key
- `HttpError`: HTTP request failed
- `ParsingError`: Failed to parse HTML
- `NotFoundError`: Resource not found
- `ScraperError`: General scraping error

## Rate Limiting

Currently, there is no rate limiting enforced. However, please be respectful:

- Maximum 2 concurrent promotion scraping jobs
- Job timeout: 10 minutes
- Avoid excessive requests to prevent overloading Amazon's servers

## Category Constants

The API accepts any category/subcategory string, but common Amazon Brazil categories are provided as constants for convenience:

**Common Categories:**
- `Livros` - Books
- `Eletrônicos` - Electronics
- `Computadores e Informática` - Computers and IT
- `Celulares e Comunicação` - Cell Phones and Communication
- `Casa e Cozinha` - Home and Kitchen
- `Esportes e Aventura` - Sports and Outdoors
- `Brinquedos e Jogos` - Toys and Games
- `Bebês` - Baby Products
- `Moda` - Fashion
- `Beleza e Cuidado Pessoal` - Beauty and Personal Care

**Common Book Subcategories:**
- `Mangá HQs, Mangás e Graphic Novels`
- `Literatura e Ficção`
- `Autoajuda`
- `Infantil`
- `Romance`
- `Suspense e Thriller`
- `Negócios e Economia`
- `História`

## Duplicate Job Prevention

The API automatically prevents duplicate promotion scraping jobs:

- **Same Promotion ID + Category + Subcategory**: If a job is already pending, running, or successfully completed for a specific combination, the existing job is returned instead of creating a new one.
- **Failed Jobs Allow Retry**: If the only existing jobs for a promotion have failed, a new job can be created to retry the scraping.
- **Different Filters = Different Jobs**: Jobs with different category/subcategory filters are treated as separate jobs, even for the same promotion ID.

**Example:**
```bash
# First call - creates new job
curl -H "X-API-Key: your-api-key-here" \
  "http://localhost:3000/api/products/B08N5WRWNW?category=Livros"
# Returns: { "promotionJob": { "jobId": "abc-123", "status": "pending" } }

# Second call with same category - returns existing job
curl -H "X-API-Key: your-api-key-here" \
  "http://localhost:3000/api/products/B08N5WRWNX?category=Livros"
# Returns: { "promotionJob": { "jobId": "abc-123", "status": "running" } }

# Third call with different category - creates new job
curl -H "X-API-Key: your-api-key-here" \
  "http://localhost:3000/api/products/B08N5WRWNX?category=Eletrônicos"
# Returns: { "promotionJob": { "jobId": "def-456", "status": "pending" } }
```

This prevents unnecessary duplicate scraping and saves resources when processing multiple products with the same promotion.

## Examples

### Example 1: Verify Product and Get Promo Code

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/products/B08N5WRWNW
```

### Example 2: Verify Product with Category Filter

```bash
curl -H "X-API-Key: your-api-key-here" \
  "http://localhost:3000/api/products/B08N5WRWNW?category=Livros&maxClicks=20"
```

### Example 3: Batch Product Check

```bash
curl -X POST http://localhost:3000/api/products/batch \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "asins": ["B08N5WRWNW", "B08N5WRWNX", "B08N5WRWNY"],
    "category": "Livros",
    "maxClicks": 5
  }'
```

### Example 4: Start Promotion Scraping with Filters

```bash
curl -X POST http://localhost:3000/api/promotions/scrape \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "promotionId": "A2P3X1AN29HWHX",
    "category": "Livros",
    "subcategory": "Mangá HQs, Mangás e Graphic Novels",
    "maxClicks": 25
  }'
```

### Example 5: Check Job Status

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/promotions/jobs/550e8400-e29b-41d4-a716-446655440000
```

### Example 6: Get Cached Promotion

```bash
curl -H "X-API-Key: your-api-key-here" \
  "http://localhost:3000/api/promotions/A2P3X1AN29HWHX?category=Livros"
```

### Example 7: Health Check

```bash
curl http://localhost:3000/api/health
```

---

## Workflow Example

### Single Product Workflow

1. **Check product for promo code:**
   ```bash
   curl -H "X-API-Key: your-api-key-here" \
     "http://localhost:3000/api/products/B08N5WRWNW?category=Livros&maxClicks=15"
   ```

2. **If promo code found, a job is automatically created. Check job status:**
   ```bash
   curl -H "X-API-Key: your-api-key-here" \
     http://localhost:3000/api/promotions/jobs/{jobId}
   ```

3. **Poll job status until completed (or use webhooks in future version)**

4. **Retrieve full promotion data from completed job result**

5. **Subsequent requests can use cached data:**
   ```bash
   curl -H "X-API-Key: your-api-key-here" \
     "http://localhost:3000/api/promotions/A2P3X1AN29HWHX?category=Livros"
   ```

### Batch Product Workflow (Recommended for Hourly Checks)

1. **Check multiple products at once (e.g., every hour):**
   ```bash
   curl -X POST http://localhost:3000/api/products/batch \
     -H "X-API-Key: your-api-key-here" \
     -H "Content-Type: application/json" \
     -d '{
       "asins": ["ASIN1", "ASIN2", "ASIN3", "ASIN4", "ASIN5", 
                 "ASIN6", "ASIN7", "ASIN8", "ASIN9", "ASIN10"],
       "category": "Livros"
     }'
   ```

2. **Response includes all products and any triggered promotion jobs**

3. **For products with promo codes, jobs are automatically created (or existing jobs returned if already running)**

4. **Check individual job statuses as needed:**
   ```bash
   curl -H "X-API-Key: your-api-key-here" \
     http://localhost:3000/api/promotions/jobs/{jobId}
   ```

5. **Benefits:**
   - Concurrent fetching for better performance
   - Automatic duplicate prevention
   - Individual errors don't fail entire batch
   - Perfect for scheduled checks

---

## Notes

- **Browser Fingerprinting**: The API uses user-agent rotation and randomized headers to avoid detection
- **Show More Button**: Automatically clicks "Show More" buttons (up to 10 times by default, configurable with `maxClicks` parameter up to 50) to load all products
- **Category Filtering**: Apply Amazon's native filters to narrow down results
- **Caching**: Promotion data is cached for 30 minutes to reduce scraping frequency
- **Storage**: Job data is persisted to disk and survives server restarts
- **Clean Architecture**: The API follows Clean Architecture principles for maintainability

---

## Support

For issues or questions, please open an issue on GitHub:
https://github.com/itsmaneka/amz-scraper-api/issues

