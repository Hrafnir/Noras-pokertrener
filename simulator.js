/* Version: #24 - Turneringssimulator Engine (Ekte Håndevaluator & Post-Flop AI) */

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
        id: 1, name: 'Hero (Deg)', isHero: true, stack: startStack, status: 'active', cards: [], bet: 0, hasActed: false
    });

    for (let i = 2; i <= tableSize; i++) {
        let profile = AI_PROFILES[Math.floor(Math.random() * AI_PROFILES.length)];
        SIM_STATE.players.push({
            id: i, name: profile.name, profile: profile.type, isHero: false, stack: startStack, status: 'active', cards: [], bet: 0, hasActed: false
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
        else { p.status = 'active'; p.bet = 0; p.cards = []; p.hasActed = false; }
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
    // Blinds har "betalt", men har ikke "handlet" aktivt ennå (hasActed = false)
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

    // NY LOGIKK: Bettingrunden er ferdig NÅR alle har betalt like mye, OG alle har hatt muligheten til å handle.
    let allMatched = activeInHand.every(p => (p.hasActed && p.bet === SIM_STATE.currentBet) || p.stack === 0);
    
    if (allMatched && activeInHand.length > 0) {
        nextPhase();
        return;
    }

    let currentPlayer = SIM_STATE.players[SIM_STATE.currentTurnIdx];
    
    if (currentPlayer.stack === 0 || currentPlayer.hasActed && currentPlayer.bet === SIM_STATE.currentBet) {
        SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.currentTurnIdx);
        setTimeout(processTurn, 100);
        return;
    }

    if (currentPlayer.isHero) {
        document.getElementById('sim-controls').classList.remove('hidden');
        setupHeroControls(currentPlayer);
    } else {
        document.getElementById('sim-controls').classList.add('hidden');
        setTimeout(() => executeAITurn(currentPlayer), 1000); 
    }
}

function getAIPosition(playerIdx) {
    const tableSize = SIM_STATE.players.filter(p => p.status !== 'out').length;
    const activePlayers = [];
    let idx = SIM_STATE.dealerIdx;
    for(let i=0; i<SIM_STATE.players.length; i++) {
        idx = (idx + 1) % SIM_STATE.players.length;
        if(SIM_STATE.players[idx].status !== 'out') activePlayers.push(idx);
    }
    const posNames = getActivePositions(tableSize);
    let heroPosIndex = activePlayers.indexOf(playerIdx);
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
        let facingRaise = callAmount > SIM_STATE.blinds.bb - aiPlayer.bet; 
        
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

        let roll = Math.random();
        if (aiPlayer.profile === 'Maniac' && roll < 0.15) { wantsToPlay = true; wantsToRaise = true; } 
        if (aiPlayer.profile === 'Nit' && roll < 0.30) { wantsToPlay = false; } 
        if (aiPlayer.profile === 'Station' && wantsToRaise && roll < 0.50) { wantsToRaise = false; } 

        if (!wantsToPlay) {
            action = callAmount === 0 ? 'CHECK' : 'FOLD';
        } else if (wantsToRaise) {
            action = 'RAISE';
        } else {
            action = 'CALL';
        }
    } else {
        // SMART POST-FLOP AI
        let handEval = evaluateHand(aiPlayer.cards, SIM_STATE.communityCards);
        let cat = handEval.category; // 1: High Card, 2: Pair, 3: Two Pair, etc.

        if (callAmount === 0) { // Kan velge å bette eller sjekke
            if (cat >= 2) { action = Math.random() < 0.6 ? 'RAISE' : 'CHECK'; } 
            else { action = (aiPlayer.profile === 'Maniac' && Math.random() < 0.4) ? 'RAISE' : 'CHECK'; }
        } else { // Står overfor et bet
            if (cat >= 3) { action = Math.random() < 0.4 ? 'RAISE' : 'CALL'; } // To par+
            else if (cat === 2) { // Ett par
                if (aiPlayer.profile === 'Nit' && Math.random() > 0.4) action = 'FOLD'; 
                else action = 'CALL';
            } else { // High card / Ingenting
                if (aiPlayer.profile === 'Station' && Math.random() < 0.25) action = 'CALL'; 
                else if (aiPlayer.profile === 'Maniac' && Math.random() < 0.15) action = 'RAISE'; 
                else action = 'FOLD';
            }
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
    player.hasActed = true; // Spilleren har nå handlet
    
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
        
        // Hvis noen høyner, må alle andre handle på nytt!
        SIM_STATE.players.forEach(p => { 
            if (p.id !== player.id && p.status === 'active' && p.stack > 0) p.hasActed = false; 
        });

        if (player.stack === 0) simLog(`${player.name} går ALL-IN med ${player.bet}!`, 'alert');
        else simLog(`${player.name} høyner til ${player.bet}.`, 'alert');
    }

    SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.currentTurnIdx);
    setTimeout(processTurn, 500);
}

// === 6. FASER OG EKTE HÅNDEVALUATOR ===

function nextPhase() {
    SIM_STATE.players.forEach(p => { 
        SIM_STATE.pot += p.bet; 
        p.bet = 0; 
        if (p.status === 'active' && p.stack > 0) p.hasActed = false; // Nullstill handling for neste gate
    });
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
        simLog("--- FLOP ---", "alert");
    } else if (SIM_STATE.phase === 'flop') {
        SIM_STATE.phase = 'turn';
        SIM_STATE.communityCards.push(SIM_STATE.deck.pop());
        simLog("--- TURN ---", "alert");
    } else if (SIM_STATE.phase === 'turn') {
        SIM_STATE.phase = 'river';
        SIM_STATE.communityCards.push(SIM_STATE.deck.pop());
        simLog("--- RIVER ---", "alert");
    } else if (SIM_STATE.phase === 'river') {
        evaluateShowdown();
        return;
    }

    SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.dealerIdx); 
    updateSimUI();
    setTimeout(processTurn, 1000);
}

// 7-KORTS TEXAS HOLD'EM EVALUATOR
function evaluateHand(holeCards, communityCards) {
    let cards = [...holeCards, ...communityCards].map(c => {
        let val = VALUES.indexOf(c.v);
        return { val: (val === 0 ? 14 : 14 - val), suit: c.s.name };
    }).sort((a, b) => b.val - a.val);

    let counts = {};
    cards.forEach(c => { counts[c.val] = (counts[c.val] || 0) + 1; });
    let groups = Object.entries(counts).map(([v, c]) => ({val: parseInt(v), count: c})).sort((a,b) => b.count - a.count || b.val - a.val);

    let suits = {};
    cards.forEach(c => { suits[c.suit] = (suits[c.suit] || []).concat(c); });
    let flushCards = Object.values(suits).find(list => list.length >= 5);
    let isFlush = !!flushCards;

    function getStraightHigh(cardList) {
        let vals = [...new Set(cardList.map(c => c.val))];
        if (vals.includes(14)) vals.push(1); // Ess kan brukes som lav
        for (let i = 0; i <= vals.length - 5; i++) {
            if (vals[i] - vals[i+4] === 4) return vals[i];
        }
        return 0;
    }

    let straightHigh = getStraightHigh(cards);
    let straightFlushHigh = isFlush ? getStraightHigh(flushCards) : 0;

    let cat = 1, c1=0, c2=0, c3=0, c4=0, c5=0;
    let handName = "";

    if (straightFlushHigh) {
        cat = 9; c1 = straightFlushHigh; handName = straightFlushHigh === 14 ? "Royal Flush" : "Straight Flush";
    } else if (groups[0].count === 4) {
        cat = 8; c1 = groups[0].val; c2 = cards.find(c => c.val !== c1).val; handName = "Fire Like (Quads)";
    } else if (groups[0].count === 3 && groups[1] && groups[1].count >= 2) {
        cat = 7; c1 = groups[0].val; c2 = groups[1].val; handName = "Fullt Hus";
    } else if (isFlush) {
        cat = 6; c1 = flushCards[0].val; c2 = flushCards[1].val; c3 = flushCards[2].val; c4 = flushCards[3].val; c5 = flushCards[4].val; handName = "Flush";
    } else if (straightHigh) {
        cat = 5; c1 = straightHigh; handName = "Straight";
    } else if (groups[0].count === 3) {
        cat = 4; c1 = groups[0].val; 
        let kickers = cards.filter(c => c.val !== c1).slice(0, 2);
        c2 = kickers[0].val; c3 = kickers[1].val; handName = "Tre Like (Trips)";
    } else if (groups[0].count === 2 && groups[1] && groups[1].count === 2) {
        cat = 3; c1 = groups[0].val; c2 = groups[1].val; 
        c3 = cards.find(c => c.val !== c1 && c.val !== c2).val; handName = "To Par";
    } else if (groups[0].count === 2) {
        cat = 2; c1 = groups[0].val;
        let kickers = cards.filter(c => c.val !== c1).slice(0, 3);
        c2 = kickers[0].val; c3 = kickers[1].val; c4 = kickers[2].val; handName = "Ett Par";
    } else {
        cat = 1; c1 = cards[0].val; c2 = cards[1].val; c3 = cards[2].val; c4 = cards[3].val; c5 = cards[4].val; handName = "Høyt Kort";
    }

    let score = cat * 10000000000 + c1 * 100000000 + c2 * 1000000 + c3 * 10000 + c4 * 100 + c5;
    return { score, handName, category: cat };
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
        simLog(`${p.name} viser ${formatCard(p.cards[0])} ${formatCard(p.cards[1])} => <strong>${p.handName}</strong>`);
        
        if (p.handScore > bestScore) {
            bestScore = p.handScore;
            winners = [p];
        } else if (p.handScore === bestScore) {
            winners.push(p);
        }
    });

    if (winners.length === 1) {
        simLog(`🏆 ${winners[0].name} vinner potten (${SIM_STATE.pot})!`, 'hero');
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
