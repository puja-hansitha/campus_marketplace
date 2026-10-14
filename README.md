# Campus Marketplace

A college marketplace website where students can buy and sell products within their campus community.

Live site: https://campusmart-489520.web.app

---

## Features

### Implemented and working
- 🔐 **Authentication** — Register and login with name, email, and password. "Remember me" persists session across browser restarts.
- 📦 **Sell Products** — Upload a photo (jpg/png/webp, max 5MB), write a description, choose a category, and set a price. Products are stored in Firebase Firestore and visible to other users in real time.
- 🛒 **Buy Products** — Browse all listings with a search bar and category filter. Your own listings are hidden from your buy view. Sold products are hidden automatically.
- 🤝 **Express Interest** — Click "Interested to Buy" on any product. An automatic opening message is sent to the seller and a conversation is created. You can withdraw your interest before the seller responds.
- 💬 **Messaging** — Real-time chat between buyer and seller, organized per product. Only available after a buyer expresses interest. Both parties can click "Agree to Sell/Buy" inside the chat; when both agree, the product is marked as sold.
- 📋 **Requests Page** — Sellers see a list of interested buyers grouped by product. Buyers see the products they have shown interest in.
- 📊 **History → Selling** — View all your active listings with an interested buyer count. Edit description, price, and category. Delete listings (with a confirmation prompt).
- 👤 **Profile** — Edit your display name and profile photo (stored in browser session).

### Partially implemented / stubs
- 🔔 **Notifications** — The bell icon and dropdown UI exist but always show "No notifications". No notification logic is wired up.
- 📊 **History → Sold / Bought tabs** — The tabs exist in the UI but always show empty. The data model supports sold status but the history pages do not yet read it.
- 📋 **Requests → "Sell to you" / "Bought by" buttons** — Rendered in the UI but have no click handlers attached. These actions are currently handled through the "Agree" mechanism in Messages instead.

### Not yet implemented (planned)
- Edit lock on price/category after buyers show interest
- Notification on interest withdrawal or listing deletion
- Confirmation/dispute flow with 48-hour auto-confirm
- Message auto-delete 3 days after sale
- Unread message count badges
- Google OAuth login
- User ratings and reputation
- Admin moderation panel

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| Database | Firebase Firestore (real-time) |
| File storage | Firebase Storage |
| Authentication | localStorage (email + password stored client-side) |
| Hosting | Firebase Hosting |
| Deployment config | Vercel (`vercel.json` also present) |
| Animations | canvas-confetti |

> Note: `Auth.tsx` in the source contains a full Firebase Auth + Google OAuth implementation but is not currently used. `App.tsx` handles auth via localStorage instead.

---

## Project Structure

```
campus_market_place/
├── client/                    # React app (all source code lives here)
│   ├── src/
│   │   ├── App.tsx            # Entry point — auth logic (localStorage)
│   │   ├── Auth.tsx           # Unused Firebase Auth implementation
│   │   ├── Dashboard.tsx      # Main layout: sidebar, top bar, page router
│   │   ├── firebase.ts        # Firebase config and SDK exports
│   │   ├── cleanupInterests.ts # Admin utility: clear Firestore data
│   │   ├── context/
│   │   │   └── AppContext.tsx  # Global state: products, user, Firestore sync
│   │   └── components/
│   │       ├── SellPage.tsx
│   │       ├── BuyPage.tsx
│   │       ├── MessagesPage.tsx
│   │       ├── RequestsPage.tsx
│   │       ├── HistoryPage.tsx
│   │       ├── ProfilePage.tsx
│   │       └── NotificationsDropdown.tsx  # Stub
│   ├── public/
│   │   └── _redirects         # SPA fallback for client-side routing
│   └── package.json
├── vercel.json                # Vercel deployment config
├── SETUP.md                   # Firebase setup and local run instructions
├── problem_statement.txt      # Full feature spec and design notes
└── presentation.tex           # LaTeX project presentation slides
```

---

## Categories

Products are listed under one of four categories:
- Stationery
- Books
- Electronics
- Other

---

## Getting Started

See [SETUP.md](./SETUP.md) for Firebase configuration and local development instructions.
