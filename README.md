![LedgerLensy Logo](LedgerLensyLogo.png)

# LedgerLensy

**An elegant, bookkeeping-style explorer for the XRP Ledger.**

[Key Features](#key-features) • [Getting Started](#getting-started) • [Tech Stack](#tech-stack) • [Live website](https://ledgerlensy.com)

---

## What is LedgerLensy?

LedgerLensy is a web application designed for clarity and precision in viewing XRP Ledger (XRPL) transactions. Unlike traditional explorers that can be cluttered and technical, LedgerLensy presents account activity in a familiar bookkeeping format with clear **debit and credit entries**, making it ideal for both casual users and professionals who need to reconcile transactions.

## Key Features

-   🔍 **Advanced Account Lookup**: Enter any XRP address to get an immediate summary of its current balances in XRP and USD (via live CoinGecko prices).
-   📖 **Bookkeeping Format**: View transaction history with clear highlights on what entered and left the account, including fee breakdowns.
-   🚀 **Infinite Scroll**: Seamlessly browse through thousands of transactions with automatic lazy loading.
-   🛠️ **Powerful Filtering**:
    -   **Transaction Type**: Payment, OfferCreate, TrustSet, and more.
    -   **Status**: Quickly find failed or successful transactions.
    -   **Date Range**: presets for Today, This Week, Last Month, or custom date pickers.
    -   **Currency**: Filter by specific tokens (e.g., RLUSD, USD).
-   🕵️ **Fund Tracing**: Innovative "Trace Funds" feature that follows payment origins step-by-step to understand the flow of capital.
-   🏷️ **Smart Labeling**: Dynamic integration with **XRPScan well-known names API**, providing verified labels for over 1,800+ exchanges and services (Binance, Bitstamp, etc.).
-   🌓 **UI/UX**: Dark and Light modes with a modern glassmorphism aesthetic, responsive design, and smooth animations.
-   🌎 **Multi-language**: Fully localized in **English** and **Spanish**.

## Tech Stack

-   **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **XRPL Interaction**: [xrpl.js](https://js.xrpl.org/) (via WebSocket connection with fallback servers)
-   **Price Data**: [CoinGecko API](https://www.coingecko.com/en/api)

## Getting Started

Follow these steps to run LedgerLensy on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   npm, yarn, or pnpm

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/guico/LedgerLensy.git
    cd LedgerLensy
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

### Building for Production

To create an optimized production build:
```bash
npm run build
```
The output will be in the `dist` folder.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Notice

This project provides off-ledger metadata such as address labels sourced from third-party services (e.g., XRPScan). Labels are informational only and may be inaccurate or outdated. LedgerLensy is not affiliated with Ripple, XRPL Labs, or any exchange.

---

Copyright (c) 2026 GuiCo. Built with ❤️ and AI assistance for the XRP Community.
