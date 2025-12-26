# From Many, as One - Reader Mini App

A Base Mini App for reading the serialized cyberpunk mythology *From Many, as One*, where divine guardians clash over competing philosophies of power and governance.

---

## Overview

This mini app provides an immersive reading experience for *From Many, as One* directly within the Base app. The reader features bilingual support (English/Spanish), blockchain-integrated book token minting, and permanent chapter archival through The Graph protocol.

**Intended Platform:** Base App (iOS/Android)  
**Not optimized for:** Desktop or mobile browsers

---

## Features

### Reading Experience
- **Bilingual Support:** Toggle between English and Spanish translations
- **Progress Tracking:** Automatic chapter read status with local storage
- **Cyberpunk UI:** Terminal-inspired interface with CRT scanlines and digital grid aesthetics
- **Three View Modes:**
  - Book Index: Browse available volumes
  - Chapter List: View chapters with read/unread status
  - Content View: Full chapter text with metadata

### Blockchain Integration
- **Book Token Minting:** Support the author by minting ERC-1155 book tokens (0.002 ETH)
- **Ownership Verification:** Real-time on-chain balance checking
- **Base Mainnet:** All transactions on Base L2
- **Smart Wallet Support:** Coinbase Smart Wallet integration via Wagmi

### Plexus Archive
- **Chapter Metadata:** View permanent archival records for each chapter
- **GraphQL Integration:** Query The Graph for on-chain content verification
- **Curator Notes:** Access archivist commentary and timestamps
- **Dual Timeline:** Earth time and Lanka (fictional) time tracking

---

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Inline styles (cyberpunk theme)
- **Icons:** Lucide React

### Web3 Integration
- **Wallet Connection:** Wagmi v2
- **Chain:** Base Mainnet
- **Connector:** Base app wallet
- **Contract Interaction:** Viem for encoding/parsing

### Data Layer
- **Content API:** Custom REST API at `lokapal.xyz/api`
- **Blockchain Data:** The Graph (GraphQL)
- **Local Storage:** Read progress tracking

---

## Configuration Files

### `wagmi.config.ts`
Configures Web3 connection for Base mainnet with Coinbase Smart Wallet:

```typescript
chains: [base]
connectors: [coinbaseWallet({ preference: 'smartWalletOnly' })]
```

### `minikit.config.ts`
Defines Mini App manifest for Base app integration:
- App metadata (name, description, icons)
- Account association for FID linking
- Category: Art & Creativity
- Tags: literature, governance, fiction

---

## Smart Contract

**Book Token Contract (Base Mainnet):**
- Address: `0x4FEb9Fbc359400d477761cD67d80cF0ce43dd84F`
- Standard: ERC-1155 (Multi-token)
- Function: `mintBook(uint256 bookId, uint256 amount)`
- Price: 0.002 ETH per book token

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Main reader component
│   ├── rootProvider.tsx     # Wagmi + React Query providers
│   ├── globals.css          # Global styles
│   └── api/
│       └── auth/
│           └── route.ts     # Authentication endpoint
├── public/
│   ├── icon.png             # App icon (512x512)
│   ├── splash.png           # Splash screen
│   └── hero.png             # Hero/OG image
├── wagmi.config.ts          # Web3 configuration
├── minikit.config.ts        # Mini app manifest
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

---

## API Endpoints

### Content API (`lokapal.xyz/api`)
- `GET /books/{bookId}?lang={en|es}` - Fetch chapter list
- `GET /books/{bookId}/chapters/{chapterId}?lang={en|es}` - Fetch chapter content

### The Graph (GraphQL)
- Endpoint: `api.studio.thegraph.com/query/121796/plexus-archive-sepolia/v0.0.1`
- Query: Plexus archive entries by chapter title

---

## State Management

### View Modes
- `books` - Book selection index
- `chapters` - Chapter list for selected book
- `content` - Full chapter reading view

### Progress Tracking
- Stored in `localStorage` as `fmao_read_chapters`
- Format: Set of strings `{lang}-{bookId}-{chapterId}`
- Persists across sessions

---

## User Flows

### Reading Flow
1. Select language (EN/ES)
2. Choose book from index
3. View chapter list with progress indicators
4. Read chapter content
5. Access Plexus Archive metadata

### Minting Flow
1. Connect Coinbase Smart Wallet
2. Navigate to chapter list
3. Click "Mint Book" button
4. Confirm transaction in wallet
5. Receive success confirmation
6. Ownership badge displays immediately

---

## Error Handling

### Network Requests
- 10-second timeout on all API calls
- Retry functionality for failed requests
- User-friendly error messages in both languages

### Transaction Errors
- Insufficient funds detection
- User rejection handling
- Transaction confirmation failures
- Automatic error dialog display

---

## Localization

Full bilingual support with translations for:
- UI elements and buttons
- Loading states
- Error messages
- Success confirmations
- Dialog content

Toggle language via header button - updates entire interface and refetches content.

---

## Performance Optimizations

- `useMemo` for read chapter calculations
- Conditional wallet balance queries
- Lazy dialog rendering
- Debounced scroll events
- Image optimization with Next.js Image component

---

## IPFS Integration

Book token images stored on IPFS:
- Gateway: `ipfs.io/ipfs/`
- CID: `bafybeiaouhewkf6j7qcfmjofrwc74gp23hni7pqvxbccnppnz5igbxb6tq`
- Format: `book-{number}.gif`

---

## About the Project

*From Many, as One* is a serialized political fantasy exploring distributed authority through divine governance. Four cosmic guardians must coordinate despite fundamental philosophical disagreements about power and control.

The story examines:
- Decentralized governance and coordination problems
- Power struggles between competing worldviews
- Political intrigue at cosmic scale
- Reader sentiment as canonical worldbuilding data

**Author:** Lokapal  
**Website:** [lokapal.xyz](https://lokapal.xyz)

---

## Security Disclaimer

This contract has **not been formally audited** by a third-party security firm. While the code has been thoroughly tested on Sepolia testnet and reviewed for common vulnerabilities, it may still contain bugs or security issues.

**Use at your own risk.** If you intend to deploy this contract with real assets or significant value:

- Consider getting a formal security audit from a reputable firm
- Deploy on testnet first and thoroughly test with your use case
- Have the contract reviewed by experienced Solidity developers
- Use conservative assumptions about potential vulnerabilities
- Consider implementing gradual rollout and monitoring strategies

The authors and contributors are not responsible for any losses or damages resulting from the use of this code.

---

## License

Code (mini app reader): MIT License
Story content: CC BY-NC-SA 4.0
Book token artwork: CC BY-NC-SA 4.0

---

**Built by lokapal.eth**