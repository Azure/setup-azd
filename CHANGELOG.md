# Release History

## 2.4.0 (2026-08-05)

### Features Added

- [[566]](https://github.com/Azure/setup-azd/pull/566) Harden `azd` version installation. The `version` input is validated before use — accepted values are `latest`, `stable`, `daily`, or a semantic version such as `1.2.3`, `1.2.3-beta.1`, or `1.2.3+build.5` — and installer scripts are downloaded to an isolated temporary directory and invoked with explicit process arguments instead of a shell command line.

## 2.3.0 (2026-04-17)

### Breaking Changes

- [[467]](https://github.com/Azure/setup-azd/pull/467) Upgrade action runtime from Node.js 20 to Node.js 24 to address the Node.js 20 deprecation on GitHub Actions runners. Bump up GitHub Actions versions used in workflows (`actions/checkout@v6`, `actions/upload-artifact@v7`).

## 2.2.1 (2025-11-19)

### Other Changes

Bump up dependency versions. 

## 2.2.0 (2025-08-05)

### Other Changes

Bump up dependency versions. 

## 2.1.0 (2025-01-25)

### Features Added

- [[236]](https://github.com/Azure/setup-azd/pull/236) Use installation script to install azd.

## 2.0.0 (2024-12-18)

### Breaking Changes

- [[213]](https://github.com/Azure/setup-azd/pull/213) Migrate to new CDN endpoint.

## 1.0.0 (2024-03-27)

### Other Changes

- [[87]](https://github.com/Azure/setup-azd/pull/87) Upgrade to NodeJS 20 due to NodeJS 16 deprecation.

## 0.1.0 (2023-07-12)

Initial public release of the GitHub Action for the Azure Developer CLI.
