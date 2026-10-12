# Friend Retirement

A cozy timestamp-based idle / retirement game for Rare Friends, built with FriendSDK v0.1.4.

Your selected Rare Friend retires and builds a nest egg. Buy generators (Rocking Chair, Garden Plot, Fishing Dock, etc.) with Nest Eggs. Production is calculated from real wall-clock time, so leaving the tab open (or backgrounding it) still earns progress when you return.

## How it uses Rare Friends & RF

- Play as your own hardwired Generations NFT (generation ≥ 1).
- The SDK runtime handles wallet connection, Friend selection, and ownership verification.
- All economy is **simulated**.
- "Invest 1 RF" spends from the preview RF ledger (via `client.buy`) and unlocks a high-tier generator.
- Nest Eggs and generators are session-local progress.

## Offline / timestamp progress

When the game is open, production uses `Date.now()` deltas every second and on visibility change.  
If you leave the tab in the background and return, the full elapsed time is applied.  

**Limitation:** FriendSDK’s sandboxed iframe blocks `localStorage` / `IndexedDB` and has no save API. Progress resets on full page reload. This is a documented SDK v0.1.4 limitation. The game labels it clearly in the UI.

## Run locally (Node.js 22+)

```bash
git clone https://github.com/spokesz/friendsdk.git
cd friendsdk
npm ci
# Copy the friend-retirement folder into games/
cp -r /path/to/friend-retirement games/
npm run dev:game -- games/friend-retirement
```

Open the printed URL (usually http://localhost:4173).  
Connect a wallet on Robinhood mainnet (chain 4663) that owns a hardwired Generations NFT (gen ≥ 1).

### Phone testing

```bash
npm run dev:game -- games/friend-retirement --host 0.0.0.0
```

Then open `http://<your-computer-ip>:4173` on your phone (same Wi-Fi).

## Controls

- Tap / click **Buy** buttons to purchase generators with Nest Eggs.
- **Invest 1 RF** spends from the preview balance.
- Production runs automatically based on time.
- Settings and wallet controls are in the SDK runtime frame.

## Economy (simulated)

| Generator       | Base cost | Rate     | Cost growth |
|-----------------|-----------|----------|-------------|
| Rocking Chair   | 10 NE     | 0.1 /s   | ×1.15       |
| Garden Plot     | 80 NE     | 0.8 /s   | ×1.15       |
| Fishing Dock    | 400 NE    | 4 /s     | ×1.15       |
| Rare Friend Club| 2000 NE   | 20 /s    | ×1.15       |
| Crypto Vault    | 10000 NE  | 100 /s   | ×1.15       |

Invest 1 RF → free Crypto Vault.

Preview RF starts at the SDK default (usually 20 RF).

## Category

Economy Potential / Character Spotlight — your Friend is the retired protagonist, and RF is the investment currency that accelerates the nest egg.

## Known issues

- No cross-reload persistence (SDK sandbox limitation).
- Simulated balances only.
- Requires Node.js 22+ and a wallet with an eligible Generations NFT even for previews.

## Submission notes

Vibeathon deadline was September 30, 2026. This prototype is ready for testing and can be adapted for a future submission or personal project.
