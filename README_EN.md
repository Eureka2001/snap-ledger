# SnapLedger

> Skip the details. See the difference.

## Introduction

SnapLedger is a **completely offline** personal financial recording tool with asset status inventory as its core logic. It completely abandons the logic of recording every bill in financial software, and instead uses "snapshots" as the core logic, taking user self-inventory and self-review content as the only input data for analysis within the user's recorded data.

## Core Features

- **Absolutely Offline** — No backend, no database required. As long as you have a browser, double-click `index.html` to use. Data is stored locally in the browser (IndexedDB)
- **Privacy First** — Data is encrypted (PBKDF2 + AES-GCM). If you forget your password, data cannot be recovered
- **Data Sovereignty** — Supports CSV/JSON import/export, giving you full control over personal data
- **Visual Analysis** — Multi-dimensional charts including asset trends, income/expense comparison, and asset composition

## How to Use

1. Double-click `index.html` to open in browser
2. Create a new ledger and set a password
3. Enter your first snapshot data (as baseline)
4. Periodically enter snapshots thereafter, the system automatically calculates changes

## Tech Stack

- Pure HTML + CSS + JavaScript
- IndexedDB local storage
- ECharts chart library (CDN)

## Data Security

- All data is encrypted and stored in browser IndexedDB
- Exported files are in plain text, please keep them safe
- Regular export and backup is recommended

## License

MIT License
