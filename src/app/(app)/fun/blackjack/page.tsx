"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Coins, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── TYPES & CONSTANTS ─────────────────────────────────────────────────────────

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
type Card = { suit: Suit; rank: Rank; value: number; id: string };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: { rank: Rank; value: number }[] = [
  { rank: "2", value: 2 }, { rank: "3", value: 3 }, { rank: "4", value: 4 },
  { rank: "5", value: 5 }, { rank: "6", value: 6 }, { rank: "7", value: 7 },
  { rank: "8", value: 8 }, { rank: "9", value: 9 }, { rank: "10", value: 10 },
  { rank: "J", value: 10 }, { rank: "Q", value: 10 }, { rank: "K", value: 10 },
  { rank: "A", value: 11 },
];

const CHIPS = [
  { val: 10, color: "bg-gray-100 text-gray-900 border-gray-300" },
  { val: 50, color: "bg-red-500 text-white border-red-700" },
  { val: 100, color: "bg-blue-600 text-white border-blue-800" },
  { val: 500, color: "bg-emerald-600 text-white border-emerald-800" },
  { val: 1000, color: "bg-yellow-500 text-black border-yellow-700" },
];

type GamePhase = "BETTING" | "DEALING" | "PLAYER_TURN" | "DEALER_TURN" | "RESULT";
type GameResult = "WIN" | "LOSE" | "PUSH" | "BLACKJACK" | "BUST" | null;

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 4; i++) { // 4 decks for true casino feel
    SUITS.forEach(suit => {
      RANKS.forEach(r => {
        deck.push({ suit, rank: r.rank, value: r.value, id: Math.random().toString(36).substr(2, 9) });
      });
    });
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHand(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  cards.forEach(c => {
    total += c.value;
    if (c.rank === "A") aces += 1;
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function BlackjackPage() {
  const [balance, setBalance] = useState<number>(10000);
  const [deck, setDeck] = useState<Card[]>([]);
  
  const [bet, setBet] = useState<number>(0);
  const [phase, setPhase] = useState<GamePhase>("BETTING");
  
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  
  const [result, setResult] = useState<GameResult>(null);
  const [message, setMessage] = useState<string>("");

  // Load balance
  useEffect(() => {
    const saved = localStorage.getItem("bj_balance");
    if (saved) setBalance(parseInt(saved, 10));
    setDeck(createDeck());
  }, []);

  // Save balance
  useEffect(() => {
    localStorage.setItem("bj_balance", balance.toString());
  }, [balance]);

  // Deal initial cards
  const startDeal = useCallback(() => {
    if (bet === 0) return;
    if (deck.length < 15) setDeck(createDeck()); // reshuffle if low
    
    setBalance(b => b - bet);
    setPhase("DEALING");
    
    const d = [...deck];
    const pHand = [d.pop()!, d.pop()!];
    const dHand = [d.pop()!, d.pop()!];
    
    setDeck(d);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    
    // Check for immediate blackjack
    const pTotal = calculateHand(pHand).total;
    const dTotal = calculateHand(dHand).total;
    
    setTimeout(() => {
      if (pTotal === 21 && dTotal === 21) {
        endGame("PUSH", pHand, dHand);
      } else if (pTotal === 21) {
        endGame("BLACKJACK", pHand, dHand);
      } else if (dTotal === 21) {
        endGame("LOSE", pHand, dHand);
      } else {
        setPhase("PLAYER_TURN");
      }
    }, 1000);
  }, [bet, deck]);

  // Hit
  const hit = () => {
    const d = [...deck];
    const card = d.pop()!;
    setDeck(d);
    
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    
    const { total } = calculateHand(newHand);
    if (total > 21) {
      endGame("BUST", newHand, dealerHand);
    } else if (total === 21) {
      stand(newHand);
    }
  };

  // Double Down
  const doubleDown = () => {
    if (balance < bet) return;
    setBalance(b => b - bet);
    setBet(b => b * 2);
    
    const d = [...deck];
    const card = d.pop()!;
    setDeck(d);
    
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    
    const { total } = calculateHand(newHand);
    if (total > 21) {
      endGame("BUST", newHand, dealerHand);
    } else {
      stand(newHand);
    }
  };

  // Stand (dealer turn)
  const stand = (customPHand?: Card[]) => {
    const pHand = Array.isArray(customPHand) ? customPHand : playerHand;
    setPhase("DEALER_TURN");
    
    let currentDeck = [...deck];
    let dHand = [...dealerHand];
    let dTotal = calculateHand(dHand).total;
    
    const dealerPlays = () => {
      if (dTotal < 17) {
        const card = currentDeck.pop()!;
        dHand = [...dHand, card];
        dTotal = calculateHand(dHand).total;
        setDealerHand(dHand);
        setDeck(currentDeck);
        setTimeout(dealerPlays, 800);
      } else {
        const pTotal = calculateHand(pHand).total;
        if (dTotal > 21) {
          endGame("WIN", pHand, dHand);
        } else if (dTotal > pTotal) {
          endGame("LOSE", pHand, dHand);
        } else if (dTotal < pTotal) {
          endGame("WIN", pHand, dHand);
        } else {
          endGame("PUSH", pHand, dHand);
        }
      }
    };
    
    setTimeout(dealerPlays, 800);
  };

  // End Game
  const endGame = (res: GameResult, pHand: Card[], dHand: Card[]) => {
    setPhase("RESULT");
    setResult(res);
    
    if (res === "BLACKJACK") {
      setBalance(b => b + bet + (bet * 1.5));
      setMessage("Blackjack! 3:2 Payout");
    } else if (res === "WIN") {
      setBalance(b => b + bet * 2);
      setMessage("You Win!");
    } else if (res === "PUSH") {
      setBalance(b => b + bet);
      setMessage("Push! Bet returned");
    } else if (res === "BUST") {
      setMessage("Bust! You lose");
    } else {
      setMessage("Dealer Wins");
    }
  };

  // Reset for next hand
  const nextHand = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setResult(null);
    setMessage("");
    setPhase("BETTING");
    // Keep the same bet for convenience
  };

  const addChip = (val: number) => {
    if (balance >= val) {
      setBet(b => b + val);
    }
  };

  const clearBet = () => {
    setBet(0);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  const { total: pTotal } = calculateHand(playerHand);
  const { total: dTotal } = calculateHand(dealerHand);
  
  // Dealer shows only one card if not in result/dealer turn phase
  const dealerVisibleTotal = phase === "DEALER_TURN" || phase === "RESULT"
    ? dTotal
    : dealerHand.length > 0 ? calculateHand([dealerHand[1]]).total : 0;

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col bg-[#0A3D2E] text-white overflow-hidden relative font-sans select-none">
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

      {/* Header */}
      <div className="flex items-center justify-between p-6 z-10">
        <Link href="/fun" className="flex items-center gap-2 text-emerald-100 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide">Back</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 shadow-inner">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold tabular-nums text-lg">${balance.toLocaleString()}</span>
          </div>
          {balance <= 0 && phase === "BETTING" && (
            <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white" onClick={() => setBalance(10000)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Funds
            </Button>
          )}
        </div>
      </div>

      {/* Game Table */}
      <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full p-6 z-10">
        
        {/* Dealer Area */}
        <div className="flex flex-col items-center justify-center min-h-[220px]">
          {dealerHand.length > 0 && (
            <div className="mb-4 bg-black/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-200/70 border border-emerald-900/50">
              Dealer • {dealerVisibleTotal}
            </div>
          )}
          <div className="flex justify-center gap-[-40px] relative">
            {dealerHand.map((card, i) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                hidden={i === 0 && phase !== "DEALER_TURN" && phase !== "RESULT"}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Center Messages */}
        <div className="h-24 flex items-center justify-center pointer-events-none">
          {phase === "RESULT" && (
            <div className="animate-in zoom-in spin-in-2 duration-500 flex flex-col items-center">
              <h2 className={cn("text-5xl font-black italic tracking-tighter uppercase drop-shadow-xl", 
                result === "WIN" || result === "BLACKJACK" ? "text-yellow-400" : 
                result === "PUSH" ? "text-blue-300" : "text-rose-500"
              )}>
                {message}
              </h2>
            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="flex flex-col items-center justify-center min-h-[220px]">
          <div className="flex justify-center gap-[-40px] relative mb-4">
            {playerHand.map((card, i) => (
              <PlayingCard key={card.id} card={card} index={i} />
            ))}
          </div>
          {playerHand.length > 0 && (
            <div className={cn("px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase border",
              pTotal > 21 ? "bg-red-950/80 text-red-400 border-red-900" : "bg-black/40 text-emerald-200 border-emerald-900/50"
            )}>
              Player • {pTotal}
            </div>
          )}
        </div>

      </div>

      {/* Controls Area */}
      <div className="h-[200px] bg-black/60 border-t border-white/10 backdrop-blur-md z-20 flex items-center justify-center px-6">
        
        {phase === "BETTING" ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
            <div className="flex items-center gap-8 w-full justify-between">
              <div className="flex flex-col gap-1 items-start w-32">
                <span className="text-xs font-bold uppercase text-white/50 tracking-widest">Current Bet</span>
                <span className="text-3xl font-black text-yellow-400 tabular-nums">${bet.toLocaleString()}</span>
              </div>
              
              {/* Chips */}
              <div className="flex items-center gap-3">
                {CHIPS.map(c => (
                  <button
                    key={c.val}
                    onClick={() => addChip(c.val)}
                    disabled={balance < c.val}
                    className={cn(
                      "w-16 h-16 rounded-full border-[6px] border-dashed shadow-xl flex items-center justify-center font-bold text-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100",
                      c.color
                    )}
                  >
                    {c.val}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col gap-2 w-32">
                <Button variant="destructive" size="sm" onClick={clearBet} disabled={bet === 0} className="w-full text-xs font-bold uppercase tracking-wider">
                  Clear
                </Button>
                <Button size="lg" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]" disabled={bet === 0} onClick={startDeal}>
                  Deal
                </Button>
              </div>
            </div>
          </div>
        ) : phase === "PLAYER_TURN" ? (
          <div className="flex items-center gap-4">
            <Button size="lg" className="w-32 h-16 rounded-2xl bg-white text-black hover:bg-gray-200 font-black uppercase text-xl shadow-xl transition-transform active:scale-95" onClick={hit}>
              Hit
            </Button>
            <Button size="lg" className="w-32 h-16 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-xl shadow-xl transition-transform active:scale-95" onClick={stand}>
              Stand
            </Button>
            {playerHand.length === 2 && balance >= bet && (
              <Button size="lg" className="w-32 h-16 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xl shadow-xl transition-transform active:scale-95" onClick={doubleDown}>
                Double
              </Button>
            )}
          </div>
        ) : phase === "RESULT" ? (
          <div className="flex items-center gap-6">
            <Button size="lg" className="h-16 px-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-transform active:scale-95" onClick={nextHand}>
              Next Hand
            </Button>
          </div>
        ) : (
          <div className="text-white/50 font-bold uppercase tracking-widest animate-pulse">
            Dealer's Turn...
          </div>
        )}
        
      </div>
    </div>
  );
}

// ─── CARD COMPONENT ────────────────────────────────────────────────────────────

function PlayingCard({ card, hidden = false, index }: { card: Card, hidden?: boolean, index: number }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  
  return (
    <div 
      className={cn(
        "w-32 h-48 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between p-3 border transition-all duration-300 transform",
        hidden ? "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blue-900 border-white/20" : "bg-white border-gray-200"
      )}
      style={{
        marginLeft: index > 0 ? "-60px" : "0",
        transform: `rotate(${index * 4 - 2}deg) translateY(${index * 2}px)`,
        zIndex: index,
      }}
    >
      {!hidden && (
        <>
          {/* Top Left */}
          <div className={cn("text-2xl font-bold leading-none flex flex-col items-center", isRed ? "text-red-600" : "text-gray-900")}>
            <span>{card.rank}</span>
            <span className="text-xl -mt-1">{card.suit}</span>
          </div>
          
          {/* Center huge suit */}
          <div className={cn("absolute inset-0 flex items-center justify-center text-7xl opacity-10", isRed ? "text-red-600" : "text-gray-900")}>
            {card.suit}
          </div>
          
          {/* Bottom Right */}
          <div className={cn("text-2xl font-bold leading-none flex flex-col items-center rotate-180 self-end", isRed ? "text-red-600" : "text-gray-900")}>
            <span>{card.rank}</span>
            <span className="text-xl -mt-1">{card.suit}</span>
          </div>
        </>
      )}
    </div>
  );
}
