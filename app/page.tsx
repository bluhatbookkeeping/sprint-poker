"use client";

import { useState, useEffect, useCallback } from "react";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, "?"];
const MALE_AVATARS = ["👨", "👨‍💻", "🧔", "👨‍🦱", "👨‍🦳"];
const FEMALE_AVATARS = ["👩", "👩‍💻", "👩‍🦱", "👩‍🦳", "🧕"];

const FELT_GREEN = "#1a5c2e";
const CARD_BACK = "#1e3a5f";

// ── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  name: string;
  gender: "male" | "female";
  avatarIdx: number;
  avatar: string;
}

interface Player extends Profile {
  vote: string | number | null;
  voted: boolean;
}

interface StoryResult {
  votes: (string | number | null)[];
  finalPoint: string | number;
}

interface Session {
  stories: StoryResult[];
  startedAt: string | null;
}

interface SessionRecord {
  date: string;
  players: string[];
  stories: StoryResult[];
}

// ── localStorage helpers ─────────────────────────────────────────────────────
const ls = {
  get: <T,>(k: string): T | null => {
    try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; }
  },
  set: (k: string, v: unknown) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
};

// ── Seat positions around oval ────────────────────────────────────────────────
const seatPositions = (count: number) => {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const rx = 40, ry = 33;
    positions.push({
      left: `${50 + rx * Math.cos(angle)}%`,
      top: `${50 + ry * Math.sin(angle)}%`,
    });
  }
  return positions;
};

// ── PlayingCard ───────────────────────────────────────────────────────────────
function PlayingCard({
  value, flipped, size = "md", onClick, selected,
}: {
  value: string | number | null;
  flipped: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  selected?: boolean;
}) {
  const sizes = { sm: "w-8 h-12 text-xs", md: "w-12 h-16 text-sm", lg: "w-16 h-24 text-xl" };
  return (
    <div onClick={onClick} className={`${sizes[size]} relative cursor-pointer select-none`} style={{ perspective: "600px" }}>
      <div style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.6s cubic-bezier(.4,2,.6,1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        width: "100%", height: "100%", position: "relative",
      }}>
        {/* Back */}
        <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
          className={`rounded-lg border-2 flex items-center justify-center shadow-xl ${selected ? "border-yellow-400 shadow-yellow-400/50" : "border-blue-400"}`}>
          <div className="w-full h-full rounded-md flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CARD_BACK}, #2d5a8e)` }}>
            <span style={{ fontSize: size === "lg" ? 20 : 12 }}>🂠</span>
          </div>
        </div>
        {/* Front */}
        <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
          className="rounded-lg border-2 border-yellow-400 bg-white flex flex-col items-center justify-center shadow-xl">
          <span className={`font-black ${size === "lg" ? "text-2xl" : "text-base"} text-gray-800`}>{value}</span>
        </div>
      </div>
    </div>
  );
}

// ── PlayerSeat ────────────────────────────────────────────────────────────────
function PlayerSeat({ player, revealed, isCurrentUser }: {
  player: Player; revealed: boolean; isCurrentUser: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 70 }}>
      <div className={`relative text-3xl transition-all duration-300 ${!player.voted && !revealed ? "opacity-50" : ""}`}>
        {player.avatar}
        {player.voted && !revealed && (
          <span className="absolute -top-1 -right-1 text-xs bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">✓</span>
        )}
        {isCurrentUser && (
          <span className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-white" style={{ fontSize: 7 }}>YOU</span>
        )}
      </div>
      <span className="text-white text-xs font-semibold text-center leading-tight"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)", maxWidth: 64, wordBreak: "break-word" }}>
        {player.name}
      </span>
      {player.voted || revealed ? (
        <PlayingCard value={player.vote} flipped={revealed} size="sm" />
      ) : (
        <div className="w-8 h-12 rounded border border-white/20 bg-white/5 flex items-center justify-center">
          <span className="text-white/30 text-xs">?</span>
        </div>
      )}
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ players, onFinalPoint, storyNum }: {
  players: Player[];
  onFinalPoint: (p: string | number) => void;
  storyNum: number;
}) {
  const votes = players.filter(p => p.vote !== null && p.vote !== "?").map(p => Number(p.vote));
  const avg = votes.length ? (votes.reduce((a, b) => a + b, 0) / votes.length).toFixed(1) : "N/A";
  const min = votes.length ? Math.min(...votes) : "N/A";
  const max = votes.length ? Math.max(...votes) : "N/A";
  const spread = votes.length ? (max as number) - (min as number) : 0;
  const [chosen, setChosen] = useState<string | number | null>(null);

  const quip = () => {
    if (spread === 0) return "🎯 Perfect consensus! The team is aligned.";
    if (spread >= 13) return "🌪️ Wild disagreement! Time for a deep dive.";
    if (spread >= 8) return "🤔 Big spread — someone sees complexity others don't.";
    if (spread >= 5) return "💬 Some divergence — worth a quick chat.";
    return "✅ Pretty close! Easy decision ahead.";
  };

  return (
    <div className="bg-black/40 backdrop-blur rounded-2xl p-5 border border-yellow-400/30 text-white max-w-sm w-full mx-auto">
      <div className="text-center mb-4">
        <div className="text-yellow-400 font-bold text-sm mb-1">STORY #{storyNum} RESULTS</div>
        <div className="text-xs text-white/60 italic">{quip()}</div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        {([["AVG", avg], ["LOW", min], ["HIGH", max]] as [string, string | number][]).map(([label, val]) => (
          <div key={label} className="bg-white/10 rounded-lg p-2">
            <div className="text-yellow-400 text-xs font-bold">{label}</div>
            <div className="text-white text-xl font-black">{val}</div>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <div className="text-xs text-white/60 mb-2 text-center">SELECT FINAL POINTS</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {FIBONACCI.map(v => (
            <button key={v} onClick={() => setChosen(v)}
              className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${chosen === v ? "bg-yellow-400 text-black scale-110 shadow-lg shadow-yellow-400/40" : "bg-white/10 text-white hover:bg-white/20"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <button disabled={chosen === null} onClick={() => chosen !== null && onFinalPoint(chosen)}
        className="w-full py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-green-500 hover:bg-green-400 text-white">
        ✅ Lock In {chosen !== null ? chosen : "—"} Points & Next Story
      </button>
    </div>
  );
}

// ── JoinScreen ────────────────────────────────────────────────────────────────
function JoinScreen({ onJoin, savedProfile }: { onJoin: (p: Profile) => void; savedProfile: Profile | null }) {
  const [name, setName] = useState(savedProfile?.name || "");
  const [gender, setGender] = useState<"male" | "female">(savedProfile?.gender || "male");
  const [avatarIdx, setAvatarIdx] = useState(savedProfile?.avatarIdx ?? 0);

  const avatars = gender === "male" ? MALE_AVATARS : FEMALE_AVATARS;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at center, #0d3320 0%, #060f0a 100%)" }}>
      <div className="bg-black/50 backdrop-blur border border-yellow-400/30 rounded-3xl p-8 w-full max-w-sm text-white shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🃏</div>
          <h1 className="text-2xl font-black text-yellow-400" style={{ fontFamily: "Georgia, serif" }}>Sprint Poker</h1>
          <p className="text-white/50 text-sm mt-1">Take your seat at the table</p>
        </div>
        {savedProfile && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 text-center text-sm text-green-400">
            👋 Welcome back, {savedProfile.name}!
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-yellow-400/60 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Avatar Gender</label>
            <div className="flex gap-2 mb-3">
              {(["male", "female"] as const).map(g => (
                <button key={g} onClick={() => { setGender(g); setAvatarIdx(0); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${gender === g ? "bg-yellow-400 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}>
                  {g === "male" ? "👨 Male" : "👩 Female"}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              {avatars.map((a, i) => (
                <button key={i} onClick={() => setAvatarIdx(i)}
                  className={`text-2xl p-1.5 rounded-xl transition-all ${avatarIdx === i ? "bg-yellow-400/30 scale-125 ring-2 ring-yellow-400" : "hover:bg-white/10"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="text-center text-3xl py-2">{avatars[avatarIdx]}</div>
          <button disabled={!name.trim()}
            onClick={() => onJoin({ name: name.trim(), gender, avatarIdx, avatar: avatars[avatarIdx] })}
            className="w-full py-3 rounded-xl font-black text-black text-sm tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-400/30">
            🎲 TAKE MY SEAT
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HistoryScreen ─────────────────────────────────────────────────────────────
function HistoryScreen({ history, onClose }: { history: SessionRecord[]; onClose: () => void }) {
  return (
    <div className="min-h-screen p-6 overflow-auto" style={{ background: "radial-gradient(ellipse at center, #0d3320 0%, #060f0a 100%)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-yellow-400 text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>📊 Sprint History</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1.5 rounded-lg">← Back</button>
        </div>
        {history.length === 0 ? (
          <div className="text-center text-white/40 py-20">No sessions yet. Complete a refinement to see history!</div>
        ) : (
          <div className="space-y-4">
            {history.slice().reverse().map((session, i) => {
              const totalPoints = session.stories.reduce((sum, s) => sum + (Number(s.finalPoint) || 0), 0);
              const avgPoints = session.stories.length ? (totalPoints / session.stories.length).toFixed(1) : 0;
              return (
                <div key={i} className="bg-black/40 border border-yellow-400/20 rounded-2xl p-5 text-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-yellow-400 font-bold">{session.date}</div>
                      <div className="text-white/50 text-sm">{session.stories.length} stories · {session.players?.join(", ")}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-white">{totalPoints} pts</div>
                      <div className="text-white/40 text-xs">avg {avgPoints}/story</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {session.stories.map((s, j) => (
                      <div key={j} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-1.5">
                        <span className="text-white/70">Story #{j + 1}</span>
                        <div className="flex gap-3 text-xs text-white/50">
                          <span>votes: {s.votes?.join(", ")}</span>
                          <span className="text-yellow-400 font-bold">→ {s.finalPoint} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function SprintPoker() {
  const [screen, setScreen] = useState<"join" | "table" | "history">("join");
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<"waiting" | "voting" | "revealed">("waiting");
  const [storyNum, setStoryNum] = useState(1);
  const [currentSession, setCurrentSession] = useState<Session>({ stories: [], startedAt: null });
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [isFacilitator, setIsFacilitator] = useState(false);

  useEffect(() => {
    const saved = ls.get<Profile>("sprintPoker_profile");
    const savedHistory = ls.get<SessionRecord[]>("sprintPoker_history") || [];
    const savedPlayers = ls.get<Player[]>("sprintPoker_players") || [];
    const savedPhase = ls.get<"waiting" | "voting" | "revealed">("sprintPoker_phase");
    const savedStoryNum = ls.get<number>("sprintPoker_storyNum");

    setHistory(savedHistory);
    if (saved) {
      setMyProfile(saved);
      if (savedPlayers.length > 0) {
        setPlayers(savedPlayers);
        setScreen("table");
      }
    }
    if (savedPhase) setPhase(savedPhase);
    if (savedStoryNum) setStoryNum(savedStoryNum);
  }, []);

  const saveState = useCallback((p: Player[], ph: string, sn: number) => {
    ls.set("sprintPoker_players", p);
    ls.set("sprintPoker_phase", ph);
    ls.set("sprintPoker_storyNum", sn);
  }, []);

  const handleJoin = (profile: Profile) => {
    ls.set("sprintPoker_profile", profile);
    setMyProfile(profile);
    const existing = ls.get<Player[]>("sprintPoker_players") || [];
    const alreadyIn = existing.find(p => p.name === profile.name);
    const updated = alreadyIn
      ? existing.map(p => p.name === profile.name ? { ...p, ...profile } : p)
      : [...existing, { ...profile, vote: null, voted: false }];
    setPlayers(updated);
    ls.set("sprintPoker_players", updated);
    setScreen("table");
  };

  const handleVote = (value: string | number) => {
    if (phase !== "voting") return;
    const updated = players.map(p => p.name === myProfile?.name ? { ...p, vote: value, voted: true } : p);
    setPlayers(updated);
    saveState(updated, phase, storyNum);
  };

  const startVoting = () => {
    const updated = players.map(p => ({ ...p, vote: null, voted: false }));
    setPlayers(updated);
    setPhase("voting");
    saveState(updated, "voting", storyNum);
    if (!currentSession.startedAt) {
      setCurrentSession(s => ({ ...s, startedAt: new Date().toLocaleDateString() }));
    }
  };

  const revealVotes = () => {
    setPhase("revealed");
    saveState(players, "revealed", storyNum);
  };

  const handleFinalPoint = (points: string | number) => {
    const story: StoryResult = {
      votes: players.filter(p => p.voted).map(p => p.vote),
      finalPoint: points,
    };
    setCurrentSession(s => ({ ...s, stories: [...s.stories, story] }));
    const nextStory = storyNum + 1;
    const updated = players.map(p => ({ ...p, vote: null, voted: false }));
    setPlayers(updated);
    setPhase("waiting");
    setStoryNum(nextStory);
    saveState(updated, "waiting", nextStory);
  };

  const endSession = () => {
    if (currentSession.stories.length === 0) return;
    const record: SessionRecord = {
      date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      players: players.map(p => p.name),
      stories: currentSession.stories,
    };
    const newHistory = [...history, record];
    setHistory(newHistory);
    ls.set("sprintPoker_history", newHistory);
    setCurrentSession({ stories: [], startedAt: null });
    setStoryNum(1);
    const reset = players.map(p => ({ ...p, vote: null, voted: false }));
    setPlayers(reset);
    setPhase("waiting");
    saveState(reset, "waiting", 1);
    alert(`✅ Session saved! ${record.stories.length} stories, ${record.stories.reduce((s, st) => s + (Number(st.finalPoint) || 0), 0)} total points.`);
  };

  const removePlayer = (name: string) => {
    const updated = players.filter(p => p.name !== name);
    setPlayers(updated);
    saveState(updated, phase, storyNum);
  };

  const myVote = players.find(p => p.name === myProfile?.name)?.vote;
  const allVoted = players.length > 0 && players.every(p => p.voted);
  const positions = seatPositions(players.length);

  if (screen === "history") return <HistoryScreen history={history} onClose={() => setScreen("table")} />;
  if (screen === "join") return <JoinScreen onJoin={handleJoin} savedProfile={ls.get<Profile>("sprintPoker_profile")} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at center, #0d3320 0%, #060f0a 100%)", fontFamily: "Georgia, serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🃏</span>
          <div>
            <h1 className="text-yellow-400 font-black text-lg leading-none">Sprint Poker</h1>
            <p className="text-white/40 text-xs">Story #{storyNum}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentSession.stories.length > 0 && (
            <span className="text-white/50 text-xs">{currentSession.stories.length} done</span>
          )}
          <button onClick={() => setScreen("history")}
            className="text-white/60 hover:text-yellow-400 text-xs border border-white/20 px-3 py-1.5 rounded-lg transition-colors">
            📊 History
          </button>
          <button onClick={() => setIsFacilitator(!isFacilitator)}
            className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${isFacilitator ? "border-yellow-400/60 text-yellow-400" : "border-white/20 text-white/60 hover:text-white"}`}>
            {isFacilitator ? "👑 Facilitator" : "🎮 Player"}
          </button>
          <button onClick={() => { ls.set("sprintPoker_profile", null); setScreen("join"); }}
            className="text-white/40 hover:text-white text-xs border border-white/10 px-2 py-1.5 rounded-lg">
            ↩
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">

        {/* Table */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="relative" style={{ width: "min(560px, 90vw)", height: "min(380px, 55vw)" }}>
            {/* Felt */}
            <div className="absolute inset-0 rounded-full shadow-2xl border-4 border-yellow-900/60"
              style={{ background: `radial-gradient(ellipse at 40% 40%, #2a7a44, ${FELT_GREEN} 70%, #0f3d1e)`, boxShadow: "0 0 60px rgba(0,0,0,0.8), inset 0 2px 8px rgba(255,255,255,0.05)" }} />
            <div className="absolute inset-0 rounded-full border-8 border-yellow-900/40" style={{ margin: "-4px" }} />

            {/* Center dealer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-1">
              <div className="text-4xl">{myProfile?.gender === "female" ? "👩‍💼" : "👨‍💼"}</div>
              <span className="text-yellow-400 text-xs font-bold">DEALER</span>
              {phase === "waiting" && isFacilitator && (
                <button onClick={startVoting}
                  className="mt-1 bg-yellow-400 text-black text-xs font-black px-4 py-1.5 rounded-full hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/30 animate-pulse">
                  🎲 DEAL
                </button>
              )}
              {phase === "voting" && isFacilitator && (
                <button onClick={revealVotes} disabled={!allVoted}
                  className="mt-1 text-xs font-black px-4 py-1.5 rounded-full transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed bg-red-500 hover:bg-red-400 text-white shadow-red-500/30">
                  {allVoted ? "🔍 REVEAL" : `⏳ ${players.filter(p => p.voted).length}/${players.length}`}
                </button>
              )}
              {phase === "voting" && !isFacilitator && (
                <div className="text-white/50 text-xs mt-1">
                  {allVoted ? "All voted!" : `${players.filter(p => p.voted).length}/${players.length} voted`}
                </div>
              )}
            </div>

            {/* Players */}
            {players.map((player, i) => (
              <div key={player.name} className="absolute z-20"
                style={{ left: positions[i]?.left, top: positions[i]?.top, transform: "translate(-50%, -50%)" }}>
                <div className="relative group">
                  <PlayerSeat player={player} revealed={phase === "revealed"} isCurrentUser={player.name === myProfile?.name} />
                  {isFacilitator && player.name !== myProfile?.name && (
                    <button onClick={() => removePlayer(player.name)}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white items-center justify-center hidden group-hover:flex text-xs">×</button>
                  )}
                </div>
              </div>
            ))}

            {players.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <p className="text-white/30 text-sm text-center">No players yet.<br />Join to take a seat!</p>
              </div>
            )}
          </div>

          {/* Voting cards */}
          {phase === "voting" && (
            <div className="mt-6">
              <p className="text-white/50 text-xs text-center mb-3 uppercase tracking-wider">
                {myVote !== null ? `Your pick: ${myVote} — tap to change` : "Pick your card"}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {FIBONACCI.map(v => (
                  <div key={v} onClick={() => handleVote(v)} className="cursor-pointer">
                    <PlayingCard value={v} flipped={false} size="md" selected={myVote === v} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {phase === "revealed" && (
            <div className="mt-6 w-full flex justify-center">
              {isFacilitator
                ? <Results players={players} onFinalPoint={handleFinalPoint} storyNum={storyNum} />
                : <div className="text-white/50 text-sm text-center">Waiting for facilitator to lock in points...</div>
              }
            </div>
          )}

          {/* End session */}
          {isFacilitator && currentSession.stories.length > 0 && phase === "waiting" && (
            <button onClick={endSession}
              className="mt-4 text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg transition-colors">
              🏁 End Session & Save
            </button>
          )}
        </div>

        {/* Sidebar */}
        {currentSession.stories.length > 0 && (
          <div className="w-48 flex flex-col gap-2 overflow-auto">
            <div className="text-yellow-400/80 text-xs uppercase tracking-wider font-bold">This Session</div>
            {currentSession.stories.map((s, i) => (
              <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-2.5 text-white">
                <div className="text-white/50 text-xs">Story #{i + 1}</div>
                <div className="text-yellow-400 font-black text-lg leading-none">{s.finalPoint} <span className="text-white/40 text-xs font-normal">pts</span></div>
                <div className="text-white/30 text-xs mt-0.5">{s.votes?.join(", ")}</div>
              </div>
            ))}
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2.5 text-white">
              <div className="text-yellow-400/60 text-xs">Total</div>
              <div className="text-yellow-400 font-black text-xl">{currentSession.stories.reduce((s, st) => s + (Number(st.finalPoint) || 0), 0)} pts</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
