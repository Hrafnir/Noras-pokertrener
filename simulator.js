/* Version: #23 - Turneringssimulator Engine med GTO-AI og Håndevaluator */

const SIM_STATE = {
    players: [],
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    blinds: { sb: 10, bb: 20 },
    level: 1,
    dealerIdx: 0,
    currentTurnIdx: 0,
    phase: 'preflop', 
    activePlayers: 0,
    actionLog: []
};

const AI_PROFILES = [
    { type: 'TAG', name: 'Phil (TAG)' },
    { type: 'Nit', name: 'Allen (Nit)' },
    { type: 'Station', name: 'Calling Todd' },
    { type: 'Maniac', name: 'Crazy Viktor' }
];

// === 1. VERKTØY OG LOGGING ===

function simLog(msg, type = 'normal') {
    const logBox = document.getElementById('sim-log-content');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = msg;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight; 
}

function formatCard(cardObj) {
    if (!cardObj) return '';
    return `<span class="${cardObj.s.color}">${cardObj.v}${cardObj.s.symbol}</span>`;
}

// === 2. INITIALISERING ===

function initSimulator() {
    const tableSize = parseInt(document.getElementById('sim-table-size').value);
    
    SIM_STATE.players = [];
    SIM_STATE.pot = 0;
    SIM_STATE.level = 1;
    SIM_STATE.blinds = { sb: 10, bb: 20 };
    SIM_STATE.communityCards = [];
    document.getElementById('sim-log-content').innerHTML = '';
    
    const startStack = 800; 
    
    SIM_STATE.players.push({
        id: 1, name: 'Hero (Deg)', isHero: true, stack: startStack, status: 'active', cards: [], bet: 0
    });

    for (let i = 2; i <= tableSize; i++) {
        let profile = AI_PROFILES[Math.floor(Math.random() * AI_PROFILES.length)];
        SIM_STATE.players.push({
            id: i, name: profile.name, profile: profile.type, isHero: false, stack: startStack, status: 'active', cards: [], bet: 0
        });
    }

    SIM_STATE.dealerIdx = Math.floor(Math.random() * SIM_STATE.players.length);
    updateSimUI();
    simLog(`🏆 Turnering startet! Format: ${tableSize}-Max. Startstack: ${startStack} (40BB).`, 'alert');
    
    startNewHand();
}

function startNewHand() {
    SIM_STATE.communityCards = [];
    SIM_STATE.pot = 0;
    SIM_STATE.currentBet = 0;
    SIM_STATE.phase = 'preflop';
    
    SIM_STATE.players.forEach(p => {
        if (p.stack <= 0) p.status = 'out';
        else { p.status = 'active'; p.bet = 0; p.cards = []; }
    });

    let activeCount = SIM_STATE.players.filter(p => p.status !== 'out').length;
    if (activeCount <= 1) {
        let winner = SIM_STATE.players.find(p => p.status !== 'out');
        simLog(`🎉 TURNERINGEN ER OVER! Vinner: ${winner.name}`, 'alert');
        return;
    }

    do {
        SIM_STATE.dealerIdx = (SIM_STATE.dealerIdx + 1) % SIM_STATE.players.length;
    } while (SIM_STATE.players[SIM_STATE.dealerIdx].status === 'out');

    simLog(`--- Ny Hånd (Blinds: ${SIM_STATE.blinds.sb}/${SIM_STATE.blinds.bb}) ---`);

    createDeck();
    dealCards();
    postBlinds();
    
    updateSimUI();
    processTurn();
}

// === 3. KORTSTOKK OG UTDELING ===

function createDeck() {
    SIM_STATE.deck = [];
    for (let v of VALUES) {
        for (let s of SUITS) {
            SIM_STATE.deck.push({ v: v, s: s, valIdx: VALUES.indexOf(v) });
        }
    }
    for (let i = SIM_STATE.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [SIM_STATE.deck[i], SIM_STATE.deck[j]] = [SIM_STATE.deck[j], SIM_STATE.deck[i]];
    }
}

function dealCards() {
    SIM_STATE.players.forEach(p => {
        if (p.status === 'active') {
            p.cards = [SIM_STATE.deck.pop(), SIM_STATE.deck.pop()];
            p.cards.sort((a, b) => a.valIdx - b.valIdx); 
        }
    });
}

function postBlinds() {
    let sbIdx = getNextActivePlayer(SIM_STATE.dealerIdx);
    let bbIdx = getNextActivePlayer(sbIdx);

    let sbAmount = Math.min(SIM_STATE.players[sbIdx].stack, SIM_STATE.blinds.sb);
    SIM_STATE.players[sbIdx].stack -= sbAmount;
    SIM_STATE.players[sbIdx].bet = sbAmount;
    
    let bbAmount = Math.min(SIM_STATE.players[bbIdx].stack, SIM_STATE.blinds.bb);
    SIM_STATE.players[bbIdx].stack -= bbAmount;
    SIM_STATE.players[bbIdx].bet = bbAmount;

    SIM_STATE.currentBet = SIM_STATE.blinds.bb;
    SIM_STATE.currentTurnIdx = getNextActivePlayer(bbIdx); 
}

function getNextActivePlayer(currentIdx) {
    let idx = currentIdx;
    do { idx = (idx + 1) % SIM_STATE.players.length; } while (SIM_STATE.players[idx].status !== 'active');
    return idx;
}

// === 4. SPILL-LOOP OG GTO-AI ===

function processTurn() {
    updateSimUI();
    let activeInHand = SIM_STATE.players.filter(p => p.status === 'active');

    if (activeInHand.length === 1) {
        awardPot(activeInHand[0]);
        return;
    }

    let allMatched = activeInHand.every(p => p.bet === SIM_STATE.currentBet || p.stack === 0);
    if (allMatched && activeInHand.length > 0) {
        nextPhase();
        return;
    }

    let currentPlayer = SIM_STATE.players[SIM_STATE.currentTurnIdx];
    
    if (currentPlayer.stack === 0) {
        SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.currentTurnIdx);
        setTimeout(processTurn, 300);
        return;
    }

    if (currentPlayer.isHero) {
        document.getElementById('sim-controls').classList.remove('hidden');
        setupHeroControls(currentPlayer);
    } else {
        document.getElementById('sim-controls').classList.add('hidden');
        setTimeout(() => executeAITurn(currentPlayer), 1200); 
    }
}

// Hjelpefunksjon for å finne AI-ens posisjon
function getAIPosition(playerIdx) {
    const tableSize = SIM_STATE.players.filter(p => p.status !== 'out').length;
    const activePlayers = [];
    let idx = SIM_STATE.dealerIdx;
    for(let i=0; i<SIM_STATE.players.length; i++) {
        idx = (idx + 1) % SIM_STATE.players.length;
        if(SIM_STATE.players[idx].status !== 'out') activePlayers.push(idx);
    }
    const posNames = getActivePositions(tableSize);
    // Button er sist i activePlayers (utenom blinds preflop, men vi forenkler mappingen her)
    // For V1 mapper vi bare røft basert på avstand fra knappen.
    let heroPosIndex = activePlayers.indexOf(playerIdx);
    // Forskyver slik at SB er index 0, BB er 1, UTG er 2 etc preflop.
    let mappedPos = posNames[heroPosIndex] || "HJ";
    return mappedPos;
}

function getHandString(cards) {
    let c1 = cards[0], c2 = cards[1];
    let isSuited = c1.s.name === c2.s.name;
    if (c1.v === c2.v) return c1.v + c2.v;
    return c1.v + c2.v + (isSuited ? "s" : "o");
}

function executeAITurn(aiPlayer) {
    let callAmount = SIM_STATE.currentBet - aiPlayer.bet;
    let isPreflop = SIM_STATE.phase === 'preflop';
    let action = 'FOLD';
    let raiseAmount = 0;

    if (isPreflop) {
        let pos = getAIPosition(SIM_STATE.currentTurnIdx);
        let handStr = getHandString(aiPlayer.cards);
        let facingRaise = callAmount > SIM_STATE.blinds.bb - aiPlayer.bet; // Har noen høynet mer enn BB?
        
        // Hent GTO Range (Antar 40BB for enkelhets skyld i V1 simulator AI)
        let rfiRange = state.expanded["40"].rfi[pos] || new Set();
        let callRange = state.expanded["40"].call[pos] || new Set();
        let threeBetRange = state.expanded["40"].threeBet[pos] || new Set();

        let wantsToPlay = false;
        let wantsToRaise = false;

        if (facingRaise) {
            if (threeBetRange.has && threeBetRange.has(handStr)) { wantsToPlay = true; wantsToRaise = true; }
            else if (callRange.has && callRange.has(handStr)) { wantsToPlay = true; wantsToRaise = false; }
        } else {
            if (rfiRange.has && rfiRange.has(handStr)) { wantsToPlay = true; wantsToRaise = true; }
        }

        // Personlighetsjusteringer
        let roll = Math.random();
        if (aiPlayer.profile === 'Maniac' && roll < 0.20) { wantsToPlay = true; wantsToRaise = true; } // Bløffer 20%
        if (aiPlayer.profile === 'Nit' && roll < 0.30) { wantsToPlay = false; } // Folder 30% av bunn-rangen
        if (aiPlayer.profile === 'Station' && wantsToRaise && roll < 0.50) { wantsToRaise = false; } // Syner i stedet for å høyne

        if (!wantsToPlay) {
            action = callAmount === 0 ? 'CHECK' : 'FOLD';
        } else if (wantsToRaise) {
            action = 'RAISE';
        } else {
            action = 'CALL';
        }
    } else {
        // Post-flop (Enkel heuristikk: Kaller hvis check/liten bet, folder mot store bets med mindre de har truffet)
        if (callAmount === 0) {
            action = (aiPlayer.profile === 'Maniac' && Math.random() < 0.4) ? 'RAISE' : 'CHECK';
        } else {
            let roll = Math.random();
            if (aiPlayer.profile === 'Station' && roll > 0.2) action = 'CALL';
            else if (aiPlayer.profile === 'TAG' && roll > 0.6) action = 'CALL';
            else if (roll > 0.85) action = 'RAISE';
            else action = 'FOLD';
        }
    }

    if (action === 'RAISE') {
        let minRaise = SIM_STATE.currentBet === 0 ? SIM_STATE.blinds.bb : SIM_STATE.currentBet * 2;
        raiseAmount = Math.min(aiPlayer.stack + aiPlayer.bet, minRaise);
        if (raiseAmount <= SIM_STATE.currentBet) action = 'CALL'; 
    }

    applyAction(aiPlayer, action, raiseAmount);
}

// === 5. HANDLINGER ===

function setupHeroControls(hero) {
    let callAmount = SIM_STATE.currentBet - hero.bet;
    let btnCall = document.getElementById('sim-btn-call');
    let btnRaise = document.getElementById('sim-btn-raise');
    let raiseInput = document.getElementById('sim-raise-input');

    if (callAmount === 0) {
        btnCall.textContent = "CHECK";
    } else {
        let actualCall = Math.min(callAmount, hero.stack);
        btnCall.textContent = `CALL (${actualCall})`;
    }

    let minRaise = SIM_STATE.currentBet === 0 ? SIM_STATE.blinds.bb : SIM_STATE.currentBet * 2;
    raiseInput.min = minRaise;
    raiseInput.max = hero.stack + hero.bet;
    raiseInput.value = minRaise;

    if (hero.stack <= callAmount) { btnRaise.disabled = true; raiseInput.disabled = true; } 
    else { btnRaise.disabled = false; raiseInput.disabled = false; }

    let newFold = document.getElementById('sim-btn-fold').cloneNode(true);
    let newCall = btnCall.cloneNode(true);
    let newRaise = btnRaise.cloneNode(true);
    document.getElementById('sim-btn-fold').replaceWith(newFold);
    document.getElementById('sim-btn-call').replaceWith(newCall);
    document.getElementById('sim-btn-raise').replaceWith(newRaise);

    newFold.addEventListener('click', () => applyAction(hero, 'FOLD'));
    newCall.addEventListener('click', () => applyAction(hero, callAmount === 0 ? 'CHECK' : 'CALL'));
    newRaise.addEventListener('click', () => {
        let amt = parseInt(document.getElementById('sim-raise-input').value);
        applyAction(hero, 'RAISE', amt);
    });
}

function applyAction(player, action, raiseTotal = 0) {
    document.getElementById('sim-controls').classList.add('hidden');
    
    if (action === 'FOLD') {
        player.status = 'folded';
        simLog(`${player.name} kaster.`);
    } else if (action === 'CHECK') {
        simLog(`${player.name} checker.`);
    } else if (action === 'CALL') {
        let callAmt = SIM_STATE.currentBet - player.bet;
        let actualCall = Math.min(callAmt, player.stack);
        player.stack -= actualCall;
        player.bet += actualCall;
        simLog(`${player.name} syner ${actualCall}.`);
    } else if (action === 'RAISE') {
        let addAmt = raiseTotal - player.bet;
        let actualAdd = Math.min(addAmt, player.stack);
        player.stack -= actualAdd;
        player.bet += actualAdd;
        SIM_STATE.currentBet = player.bet;
        if (player.stack === 0) simLog(`${player.name} går ALL-IN med ${player.bet}!`, 'alert');
        else simLog(`${player.name} høyner til ${player.bet}.`, 'alert');
    }

    SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.currentTurnIdx);
    setTimeout(processTurn, 500);
}

// === 6. FASER OG SHOWDOWN MED HÅNDEVALUATOR ===

function nextPhase() {
    SIM_STATE.players.forEach(p => { SIM_STATE.pot += p.bet; p.bet = 0; });
    SIM_STATE.currentBet = 0;
    
    let activeInHand = SIM_STATE.players.filter(p => p.status === 'active');

    if (activeInHand.filter(p => p.stack > 0).length <= 1 && SIM_STATE.phase !== 'river') {
        simLog("All-in situasjon! Deler ut resten av bordet...", "alert");
        while (SIM_STATE.communityCards.length < 5) {
            SIM_STATE.communityCards.push(SIM_STATE.deck.pop());
        }
        updateSimUI();
        setTimeout(evaluateShowdown, 2000);
        return;
    }

    if (SIM_STATE.phase === 'preflop') {
        SIM_STATE.phase = 'flop';
        SIM_STATE.communityCards.push(SIM_STATE.deck.pop(), SIM_STATE.deck.pop(), SIM_STATE.deck.pop());
        simLog("--- FLOP ---");
    } else if (SIM_STATE.phase === 'flop') {
        SIM_STATE.phase = 'turn';
        SIM_STATE.communityCards.push(SIM_STATE.deck.pop());
        simLog("--- TURN ---");
    } else if (SIM_STATE.phase === 'turn') {
        SIM_STATE.phase = 'river';
        SIM_STATE.communityCards.push(SIM_STATE.deck.pop());
        simLog("--- RIVER ---");
    } else if (SIM_STATE.phase === 'river') {
        evaluateShowdown();
        return;
    }

    SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.dealerIdx); 
    updateSimUI();
    setTimeout(processTurn, 1000);
}

// DEN EKTE HÅNDEVALUATOREN (Texas Hold'em 7-card evaluator)
function evaluateHand(holeCards, communityCards) {
    let allCards = [...holeCards, ...communityCards];
    // Map kort til numeriske verdier (A=14, K=13 osv.)
    let cardValues = allCards.map(c => {
        let v = VALUES.indexOf(c.v);
        return { val: (v === 0 ? 14 : 14 - v), suit: c.s.name };
    }).sort((a, b) => b.val - a.val); // Sorter synkende

    let suits = {};
    let counts = {};
    cardValues.forEach(c => {
        suits[c.suit] = (suits[c.suit] || 0) + 1;
        counts[c.val] = (counts[c.val] || 0) + 1;
    });

    let isFlush = false;
    let flushSuit = null;
    for (let s in suits) { if (suits[s] >= 5) { isFlush = true; flushSuit = s; break; } }

    // Enkel frequency map
    let groups = Object.entries(counts).map(([v, c]) => ({val: parseInt(v), count: c})).sort((a,b) => b.count - a.count || b.val - a.val);
    
    // Sjekk Straight
    let uniqueVals = [...new Set(cardValues.map(c => c.val))];
    let straightHigh = 0;
    if (uniqueVals.includes(14)) uniqueVals.push(1); // Ess kan være lav
    uniqueVals.sort((a,b) => b-a);
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
        if (uniqueVals[i] - uniqueVals[i+4] === 4) { straightHigh = uniqueVals[i]; break; }
    }

    let score = 0;
    let handName = "";

    // Grov scoring: Kategori * 1000000 + Top Kicker verdier
    if (straightHigh && isFlush) { // Forenklet Straight Flush sjekk
        score = 8000000 + straightHigh; handName = "Straight Flush";
    } else if (groups[0].count === 4) {
        score = 7000000 + (groups[0].val * 100) + groups[1].val; handName = "Fire Like (Quads)";
    } else if (groups[0].count === 3 && groups[1]?.count >= 2) {
        score = 6000000 + (groups[0].val * 100) + groups[1].val; handName = "Fullt Hus";
    } else if (isFlush) {
        let fCards = cardValues.filter(c => c.suit === flushSuit).slice(0,5);
        score = 5000000 + fCards[0].val; handName = "Flush";
    } else if (straightHigh) {
        score = 4000000 + straightHigh; handName = "Straight";
    } else if (groups[0].count === 3) {
        score = 3000000 + (groups[0].val * 10000); handName = "Tre Like (Trips)";
    } else if (groups[0].count === 2 && groups[1]?.count === 2) {
        score = 2000000 + (groups[0].val * 10000) + (groups[1].val * 100); handName = "To Par";
    } else if (groups[0].count === 2) {
        score = 1000000 + (groups[0].val * 10000); handName = "Ett Par";
    } else {
        score = groups[0].val * 10000; handName = "Høyt Kort";
    }

    return { score, handName };
}

function evaluateShowdown() {
    SIM_STATE.phase = 'showdown';
    updateSimUI();
    simLog("--- SHOWDOWN ---", "alert");
    
    let active = SIM_STATE.players.filter(p => p.status === 'active');
    let bestScore = -1;
    let winners = [];

    active.forEach(p => {
        let evalRes = evaluateHand(p.cards, SIM_STATE.communityCards);
        p.handScore = evalRes.score;
        p.handName = evalRes.handName;
        simLog(`${p.name} viser ${formatCard(p.cards[0])} ${formatCard(p.cards[1])} (${p.handName})`);
        
        if (p.handScore > bestScore) {
            bestScore = p.handScore;
            winners = [p];
        } else if (p.handScore === bestScore) {
            winners.push(p);
        }
    });

    if (winners.length === 1) {
        simLog(`🏆 ${winners[0].name} vinner med ${winners[0].handName}!`, 'hero');
        awardPot(winners[0]);
    } else {
        simLog(`🤝 Split pot mellom ${winners.map(w=>w.name).join(' og ')}!`, 'alert');
        let splitAmount = Math.floor(SIM_STATE.pot / winners.length);
        winners.forEach(w => w.stack += splitAmount);
        SIM_STATE.pot = 0;
        endHand();
    }
}

function awardPot(winner) {
    SIM_STATE.players.forEach(p => { SIM_STATE.pot += p.bet; p.bet = 0; });
    winner.stack += SIM_STATE.pot;
    SIM_STATE.pot = 0;
    endHand();
}

function endHand() {
    updateSimUI();
    document.getElementById('sim-controls').classList.add('hidden');
    document.getElementById('sim-btn-next-hand').classList.remove('hidden');
}

// === 7. UI OPPDATERING ===

function updateSimUI() {
    document.getElementById('sim-pot-display').textContent = `Pot: ${SIM_STATE.pot}`;
    
    let ccDiv = document.getElementById('sim-community-cards');
    ccDiv.innerHTML = '';
    SIM_STATE.communityCards.forEach(c => {
        ccDiv.innerHTML += `<div class="card ${c.s.color}"><span>${c.v}</span><span style="font-size:0.6em">${c.s.symbol}</span></div>`;
    });

    SIM_STATE.players.forEach(p => {
        let seat = document.getElementById(`sim-seat-${p.id}`);
        if (!seat) return;
        
        if (p.status === 'out') { seat.classList.add('out'); return; }

        seat.className = `sim-seat ${p.isHero ? 'hero-seat' : ''} ${p.id === SIM_STATE.players[SIM_STATE.currentTurnIdx]?.id ? 'active' : ''} ${p.status === 'folded' ? 'folded' : ''}`;
        
        let html = `<strong>${p.name}</strong><br>💰 ${p.stack}`;
        if (p.bet > 0) html += `<br><span style="color:var(--gold)">Bet: ${p.bet}</span>`;
        
        if (p.status === 'active' && p.cards.length === 2) {
            if (p.isHero || SIM_STATE.phase === 'showdown') {
                html += `<div><span class="card ${p.cards[0].s.color}">${p.cards[0].v}${p.cards[0].s.symbol}</span> <span class="card ${p.cards[1].s.color}">${p.cards[1].v}${p.cards[1].s.symbol}</span></div>`;
            } else {
                html += `<div><span class="card black">🂠</span> <span class="card black">🂠</span></div>`;
            }
        }
        
        if (SIM_STATE.players[SIM_STATE.dealerIdx]?.id === p.id) {
            html += `<div style="position:absolute; top:-10px; right:-10px; background:white; color:black; border-radius:50%; width:20px; height:20px; font-weight:bold; border:2px solid black;">D</div>`;
        }

        seat.innerHTML = html;
    });

    document.getElementById('sim-level').textContent = SIM_STATE.level;
    document.getElementById('sim-blinds').textContent = `${SIM_STATE.blinds.sb}/${SIM_STATE.blinds.bb}`;
    document.getElementById('sim-players-left').textContent = SIM_STATE.players.filter(p => p.status !== 'out').length;
}

// Koble til oppstartsknapper
document.getElementById('btn-start-sim').addEventListener('click', () => {
    document.getElementById('sim-settings').classList.add('hidden');
    document.getElementById('sim-info').classList.remove('hidden');
    document.getElementById('sim-game-area').classList.remove('hidden');
    initSimulator();
});

document.getElementById('sim-btn-next-hand').addEventListener('click', () => {
    document.getElementById('sim-btn-next-hand').classList.add('hidden');
    startNewHand();
});
