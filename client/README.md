# Campus Marketplace — Client

This is the React frontend for Campus Marketplace, a college buy/sell platform.

For full project documentation, see the [root README](../README.md).
For Firebase setup and deployment, see [SETUP.md](../SETUP.md).

---

## Stack

- React 19 + TypeScript
- Vite 7
- Firebase SDK v12 (Firestore + Storage)
- canvas-confetti

---

## Scripts

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

---

## Source Structure

```
src/
├── main.tsx                   # React entry point
├── App.tsx                    # Auth screen (localStorage-based login/register)
├── Auth.tsx                   # Unused — Firebase Auth + Google OAuth implementation
├── Dashboard.tsx              # Main layout: left sidebar, top bar, page router
├── firebase.ts                # Firebase app init and SDK exports (db, storage, auth)
├── cleanupInterests.ts        # Admin utilities: delete duplicate products / all interests
├── index.css                  # Global base styles
├── App.css                    # Auth screen styles
├── Auth.css                   # (shared with App.tsx)
├── Dashboard.css              # All dashboard/component styles
├── context/
│   └── AppContext.tsx         # Global state provider — products, user, Firestore sync
└── components/
    ├── SellPage.tsx            # Photo upload + product form → Firestore
    ├── BuyPage.tsx             # Product grid, search/filter, express interest
    ├── MessagesPage.tsx        # Real-time chat, Agree to Sell/Buy flow
    ├── RequestsPage.tsx        # Seller: view interested buyers. Buyer: view own requests
    ├── HistoryPage.tsx         # Selling tab (active). Sold/Bought tabs are stubs.
    ├── ProfilePage.tsx         # Edit name + photo. Admin cleanup tools.
    └── NotificationsDropdown.tsx  # Stub — always shows "No notifications"
```

---

## Key Implementation Notes

### Authentication
Login and registration are handled in `App.tsx` using `localStorage`. User credentials (name, email, password) are saved as JSON in the browser. "Remember me" stores the logged-in session across restarts. No server-side auth is involved.

`Auth.tsx` contains a complete Firebase Auth implementation with Google OAuth — it exists but is **not used**. It can replace `App.tsx` in the future.

### Data Flow
`AppContext.tsx` sets up a real-time Firestore listener on the `products` collection and exposes `addProduct`, `updateProduct`, and `deleteProduct` to all pages. All components consume this context via `useApp()`.

Interests and messages are fetched directly inside each component using Firestore `onSnapshot` listeners.

### Messaging
Conversations are identified by: `[buyerId, sellerId, productId].sort().join('_')`. When a buyer clicks "Interested to Buy", an interest document is created in Firestore and an automatic "Interested to buy" message is sent to start the conversation.

### Sale Completion
Handled in `MessagesPage.tsx`. Both buyer and seller click "Agree to Sell/Buy". When both `buyerAgreed` and `sellerAgreed` are `true` on the interest document, the product is marked `sold: true` and all other interests for that product are marked sold too.

### What's a Stub
- `NotificationsDropdown.tsx` — hardcoded "No notifications"
- `HistoryPage.tsx` Sold and Bought tabs — hardcoded empty, never populated
- `RequestsPage.tsx` "Sell to you" and "Bought by" buttons — rendered with no click handlers
