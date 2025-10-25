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

Currently, the API does not require authentication. This may change in future versions.

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

### Promotion Scraping

#### `POST /api/promotions/scrape`

Initiates an asynchronous promotion scraping job. The job uses Puppeteer to navigate the promotion page, apply filters, click "Show More" buttons, and extract all product ASINs.

**Request Body:**
```json
{
  "promotionId": "A2P3X1AN29HWHX",
  "category": "Livros",
  "subcategory": "Mangá HQs, Mangás e Graphic Novels"
}
```

**Parameters:**
- `promotionId` (required): Amazon promotion ID (alphanumeric)
- `category` (optional): Product category filter
- `subcategory` (optional): Product subcategory filter (requires category)

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
- `HttpError`: HTTP request failed
- `ParsingError`: Failed to parse HTML
- `NotFoundError`: Resource not found
- `ScraperError`: General scraping error

## Rate Limiting

Currently, there is no rate limiting enforced. However, please be respectful:

- Maximum 2 concurrent promotion scraping jobs
- Job timeout: 10 minutes
- Avoid excessive requests to prevent overloading Amazon's servers

## Examples

### Example 1: Verify Product and Get Promo Code

```bash
curl http://localhost:3000/api/products/B08N5WRWNW
```

### Example 2: Start Promotion Scraping with Filters

```bash
curl -X POST http://localhost:3000/api/products/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "promotionId": "A2P3X1AN29HWHX",
    "category": "Livros",
    "subcategory": "Mangá HQs, Mangás e Graphic Novels"
  }'
```

### Example 3: Check Job Status

```bash
curl http://localhost:3000/api/promotions/jobs/550e8400-e29b-41d4-a716-446655440000
```

### Example 4: Get Cached Promotion

```bash
curl "http://localhost:3000/api/promotions/A2P3X1AN29HWHX?category=Livros"
```

### Example 5: Health Check

```bash
curl http://localhost:3000/api/health
```

---

## Workflow Example

1. **Check product for promo code:**
   ```
   GET /api/products/B08N5WRWNW
   ```

2. **If promo code found, a job is automatically created. Check job status:**
   ```
   GET /api/promotions/jobs/{jobId}
   ```

3. **Poll job status until completed (or use webhooks in future version)**

4. **Retrieve full promotion data from completed job result**

5. **Subsequent requests can use cached data:**
   ```
   GET /api/promotions/A2P3X1AN29HWHX
   ```

---

## Notes

- **Browser Fingerprinting**: The API uses user-agent rotation and randomized headers to avoid detection
- **Show More Button**: Automatically clicks "Show More" buttons (up to 20 times) to load all products
- **Category Filtering**: Apply Amazon's native filters to narrow down results
- **Caching**: Promotion data is cached for 30 minutes to reduce scraping frequency
- **Storage**: Job data is persisted to disk and survives server restarts
- **Clean Architecture**: The API follows Clean Architecture principles for maintainability

---

## Support

For issues or questions, please open an issue on GitHub:
https://github.com/itsmaneka/amz-scraper/issues

