# Amazon Scraper API

> This API is currently under development

> REST API for extracting product information and promotional codes from Amazon Brazil (amazon.com.br)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.8.1-brightgreen)](https://nodejs.org)
[![Build Status](https://github.com/itsManeka/amz-scraper-api/workflows/Build%2C%20Test%20%26%20Publish/badge.svg)](https://github.com/itsManeka/amz-scraper-api/actions)
[![codecov](https://codecov.io/gh/itsManeka/amz-scraper-api/graph/badge.svg?token=MAYE29G36S)](https://codecov.io/gh/itsManeka/amz-scraper-api)
[![GitHub release](https://img.shields.io/github/v/release/itsManeka/amz-scraper-api)](https://github.com/itsManeka/amz-scraper-api/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Product Verification**: Extract promotional codes from product pages using Cheerio + Axios
- ✅ **Promotion Scraping**: Full promotion page scraping with Puppeteer (headless browser)
- ✅ **Multi-Job Pattern**: Automatically creates child jobs for each subcategory to prevent memory issues
- ✅ **Job Persistence**: All jobs persisted to PostgreSQL for recovery after server restarts
- ✅ **Manual Cleanup**: Endpoint to clean up all child jobs while preserving parent job as "already scraped" flag
- ✅ **API Key Authentication**: Secure your API with configurable API keys
- ✅ **Category/Subcategory Filtering**: Apply Amazon's native filters to narrow results
- ✅ **Auto "Show More" Clicking**: Automatically loads all products by clicking pagination buttons
- ✅ **User-Agent Rotation**: Avoid detection with rotating user agents and headers
- ✅ **Automatic Retries**: Exponential backoff for 5xx errors and network failures
- ✅ **Async Job Management**: Long-running tasks handled as background jobs
- ✅ **Caching**: Reduce scraping frequency with intelligent caching
- ✅ **Clean Architecture**: Maintainable, testable, SOLID principles
- ✅ **Zero External Costs**: No paid databases or Redis required
- ✅ **CI/CD Pipeline**: Automated testing, versioning, and deployment

## Architecture

Built with **Clean Architecture** principles:

- **Domain Layer**: Pure business logic (Product, Promotion, Job entities)
- **Application Layer**: Use cases orchestrating domain logic
- **Infrastructure Layer**: External concerns (HTTP, storage, cache, jobs, browser)
- **Presentation Layer**: REST API with Express.js

## Quick Start

### Prerequisites

- Node.js >= 20.8.1
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/itsmaneka/amz-scraper.git
cd amz-scraper

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Build the project
npm run build

# Start the server
npm start
```

The API will be available at `http://localhost:3000`

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Product Verification
```
GET /api/products/:asin
```

### Promotion Scraping
```
POST   /api/promotions/scrape
GET    /api/promotions/jobs/:jobId
GET    /api/promotions/jobs/by-promotion/:promotionId
DELETE /api/promotions/jobs/by-promotion/:promotionId/cleanup
GET    /api/promotions/:promotionId
```

See [API Documentation](docs/API.md) for detailed endpoint specifications.

## Usage Examples

### 1. Verify Product and Get Promo Code

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/products/B08N5WRWNW
```

**Response:**
```json
{
  "product": {
    "asin": "B08N5WRWNW",
    "promoCode": {
      "name": "HALLOWEEN20",
      "url": "https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX"
    }
  },
  "promotionJob": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending"
  }
}
```

### 2. Start Promotion Scraping with Filters

```bash
curl -X POST http://localhost:3000/api/promotions/scrape \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "promotionId": "A2P3X1AN29HWHX",
    "category": "Livros",
    "subcategory": "Mangá HQs, Mangás e Graphic Novels"
  }'
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Promotion scraping job created successfully"
}
```

### 3. Check Job Status

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/promotions/jobs/550e8400-e29b-41d4-a716-446655440000
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
      "discountValue": 20,
      "discountType": "percentage",
      "startDate": "2025-10-24T09:00:00-03:00",
      "endDate": "2025-10-31T23:59:59-03:00",
      "asins": ["B08N5WRWNW", "..."]
    }
  }
}
```

## Configuration

Configure the API using environment variables:

```bash
# Server
PORT=3000
NODE_ENV=production

# Authentication (REQUIRED for production)
# Comma-separated list of API keys
# Generate secure keys: openssl rand -base64 32
API_KEYS=your-secure-api-key-here,another-optional-key

# Database (REQUIRED)
# PostgreSQL connection string from Neon or other provider
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Cache (TTL in minutes)
CACHE_TTL_MINUTES=30

# Jobs
JOB_TIMEOUT_MINUTES=10
MAX_CONCURRENT_JOBS=2
```

### Authentication

All endpoints except `/api/health` and `/` require authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/products/B08N5WRWNW
```

**Generating Secure API Keys:**

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use any password generator with minimum 32 characters
```

**Multiple API Keys:**

You can configure multiple API keys (e.g., for different clients or environments):

```bash
API_KEYS=key_for_client_1,key_for_client_2,key_for_backup
```

## Deployment to Render.com

1. **Create a new Web Service** on [Render.com](https://render.com)

2. **Connect your GitHub repository**

3. **Configure build settings:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **Add environment variables:**
   ```
   PORT=3000
   NODE_ENV=production
   API_KEYS=your-secure-api-key-here
   DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
   CACHE_TTL_MINUTES=30
   JOB_TIMEOUT_MINUTES=10
   MAX_CONCURRENT_JOBS=2
   ```
   
   **Important**: 
   - Generate a secure API key:
     ```bash
     openssl rand -base64 32
     ```
     Or use Render's "Generate" button when adding the `API_KEYS` environment variable.
   - Get your `DATABASE_URL` from [Neon Console](https://console.neon.tech/) (see Database Setup below)

5. **Setup PostgreSQL Database with Neon:**
   - Create a free account at [Neon](https://neon.tech/)
   - Create a new project
   - Copy the connection string (it looks like `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
   - Add it as `DATABASE_URL` environment variable in Render dashboard
   - The application will automatically create the required tables on first run

6. **Deploy!** The service will automatically deploy on push to main branch

Alternatively, use the included `render.yaml` for automatic configuration (don't forget to add `API_KEYS` in Render dashboard).

### Testing Your Deployment

Once deployed, test your API with:

```bash
# Health check (no authentication required)
curl https://your-app.onrender.com/api/health

# Product endpoint (requires authentication)
curl -H "X-API-Key: your-api-key" \
  https://your-app.onrender.com/api/products/B08N5WRWNW
```

## Project Structure

```
amazon-scraper/
├── src/
│   ├── api/                    # Express API layer
│   │   ├── controllers/        # Request handlers
│   │   ├── middlewares/        # Error handling, validation
│   │   ├── routes/             # Route definitions
│   │   ├── app.ts              # Express app configuration
│   │   └── server.ts           # Server entry point
│   ├── application/            # Use cases
│   │   └── use-cases/          # Business logic orchestration
│   ├── domain/                 # Domain entities
│   │   ├── entities/           # Core business entities
│   │   └── repositories/       # Repository interfaces
│   ├── infrastructure/         # External concerns
│   │   ├── browser/            # Browser configuration & rotation
│   │   ├── cache/              # Caching implementation
│   │   ├── errors/             # Custom error classes
│   │   ├── http/               # HTTP client
│   │   ├── jobs/               # Job management
│   │   ├── parsers/            # HTML parsers
│   │   ├── repositories/       # Repository implementations
│   │   └── storage/            # File-based storage
│   └── __tests__/              # Test files
├── docs/                       # Documentation
├── .env.example                # Environment variables template
├── render.yaml                 # Render.com configuration
└── package.json                # Project dependencies
```

## How It Works

### 1. Product Verification (Fast)
- Uses Axios + Cheerio for lightweight HTML parsing
- Extracts promo code from product page
- If promo code has promotion URL, triggers background job

### 2. Promotion Scraping (Async)
- Launches headless Chrome with Puppeteer
- Applies category/subcategory filters
- Clicks "Show More" button repeatedly (up to 20 times)
- Scrolls to trigger lazy loading
- Extracts all product ASINs
- Uses user-agent rotation to avoid detection

### 3. Job Management
- Jobs run asynchronously in background
- Maximum 2 concurrent jobs (configurable)
- Job status persisted to disk
- Automatic cleanup of old completed jobs

### 4. Caching Strategy
- In-memory cache with file-based backup
- Default TTL: 30 minutes
- Reduces scraping frequency
- Survives server restarts

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration and deployment:

### Automated Workflow

- ✅ **Pull Requests**: Runs tests and coverage checks on every PR
- ✅ **Main Branch**: Full pipeline on merge to main
  - Runs all tests with 70% minimum coverage requirement
  - Automatically versions releases using [Semantic Versioning](https://semver.org/)
  - Generates CHANGELOG.md automatically
  - Creates GitHub releases with release notes
  - Deploys to Render.com automatically

### Conventional Commits

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
feat: add new feature        # Minor release (1.0.0 → 1.1.0)
fix: bug correction          # Patch release (1.1.0 → 1.1.1)
feat!: breaking change       # Major release (1.1.1 → 2.0.0)
```

### Deployment

Deployment to Render.com happens automatically when:
1. All tests pass (100%)
2. Coverage is >= 70%
3. Commits follow Conventional Commits format
4. Changes are merged to `main` branch

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed CI/CD documentation.

## Browser Fingerprinting Strategies

To avoid detection, the API implements:

1. **User-Agent Rotation**: Rotates between 6 modern browser user agents
2. **Randomized Viewports**: 1920x1080, 1366x768, 1440x900, 1536x864
3. **Accept-Language Headers**: Brazilian Portuguese variants
4. **Referer Headers**: Mimics navigation from Amazon homepage
5. **Navigator Properties**: Platform matches user agent

## Limitations & Considerations

- **Rate Limiting**: Be respectful to Amazon's servers
- **CAPTCHA**: May encounter CAPTCHAs with excessive requests
- **Page Structure Changes**: Amazon may change HTML structure
- **Educational Purpose**: This project is for educational/research purposes only
- **Terms of Service**: Review Amazon's ToS before using in production

## Troubleshooting

### Puppeteer Issues on Render.com

If Puppeteer fails to launch:
- Ensure `--no-sandbox` flag is present (already configured)
- Check Render logs for Chrome/Chromium errors
- Verify disk space is available

### Job Timeout

If jobs are timing out:
- Increase `JOB_TIMEOUT_MINUTES` environment variable
- Reduce concurrent jobs with `MAX_CONCURRENT_JOBS`
- Check if promotion page is loading slowly

### Storage Issues

If storage errors occur:
- Verify `STORAGE_PATH` directory exists and is writable
- Check disk space on Render.com
- Ensure persistent disk is properly mounted

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow existing code style (run `npm run lint:fix`)
4. Add tests for new features (maintain >= 70% coverage)
5. Ensure all tests pass (`npm test`)
6. Use Conventional Commits format for commit messages
7. Push to your fork and open a Pull Request

**Important**: All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format for automatic versioning.

See [Deployment Guide](docs/DEPLOYMENT.md) for CI/CD details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is for educational and research purposes only. Users are responsible for complying with Amazon's Terms of Service and robots.txt. The authors are not responsible for any misuse of this software.

## Support

- 📝 [API Documentation](docs/API.md)
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md)
- 🐛 [Issue Tracker](https://github.com/itsmaneka/amz-scraper-api/issues)
- 💬 [Discussions](https://github.com/itsmaneka/amz-scraper-api/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.


## 👨‍💻 Author

**Emanuel Ozorio Dias**
- GitHub: [@itsManeka](https://github.com/itsManeka)
- Email: [emanuel.ozoriodias@gmail.com](mailto:emanuel.ozoriodias@gmail.com)

---
