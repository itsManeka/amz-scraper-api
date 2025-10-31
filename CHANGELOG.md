# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.6.1](https://github.com/itsManeka/amz-scraper-api/compare/v1.6.0...v1.6.1) (2025-10-31)


### Bug Fixes

* rise subcategory timeout and fix discount info parse element ([afda3ce](https://github.com/itsManeka/amz-scraper-api/commit/afda3ceb2c98cf1eddd15d4baae0e77219eeab35))

## [1.6.0](https://github.com/itsManeka/amz-scraper-api/compare/v1.5.5...v1.6.0) (2025-10-30)


### Features

* refactoring to improve usability ([c225a10](https://github.com/itsManeka/amz-scraper-api/commit/c225a10b20428e962c9933a85615d37229442e49))

## [1.5.5](https://github.com/itsManeka/amz-scraper-api/compare/v1.5.4...v1.5.5) (2025-10-29)


### Bug Fixes

* reduce more memory leak, improve the show more button usage and resume scraping after restart. ([d315617](https://github.com/itsManeka/amz-scraper-api/commit/d315617bb8ca30d8e8d3b6f2050595213f467dff))

## [1.5.4](https://github.com/itsManeka/amz-scraper-api/compare/v1.5.3...v1.5.4) (2025-10-29)


### Bug Fixes

* fix lint errors ([ecce0b8](https://github.com/itsManeka/amz-scraper-api/commit/ecce0b89520a9de6a95db189a9a181a27871bfb8))
* resolve Puppeteer memory leak with double GC and fix keepalive logic ([f88750a](https://github.com/itsManeka/amz-scraper-api/commit/f88750a95826000a12aa9ce01ac5b3b6225f348f))
* test coverage ([365fec1](https://github.com/itsManeka/amz-scraper-api/commit/365fec15d562118c0bf923c9f2a45e9d960745e8))

## [1.5.3](https://github.com/itsManeka/amz-scraper-api/compare/v1.5.2...v1.5.3) (2025-10-29)


### Bug Fixes

* apply more memory logs and change keepalive activation to the parentjobs ([6c6271e](https://github.com/itsManeka/amz-scraper-api/commit/6c6271e18700806cee6564407093385e32268c54))

## [1.5.2](https://github.com/itsManeka/amz-scraper-api/compare/v1.5.1...v1.5.2) (2025-10-29)


### Bug Fixes

* reduce default maxClicks to 5 and fix subcategroy filter errors ([d55c9f7](https://github.com/itsManeka/amz-scraper-api/commit/d55c9f7f8056454e089bf3b909fc9298ec9ea966))

## [1.5.1](https://github.com/itsManeka/amz-scraper-api/compare/v1.5.0...v1.5.1) (2025-10-29)


### Bug Fixes

* resolve memory issues with race condition and lazy job creation ([b6a7f96](https://github.com/itsManeka/amz-scraper-api/commit/b6a7f9658aa0cedd5de79e0b5a28c71c41398df1))

## [1.5.0](https://github.com/itsManeka/amz-scraper-api/compare/v1.4.3...v1.5.0) (2025-10-29)


### Features

* memory monitor ([5bea485](https://github.com/itsManeka/amz-scraper-api/commit/5bea485103a60fef8413ff7d94a302e5c0c0ca4d))

## [1.4.3](https://github.com/itsManeka/amz-scraper-api/compare/v1.4.2...v1.4.3) (2025-10-29)


### Bug Fixes

* improve pg connection timeout ([71f50c2](https://github.com/itsManeka/amz-scraper-api/commit/71f50c2b0c212a95791cbcd06a80e995aa5283d1))

## [1.4.2](https://github.com/itsManeka/amz-scraper-api/compare/v1.4.1...v1.4.2) (2025-10-29)


### Bug Fixes

* force garbage collection after browser close to prevent OOM ([c9be525](https://github.com/itsManeka/amz-scraper-api/commit/c9be52505d6becd465819c0b5e15d71988806a2f))

## [1.4.1](https://github.com/itsManeka/amz-scraper-api/compare/v1.4.0...v1.4.1) (2025-10-29)


### Bug Fixes

* resolve puppeteer frame detached error with retry mechanism ([96a40ce](https://github.com/itsManeka/amz-scraper-api/commit/96a40ce6d6ce436f3c8a1144cececbe639ecca61))

## [1.4.0](https://github.com/itsManeka/amz-scraper-api/compare/v1.3.0...v1.4.0) (2025-10-29)


### Features

* keep alive with uptimerobot and improve memory performance of browser ([5f92b86](https://github.com/itsManeka/amz-scraper-api/commit/5f92b8647d822dda3f78889e39121dfda1177cd3))
* migrate storage to Neon PostgreSQL for data persistence ([d62bcaa](https://github.com/itsManeka/amz-scraper-api/commit/d62bcaa8fc2d6fb9e1506ba0fc175e63b3fdead6))

## [1.3.0](https://github.com/itsManeka/amz-scraper-api/compare/v1.2.0...v1.3.0) (2025-10-28)


### Features

* multjob subcategory scrape ([411090d](https://github.com/itsManeka/amz-scraper-api/commit/411090db16b4b6f0943aba58cb5156f31ed237ea))


### Bug Fixes

* improve logs for product batch ([da97a86](https://github.com/itsManeka/amz-scraper-api/commit/da97a860165657b11a8b69d2bba87f7e16a28a9c))
* reduce coverage threshold to 70% to avoid integration tests with puppeteer ([4acdb71](https://github.com/itsManeka/amz-scraper-api/commit/4acdb71734ae7526b4572159b4f49011e6a9957a))

## [1.2.0](https://github.com/itsManeka/amz-scraper-api/compare/v1.1.2...v1.2.0) (2025-10-27)


### Features

* authentication ([251bcb8](https://github.com/itsManeka/amz-scraper-api/commit/251bcb891bb8319e26b814470785b729e0f686ef))
* maxclicks paramater to control memory in puppeteer ([8b8a795](https://github.com/itsManeka/amz-scraper-api/commit/8b8a795ab86a1abcccb6e81e158c7e78755558c2))


### Documentation

* att api ([f8999bb](https://github.com/itsManeka/amz-scraper-api/commit/f8999bb0c8e56b3aa2024a463787bb8e8b999fc1))

## [1.1.2](https://github.com/itsManeka/amz-scraper-api/compare/v1.1.1...v1.1.2) (2025-10-27)


### Bug Fixes

* fix browser tests to use fake timers and rewrite show more button logic ([b0f00ba](https://github.com/itsManeka/amz-scraper-api/commit/b0f00ba89806f17aca7d379ab255341bed434917))
* show more button handlers ([c2e12f0](https://github.com/itsManeka/amz-scraper-api/commit/c2e12f092c5bf642976ea0aa5920ca6e6024c2f3))

## [1.1.1](https://github.com/itsManeka/amz-scraper-api/compare/v1.1.0...v1.1.1) (2025-10-26)


### Bug Fixes

* add retry support, fiz asin validation and error requests validation ([8380c64](https://github.com/itsManeka/amz-scraper-api/commit/8380c64f718fbf6439358f06ab0aec7073f8ca51))
* wait new products after click "show more" button ([0dbb209](https://github.com/itsManeka/amz-scraper-api/commit/0dbb20985297b30b299955aa6f209f4ffe231792))

## [1.1.0](https://github.com/itsManeka/amz-scraper-api/compare/v1.0.3...v1.1.0) (2025-10-26)


### Features

* implement filtering options and job management ([4d4e46c](https://github.com/itsManeka/amz-scraper-api/commit/4d4e46cfd3b2c5d12447ae53cdc7d0094108fe6c))


### Bug Fixes

* lint errors ([ff66173](https://github.com/itsManeka/amz-scraper-api/commit/ff66173846e0854fcb62f1f239ac7746a2af1f8e))

## [1.0.3](https://github.com/itsManeka/amz-scraper-api/compare/v1.0.2...v1.0.3) (2025-10-26)


### Bug Fixes

* use correct secret name for Render deployment ([b43e3ed](https://github.com/itsManeka/amz-scraper-api/commit/b43e3edc250f9f7e3dc4756a8252158feae2df0b))

## [1.0.2](https://github.com/itsManeka/amz-scraper-api/compare/v1.0.1...v1.0.2) (2025-10-26)


### Bug Fixes

* capture semantic-release outputs to trigger deploy correctly ([a45a40c](https://github.com/itsManeka/amz-scraper-api/commit/a45a40c6fccf31c32ff943ab9b73be77108ff83b))

## [1.0.1](https://github.com/itsManeka/amz-scraper-api/compare/v1.0.0...v1.0.1) (2025-10-26)


### Bug Fixes

* remove unnecessary distribution assets from GitHub releases and add deploy debug ([9b1f327](https://github.com/itsManeka/amz-scraper-api/commit/9b1f327ecbf29bb4fa0f1b21cd12124128b5bc5c))


### Documentation

* remove legacy changelog texts ([b76a601](https://github.com/itsManeka/amz-scraper-api/commit/b76a6012e71acb806aeac8e45c0e1ea996058566))

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
