import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Points backend link safely across localhost environments
const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:4000', {
  transports: ['polling', 'websocket']
});

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedVote, setSelectedVote] = useState('');

  useEffect(() => {
    socket.on('roomState', (updatedRoom) => {
      setRoom(updatedRoom);
      setError('');
    });

    socket.on('errorMsg', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off('roomState');
      socket.off('errorMsg');
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return setError('Please enter your name!');
    socket.emit('createRoom', { playerName });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) return setError('Please enter your name!');
    if (!roomId.trim()) return setError('Please enter a Room Code!');
    socket.emit('joinRoom', { roomId, playerName });
  };

  const handleStartGame = () => {
    socket.emit('startGame', { roomId: room.id });
  };

  const handleAnswerSubmit = () => {
    if (!typedAnswer.trim()) return;
    socket.emit('submitAnswer', { roomId: room.id, answer: typedAnswer });
  };

  const handleVoteSubmit = () => {
    if (!selectedVote) return;
    socket.emit('submitVote', { roomId: room.id, targetPlayerId: selectedVote });
  };

  // Helper properties
  const myIdentity = room?.players.find(p => p.id === socket.id);
  const isImposter = room?.imposterId === socket.id;

  // --- SCREEN RENDERING ARCHITECTURE ---

  // LOGIN SCREEN
  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
          <h1 className="text-4xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-red-500 to-indigo-500 bg-clip-text text-transparent">
            SUSPECT SPECTRUM
          </h1>
          <p className="text-slate-400 text-center text-sm mb-8">Can you blend in, or spot the outlier?</p>

          {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Your Name</label>
              <input 
                type="text" value={playerName} maxLength={12} onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition"
                placeholder="Enter nickname..."
              />
            </div>

            <hr className="border-slate-800 my-6" />

            <button onClick={handleCreateRoom} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20">
              Host New Game
            </button>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)}
                className="w-1/2 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center uppercase tracking-wider outline-none focus:border-emerald-500 transition"
                placeholder="ROOM CODE"
              />
              <button onClick={handleJoinRoom} className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20">
                Join Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY SCREEN
  if (room.gameState === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1">ROOM CODE</div>
          <div className="text-5xl font-black tracking-widest text-indigo-400 font-mono mb-6 bg-slate-950 py-3 rounded-xl border border-slate-800">
            {room.id}
          </div>

          <h3 className="text-left text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
            Players Connected ({room.players.length})
          </h3>
          <div className="space-y-2 mb-8 max-h-60 overflow-y-auto">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                <span className="font-semibold text-slate-200">{p.name} {p.id === socket.id && <span className="text-indigo-400 text-xs">(You)</span>}</span>
                {p.isHost && <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-md">HOST</span>}
              </div>
            ))}
          </div>

          {error && <div className="p-3 mb-4 text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg">{error}</div>}

          {myIdentity?.isHost ? (
            <button onClick={handleStartGame} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition">
              Launch Game Loop
            </button>
          ) : (
            <div className="text-sm text-slate-500 animate-pulse">Waiting for host to launch matching engines...</div>
          )}
        </div>
      </div>
    );
  }

  // QUESTION PHASE SCREEN
  if (room.gameState === 'question') {
    const customPrompt = isImposter ? room.currentQuestion.decoyQuestion : room.currentQuestion.trueQuestion;
    const trackingSubmitted = myIdentity?.answer.trim().length > 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-400">Incoming Objective</div>
          <h2 className="text-2xl font-bold mb-6 text-white leading-snug">{customPrompt}</h2>

          {!trackingSubmitted ? (
            <div className="space-y-4">
              <input 
                type="text" value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                placeholder="Type clear, deceptive, or precise response..."
              />
              <button onClick={handleAnswerSubmit} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">
                Lock Answer
              </button>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-emerald-400 font-bold mb-2 animate-bounce">✓ Answer Transmitted</div>
              <div className="text-sm text-slate-500">Awaiting confirmation from secondary terminals...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DEBATE PHASE SCREEN
  if (room.gameState === 'debate') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-2xl p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-500">Debate & Analyze</div>
              <div className="text-sm text-slate-400 mt-1">True Prompt Revealed: <span className="text-white font-medium">"{room.currentQuestion.trueQuestion}"</span></div>
            </div>
            <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center min-w-16">
              <div className="text-xs text-slate-500 font-bold uppercase">Time</div>
              <div className="text-xl font-mono font-black text-amber-400">{room.timer}s</div>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Intercepted Responses:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {room.players.map(p => (
              <div key={p.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-indigo-400 mb-1">{p.name} asserts:</div>
                <div className="text-lg font-bold text-white tracking-wide">"{p.answer}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // VOTING PHASE SCREEN
  if (room.gameState === 'voting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-1">Ejection Protocol</div>
          <h2 className="text-2xl font-black mb-4 text-white">Cast Your Ballot</h2>
          <p className="text-sm text-slate-400 mb-6">Who received the altered decoy instruction? Choose anonymously.</p>

          {!myIdentity?.hasVoted ? (
            <div className="space-y-2 mb-6">
              {room.players.map(p => (
                <button 
                  key={p.id} onClick={() => setSelectedVote(p.id)}
                  className={`w-full p-3 text-left font-bold rounded-xl border transition ${selectedVote === p.id ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  {p.name} {p.id === socket.id && "(You)"}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 mb-6">
              <div className="text-rose-400 font-bold mb-1">Ballot Sealed</div>
              <div className="text-xs text-slate-500">Intercepting remote player voting arrays...</div>
            </div>
          )}

          {!myIdentity?.hasVoted && (
            <button onClick={handleVoteSubmit} disabled={!selectedVote} className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl transition">
              Confirm Cast
            </button>
          )}
        </div>
      </div>
    );
  }

  // REVEAL PHASE SCREEN (The ultimate cinematic red screen implementation)
  if (room.gameState === 'reveal') {
    const finalImposterObj = room.players.find(p => p.id === room.imposterId);

    // Sub-Phase 1: Displays who targeted whom
    if (room.revealPhase === 'votes') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h2 className="text-xl font-bold text-center text-slate-200 mb-6 uppercase tracking-wider">Ballot Calculations</h2>
            <div className="space-y-3">
              {room.players.map(p => {
                const target = room.players.find(t => t.id === p.votedFor);
                return (
                  <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between text-sm">
                    <span className="font-bold text-slate-300">{p.name}</span>
                    <span className="text-slate-500">voted for</span>
                    <span className="font-bold text-rose-400">{target ? target.name : 'Nobody'}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 text-center text-xs text-indigo-400 tracking-widest animate-pulse font-bold uppercase">
              Establishing Deep Identity Scan...
            </div>
          </div>
        </div>
      );
    }

    // Sub-Phase 2: THE HIGH INTENSITY RED SCREEN IMMERSION ENGINE
    if (room.revealPhase === 'identity') {
      return (
        <div className={`flex flex-col items-center justify-center min-h-screen p-6 transition-all duration-500 ${isImposter ? 'bg-red-700 animate-pulse-fast text-white' : 'bg-emerald-950 text-emerald-100'}`}>
          <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-950/90 text-center border shadow-2xl border-slate-800">
            {isImposter ? (
              <div>
                <h1 className="text-5xl font-black tracking-tight text-red-500 mb-2 animate-bounce">EXPOSED</h1>
                <p className="text-xl font-bold text-slate-200 mb-6">YOU WERE THE IMPOSTER!</p>
              </div>
            ) : (
              <div>
                <h1 className="text-5xl font-black tracking-tight text-emerald-400 mb-2">THREAT ELIMINATED</h1>
                <p className="text-lg font-medium text-slate-300 mb-6">
                  The rogue actor was <span className="text-emerald-400 font-black underline">{finalImposterObj?.name}</span>
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-left mb-6">
              <div className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Prompt Discrepancy</div>
              <div className="text-sm mb-2 text-slate-300"><span className="text-indigo-400 font-bold">Crew prompt:</span> "{room.currentQuestion.trueQuestion}"</div>
              <div className="text-sm text-slate-300"><span className="text-rose-400 font-bold">Imposter prompt:</span> "{room.currentQuestion.decoyQuestion}"</div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-left">Current Leaderboard</h3>
            <div className="space-y-2 mb-8">
              {[...room.players].sort((a,b) => b.score - a.score).map((p, idx) => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-sm text-slate-300">{idx + 1}. {p.name} {p.id === room.imposterId && "🕵️"}</span>
                  <span className="px-3 py-1 bg-slate-950 rounded-lg text-xs font-black text-amber-400 border border-slate-800">{p.score} pts</span>
                </div>
              ))}
            </div>

            {myIdentity?.isHost && (
              <button onClick={handleStartGame} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl transition shadow-xl">
                Advance Next Matrix Round
              </button>
            )}
          </div>
        </div>
      );
    }
  }

  return null;
}