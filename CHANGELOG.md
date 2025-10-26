# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.0 (2025-10-26)


### Bug Fixes

* add conventional-changelog-conventionalcommits dependency for semantic-release ([e091cce](https://github.com/itsManeka/amz-scraper-api/commit/e091cce5178f065ff43957e64d5cf2968be9566d))
* configure Puppeteer Chrome for Render deployment ([9cdeb17](https://github.com/itsManeka/amz-scraper-api/commit/9cdeb17c4cc886a29b9ec1db50ea96d61a3ecf34))
* puppeteer error ([1e95cea](https://github.com/itsManeka/amz-scraper-api/commit/1e95ceacf00f74d8f96ab0179f211827bedf83ec))
* update repository URL to correct GitHub repository ([c8e175d](https://github.com/itsManeka/amz-scraper-api/commit/c8e175da0453565f9fc6829ff75701d9ff42932c))


### Documentation

* update docs to the new features ([418d4be](https://github.com/itsManeka/amz-scraper-api/commit/418d4bea94b046f73dd88cfb8978ce9343c26fa9))


### Tests

* coverage tests ([71422ca](https://github.com/itsManeka/amz-scraper-api/commit/71422ca530eb2578949f09833f4d6be34fa18876))


### CI/CD

* create build workflow ([aaf4d31](https://github.com/itsManeka/amz-scraper-api/commit/aaf4d31063d54012e71a6dc8cf7451b070ab95b4))
* fix lint errors ([bd5062a](https://github.com/itsManeka/amz-scraper-api/commit/bd5062a5348fcaa5809cd4360397ed2039583863))
* fix package-lock sync ([7b98dfc](https://github.com/itsManeka/amz-scraper-api/commit/7b98dfc1ed130b1140bb4fd4d39a07924d655689))
* fix tests ([28ef9bc](https://github.com/itsManeka/amz-scraper-api/commit/28ef9bce7950792fc4477bf401cbca222682cfd6))
* fix timezone tests errors ([a661b0c](https://github.com/itsManeka/amz-scraper-api/commit/a661b0c9ffa4a0a3256f49ddc1ab3ae7ba565eb1))
* implement GitHub Actions CI/CD with Node.js 20 ([6da558d](https://github.com/itsManeka/amz-scraper-api/commit/6da558d5734f184ba621429ae735bca25187b38c))

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
