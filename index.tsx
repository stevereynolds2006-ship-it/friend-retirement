"use client";

import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { formatGameAmount } from "@rarefriends/friendsdk/ui";
import type { GameSnapshot } from "@rarefriends/friendsdk/game";
import "@rarefriends/friendsdk/frame.css";
import "./style.css";

/**
 * Friend Retirement — timestamp-based idle / retirement game for Rare Friends.
 *
 * Production is calculated from real elapsed time (Date.now()).
 * Progress is session-only because the FriendSDK sandbox blocks localStorage /
 * IndexedDB. Leave the tab open (or background it) and production continues
 * based on wall-clock time.
 *
 * All economy is simulated. RF spends use the SDK preview client.
 */

type Generator = {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMult: number;
  rate: number; // nest eggs per second
  owned: number;
};

const GENERATOR_DEFS: Omit<Generator, "owned">[] = [
  { id: "chair", name: "Rocking Chair", description: "Classic retirement comfort", baseCost: 10, costMult: 1.15, rate: 0.1 },
  { id: "garden", name: "Garden Plot", description: "Grow a little something", baseCost: 80, costMult: 1.15, rate: 0.8 },
  { id: "dock", name: "Fishing Dock", description: "Cast a line, wait for bites", baseCost: 400, costMult: 1.15, rate: 4 },
  { id: "club", name: "Rare Friend Club", description: "Social hour with other Friends", baseCost: 2000, costMult: 1.15, rate: 20 },
  { id: "vault", name: "Crypto Vault", description: "The nest egg compounds", baseCost: 10000, costMult: 1.15, rate: 100 },
];

function makeGenerators(): Generator[] {
  return GENERATOR_DEFS.map(g => ({ ...g, owned: g.id === "chair" ? 1 : 0 }));
}

function costOf(gen: Generator): number {
  return Math.floor(gen.baseCost * Math.pow(gen.costMult, gen.owned));
}

function totalRate(generators: Generator[]): number {
  return generators.reduce((sum, g) => sum + g.owned * g.rate, 0);
}

const rf = (value: bigint) => `${formatGameAmount(value, 18)} RF`;

export default function FriendRetirement({ friendId, client, paused }: GameComponentProps) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [generators, setGenerators] = useState<Generator[]>(makeGenerators);
  const [nestEggs, setNestEggs] = useState(5);
  const [totalProduced, setTotalProduced] = useState(0);
  const [lastTime, setLastTime] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offlineMsg, setOfflineMsg] = useState("");
  const epoch = useRef(0);
  const locked = useRef(false);

  // Load initial snapshot
  useEffect(() => {
    const version = ++epoch.current;
    setError("");
    setMessage("");
    void client.read().then(value => {
      if (version === epoch.current) setSnapshot(value);
    }).catch(cause => {
      if (version === epoch.current) setError(cause instanceof Error ? cause.message : "Could not load preview.");
    });
    return () => { epoch.current++; };
  }, [client, friendId]);

  // Timestamp-based production tick + visibility handling
  useEffect(() => {
    if (paused) return;

    const tick = () => {
      const now = Date.now();
      setLastTime(prevLast => {
        const deltaSec = Math.max(0, (now - prevLast) / 1000);
        if (deltaSec > 0.5) {
          const rate = totalRate(generators);
          const produced = rate * deltaSec;
          if (produced > 0) {
            setNestEggs(n => n + produced);
            setTotalProduced(t => t + produced);
            if (deltaSec > 30) {
              setOfflineMsg(`Your Friend earned ${produced.toFixed(1)} nest eggs while you were away (${Math.floor(deltaSec)}s).`);
            }
          }
        }
        return now;
      });
    };

    const interval = setInterval(tick, 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [generators, paused]);

  async function investRF() {
    if (locked.current || paused || busy) return;
    const version = epoch.current;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await client.buy(1n);
      const value = await client.read();
      if (version === epoch.current) {
        setSnapshot(value);
        // Successful spend grants a permanent production boost via a free high-tier generator
        setGenerators(prev => prev.map(g => g.id === "vault" ? { ...g, owned: g.owned + 1 } : g));
        setMessage("Invested 1 RF — unlocked a Crypto Vault!");
      }
    } catch (cause) {
      if (version === epoch.current) setError(cause instanceof Error ? cause.message : "Invest failed.");
    } finally {
      if (version === epoch.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  function buyGenerator(id: string) {
    if (paused || busy) return;
    const gen = generators.find(g => g.id === id);
    if (!gen) return;
    const cost = costOf(gen);
    if (nestEggs < cost) return;
    setNestEggs(n => n - cost);
    setGenerators(prev => prev.map(g => g.id === id ? { ...g, owned: g.owned + 1 } : g));
    setMessage(`Bought ${gen.name}!`);
  }

  if (error && !snapshot) {
    return (
      <div className="retirement-game" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!snapshot) {
    return <div className="retirement-game">Loading retirement plan…</div>;
  }

  if (snapshot.friendId !== friendId) {
    return <div className="retirement-game" role="alert">Session does not match selected Friend.</div>;
  }

  const rate = totalRate(generators);
  const canInvest = snapshot.rfBalance >= 1000000000000000000n && !busy && !paused;

  return (
    <section className="retirement-game" aria-label="Friend Retirement" aria-busy={busy}>
      <header className="retirement-header">
        <h1>Friend Retirement</h1>
        <span>Friend #{friendId.toString()}</span>
      </header>

      {offlineMsg && <div className="retirement-message">{offlineMsg}</div>}
      {message && <div className="retirement-message">{message}</div>}
      {error && <div className="retirement-message" role="alert">{error}</div>}

      <div className="retirement-stats">
        <div className="retirement-stat">
          <strong>{nestEggs.toFixed(1)}</strong>
          <small>Nest Eggs</small>
        </div>
        <div className="retirement-stat">
          <strong>{rate.toFixed(2)} /s</strong>
          <small>Production</small>
        </div>
        <div className="retirement-stat">
          <strong>{totalProduced.toFixed(0)}</strong>
          <small>Lifetime produced</small>
        </div>
        <div className="retirement-stat">
          <strong>{rf(snapshot.rfBalance)}</strong>
          <small>Preview RF</small>
        </div>
      </div>

      <div className="retirement-generators">
        {generators.map(gen => {
          const cost = costOf(gen);
          const canAfford = nestEggs >= cost && !paused;
          return (
            <div key={gen.id} className="retirement-gen">
              <div className="info">
                <strong>{gen.name} × {gen.owned}</strong>
                <small>{gen.description} · +{gen.rate}/s each</small>
              </div>
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => buyGenerator(gen.id)}
              >
                Buy · {cost} NE
              </button>
            </div>
          );
        })}
      </div>

      <div className="retirement-rf-section">
        <p>Invest 1 preview RF to unlock a Crypto Vault instantly.</p>
        <button type="button" disabled={!canInvest} onClick={() => void investRF()}>
          Invest 1 RF
        </button>
        <p><small>Simulated · uses the SDK preview ledger</small></p>
      </div>

      <p className="retirement-note">
        Timestamp-based progress (real elapsed time). Session-only — FriendSDK sandbox has no persistent storage.
        Leave the tab open for continuous production. All economy is simulated.
      </p>
    </section>
  );
}
