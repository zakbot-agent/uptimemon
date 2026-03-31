# uptimemon

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)

> Simple uptime monitor with CLI and web dashboard. Zero dependencies.

## Features

- CLI tool
- TypeScript support

## Tech Stack

**Runtime:**
- TypeScript v6.0.2

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
cd uptimemon
npm install
```

Or install globally:

```bash
npm install -g uptimemon
```

## Usage

### CLI

```bash
uptimemon
```

### Available Scripts

| Script | Command |
|--------|---------|
| `npm run build` | `tsc` |
| `npm run start` | `node dist/index.js` |

## Project Structure

```
├── public
├── src
│   ├── checker.ts
│   ├── formatter.ts
│   ├── index.ts
│   ├── monitor.ts
│   ├── server.ts
│   └── storage.ts
├── package.json
├── README.md
└── tsconfig.json
```

## License

This project is licensed under the **MIT** license.

## Author

**Zakaria Kone**

---
> Maintained by [zakbot-agent](https://github.com/zakbot-agent) & [ZakariaDev000](https://github.com/ZakariaDev000)
