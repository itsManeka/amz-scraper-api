# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-25

### Added - Initial API Release

#### Core Features
- **REST API** built with Express.js for Amazon Brazil product and promotion scraping
- **Product Verification Endpoint** (`GET /api/products/:asin`) with Cheerio + Axios for fast promo code extraction
- **Promotion Scraping Endpoint** (`POST /api/promotions/scrape`) with Puppeteer for full page scraping
- **Job Status Endpoint** (`GET /api/promotions/jobs/:jobId`) for tracking async scraping tasks
- **Cached Promotion Endpoint** (`GET /api/promotions/:promotionId`) for quick access to previously scraped data
- **Health Check Endpoint** (`GET /api/health`) with job statistics

#### Advanced Scraping Features
- **Category and Subcategory Filtering**: Apply Amazon's native filters to narrow down promotion products
- **Automatic "Show More" Button Clicking**: Clicks up to 20 times to load all products
- **Lazy Loading Support**: Scrolls page to trigger dynamic product loading
- **User-Agent Rotation**: 6 modern browser user agents to avoid detection
- **Randomized Viewports**: Multiple viewport sizes (1920x1080, 1366x768, 1440x900, 1536x864)
- **Header Rotation**: Accept-Language, Referer, and other headers randomized

#### Infrastructure
- **JSON File-Based Storage**: NoSQL-like storage for jobs and cache backup
- **Hybrid Caching**: In-memory cache (node-cache) with file-based persistence
- **Job Management System**: Async job queue with status tracking and persistence
- **Browser Configuration**: Optimized Puppeteer settings for Render.com deployment

#### Architecture
- **Clean Architecture**: Separation of concerns with Domain, Application, Infrastructure, and Presentation layers
- **SOLID Principles**: Maintainable and testable codebase
- **Dependency Injection**: Proper inversion of control throughout the application
- **Custom Error Handling**: Specific error classes (HttpError, ParsingError, ProductNotFoundError, etc.)

#### Developer Experience
- **TypeScript**: Full type safety with strict mode
- **Comprehensive Testing**: Unit and integration tests with Jest
- **Code Quality**: ESLint + Prettier configuration
- **Environment Configuration**: .env support with sensible defaults
- **Complete Documentation**: README, API docs, and code comments

#### Deployment
- **Render.com Configuration**: Pre-configured render.yaml for zero-cost hosting
- **Persistent Storage**: Disk-based storage survives server restarts
- **Auto-Recovery**: Jobs persisted and restored on restart
- **Production Ready**: Optimized for cloud deployment

### Technical Details

**Dependencies:**
- express: ^4.18.2
- puppeteer: ^22.15.0
- cheerio: ^1.0.0-rc.12
- axios: ^1.6.0
- node-cache: ^5.1.2
- uuid: ^9.0.0
- dotenv: ^16.0.3

**Requirements:**
- Node.js >= 18.0.0
- 1GB disk space for persistent storage (Render.com free tier)

**Configuration Options:**
- `PORT`: Server port (default: 3000)
- `STORAGE_PATH`: Data storage directory (default: ./data)
- `CACHE_TTL_MINUTES`: Cache time-to-live (default: 30)
- `JOB_TIMEOUT_MINUTES`: Job timeout (default: 10)
- `MAX_CONCURRENT_JOBS`: Maximum concurrent jobs (default: 2)

### Documentation
- Complete API documentation in `docs/API.md`
- Comprehensive README with examples
- JSDoc comments for all public APIs
- Architecture documentation

### Testing
- Unit tests for domain entities
- Integration tests for use cases
- Repository tests with mocked dependencies
- 80%+ code coverage

---

## Future Plans

### Planned for v1.1.0
- Webhook support for job completion notifications
- Prometheus metrics endpoint
- Request rate limiting
- API authentication with API keys

### Planned for v1.2.0
- Product price extraction
- Product image URL extraction
- Bulk product verification endpoint
- Promotion comparison endpoint

### Planned for v2.0.0
- Support for other Amazon marketplaces (.com, .co.uk, etc.)
- GraphQL API
- WebSocket support for real-time job updates
- Advanced analytics dashboard

---

## Migration Guide

This is the first release of the API version. Previous versions were NPM packages and are not compatible with this release.

If migrating from the NPM package version:
1. The core scraping logic remains the same
2. Replace direct function calls with HTTP API calls
3. Update to async job-based workflow for promotions
4. Use environment variables for configuration

---

[1.0.0]: https://github.com/itsmaneka/amz-scraper-api/releases/tag/v1.0.0

