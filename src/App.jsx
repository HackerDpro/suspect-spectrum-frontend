import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://suspect-spectrum-backend.onrender.com', {
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
    socket.on('roomState', (updatedRoom) => { setRoom(updatedRoom); setError(''); });
    socket.on('errorMsg', (msg) => setError(msg));
    return () => { socket.off('roomState'); socket.off('errorMsg'); };
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

  const handleStartGame = () => socket.emit('startGame', { roomId: room.id });
  const handleAnswerSubmit = () => {
    if (!typedAnswer.trim()) return;
    socket.emit('submitAnswer', { roomId: room.id, answer: typedAnswer });
  };
  const handleVoteSubmit = () => {
    if (!selectedVote) return;
    socket.emit('submitVote', { roomId: room.id, targetPlayerId: selectedVote });
  };
  
  // NEW FEATURE: Skip Debate Button Handler
  const handleSkipDebate = () => socket.emit('skipDebate', { roomId: room.id });

  const myIdentity = room?.players.find(p => p.id === socket.id);
  const isImposter = room?.imposterIds?.includes(socket.id);

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
              <input type="text" value={playerName} maxLength={12} onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition" placeholder="Enter nickname..." />
            </div>
            <hr className="border-slate-800 my-6" />
            <button onClick={handleCreateRoom} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20">
              Host New Game
            </button>
            <div className="flex items-center space-x-2 pt-2">
              <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)}
                className="w-1/2 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center uppercase tracking-wider outline-none focus:border-emerald-500 transition" placeholder="ROOM CODE" />
              <button onClick={handleJoinRoom} className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20">
                Join Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (room.gameState === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1">ROOM CODE</div>
          
          {/* POLISH: Copy Code UI */}
          <div 
            onClick={() => navigator.clipboard.writeText(room.id)}
            className="group cursor-pointer flex items-center justify-center space-x-3 mb-6 bg-slate-950 py-3 rounded-xl border border-slate-800 hover:border-indigo-500 transition"
          >
            <div className="text-5xl font-black tracking-widest text-indigo-400 font-mono">{room.id}</div>
            <span className="text-xs text-slate-500 group-hover:text-indigo-400">📋 Copy</span>
          </div>

          <h3 className="text-left text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Players Connected ({room.players.length})</h3>
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
            <button onClick={handleStartGame} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition">Launch Game Loop</button>
          ) : (
            <div className="text-sm text-slate-500 animate-pulse">Waiting for host...</div>
          )}
        </div>
      </div>
    );
  }

  if (room.gameState === 'question') {
    const customPrompt = isImposter ? room.currentQuestion.decoyQuestion : room.currentQuestion.trueQuestion;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-400">Incoming Objective</div>
          <h2 className="text-2xl font-bold mb-6 text-white leading-snug">{customPrompt}</h2>
          {!(myIdentity?.answer.trim().length > 0) ? (
            <div className="space-y-4">
              <input type="text" value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Type response..." />
              <button onClick={handleAnswerSubmit} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">Lock Answer</button>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400 font-bold animate-pulse">Answer Transmitted...</div>
          )}
        </div>
      </div>
    );
  }

  if (room.gameState === 'debate') {
    // Calculate Skip Stats
    const skipCount = room.players.filter(p => p.wantsToSkip).length;
    const totalPlayers = room.players.length;
    const hasVotedToSkip = myIdentity?.wantsToSkip;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-2xl p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-500">Analyze Responses</div>
              <div className="text-sm text-slate-400 mt-1">True Prompt: <span className="text-white font-medium">"{room.currentQuestion.trueQuestion}"</span></div>
            </div>
            <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center min-w-16 shadow-inner">
              <div className="text-xs text-slate-500 font-bold uppercase">Time</div>
              <div className="text-xl font-mono font-black text-amber-400">{room.timer}s</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {room.players.map(p => (
              <div key={p.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
                <div className="text-xs font-bold text-indigo-400 mb-1">{p.name}:</div>
                <div className="text-lg font-bold text-white">"{p.answer}"</div>
              </div>
            ))}
          </div>

          {/* NEW FEATURE: Skip Debate Button */}
          <div className="flex justify-center border-t border-slate-800 pt-6">
            <button 
              onClick={handleSkipDebate} 
              disabled={hasVotedToSkip}
              className={`px-8 py-3 rounded-xl font-bold transition duration-300 border shadow-lg ${
                hasVotedToSkip 
                  ? 'bg-indigo-950 border-indigo-900 text-indigo-400 cursor-not-allowed opacity-80' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500'
              }`}
            >
              {hasVotedToSkip 
                ? `Waiting for others... (${skipCount}/${totalPlayers})` 
                : `⏭️ Skip to Voting (${skipCount}/${totalPlayers})`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (room.gameState === 'voting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-1">Ejection Protocol</div>
          <h2 className="text-2xl font-black mb-4 text-white">Cast Your Ballot</h2>
          <p className="text-sm text-slate-400 mb-6">Who received the decoy instruction?</p>

          {!myIdentity?.hasVoted ? (
            <div className="space-y-2 mb-6">
              {room.players.map(p => (
                <button key={p.id} onClick={() => setSelectedVote(p.id)}
                  className={`w-full p-3 text-left font-bold rounded-xl border transition ${selectedVote === p.id ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}>
                  {p.name} {p.id === socket.id && "(You)"}
                </button>
              ))}
              <button onClick={() => setSelectedVote('NONE')}
                  className={`w-full p-3 mt-4 text-center font-black rounded-xl border transition ${selectedVote === 'NONE' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  🕵️ NOBODY (Paranoia Mode)
              </button>
              <button onClick={handleVoteSubmit} disabled={!selectedVote} className="w-full py-4 mt-6 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl transition shadow-xl">
                Confirm Cast
              </button>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 mb-6 text-rose-400 font-bold">Ballot Sealed...</div>
          )}
        </div>
      </div>
    );
  }

  if (room.gameState === 'reveal') {
    const isParanoia = room.imposterIds.length === 0;

    if (room.revealPhase === 'votes') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h2 className="text-xl font-bold text-center text-slate-200 mb-6 uppercase tracking-wider">Ballot Calculations</h2>
            <div className="space-y-3">
              {room.players.map(p => {
                const targetName = p.votedFor === 'NONE' ? 'NOBODY' : room.players.find(t => t.id === p.votedFor)?.name;
                return (
                  <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between text-sm">
                    <span className="font-bold text-slate-300">{p.name}</span>
                    <span className="text-slate-500">voted for</span>
                    <span className={`font-bold ${p.votedFor === 'NONE' ? 'text-indigo-400' : 'text-rose-400'}`}>{targetName}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 text-center text-xs text-indigo-400 tracking-widest animate-pulse font-bold uppercase">Executing Identity Scan...</div>
          </div>
        </div>
      );
    }

    if (room.revealPhase === 'identity') {
      let bgClass = 'bg-emerald-950 text-emerald-100'; 
      if (isParanoia) bgClass = 'bg-indigo-950 text-indigo-100 animate-pulse';
      else if (isImposter) bgClass = 'bg-red-700 animate-pulse-fast text-white';

      return (
        <div className={`flex flex-col items-center justify-center min-h-screen p-6 transition-all duration-700 ${bgClass}`}>
          <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-950/90 text-center border shadow-2xl border-slate-800">
            {isParanoia ? (
              <div>
                <h1 className="text-4xl font-black tracking-tight text-indigo-400 mb-2">PARANOIA MODE</h1>
                <p className="text-lg font-medium text-slate-300 mb-6">There were absolutely <span className="font-black text-white underline">zero imposters</span> this round. You all received the true prompt!</p>
              </div>
            ) : isImposter ? (
              <div>
                <h1 className="text-5xl font-black tracking-tight text-red-500 mb-2 animate-bounce">EXPOSED</h1>
                <p className="text-xl font-bold text-slate-200 mb-6">YOU WERE AN IMPOSTER!</p>
              </div>
            ) : (
              <div>
                <h1 className="text-4xl font-black tracking-tight text-emerald-400 mb-2">THREAT ELIMINATED</h1>
                <p className="text-lg font-medium text-slate-300 mb-6">
                  The rogue actor(s): <span className="text-emerald-400 font-black">{room.players.filter(p => room.imposterIds.includes(p.id)).map(p => p.name).join(' & ')}</span>
                </p>
              </div>
            )}

            {!isParanoia && (
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-left mb-6">
                <div className="text-sm mb-2 text-slate-300"><span className="text-indigo-400 font-bold">Crew prompt:</span> "{room.currentQuestion.trueQuestion}"</div>
                <div className="text-sm text-slate-300"><span className="text-rose-400 font-bold">Imposter prompt:</span> "{room.currentQuestion.decoyQuestion}"</div>
              </div>
            )}

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-left">Leaderboard</h3>
            <div className="space-y-2 mb-8">
              {[...room.players].sort((a,b) => b.score - a.score).map((p, idx) => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-sm text-slate-300">{idx + 1}. {p.name} {room.imposterIds.includes(p.id) && "🕵️"}</span>
                  <span className="px-3 py-1 bg-slate-950 rounded-lg text-xs font-black text-amber-400 border border-slate-800">{p.score} pts</span>
                </div>
              ))}
            </div>

            {myIdentity?.isHost && (
              <button onClick={handleStartGame} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl transition shadow-xl">
                Advance Next Round
              </button>
            )}
          </div>
        </div>
      );
    }
  }

  return null;
}