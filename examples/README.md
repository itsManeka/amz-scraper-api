# Examples

This directory contains usage examples for the `amz-scraper` package.

## Running Examples

First, build the project:

```bash
npm run build
```

Then run any example:

```bash
# Basic usage
npx ts-node examples/basic-usage.ts

# With proxy
npx ts-node examples/with-proxy.ts

# Error handling
npx ts-node examples/error-handling.ts
```

## Available Examples

### basic-usage.ts
Demonstrates the basic workflow:
- Creating a scraper instance
- Fetching product information
- Checking for promotional codes
- Converting to JSON

### with-proxy.ts
Shows how to configure and use a proxy server for requests.

### error-handling.ts
Comprehensive example of handling different error types:
- ProductNotFoundError
- HttpError
- ParsingError
- ScraperError

## Notes

- The examples use the ASIN `6589737258` (Reckless Volume 1) which has a sample HTML page in this directory
- You can replace the ASIN with any valid Amazon Brazil product ASIN
- Make sure you have proper network access to Amazon Brazil
- Respect Amazon's Terms of Service and rate limits when using this scraper

