/* Version: #22 - Turneringssimulator Engine (V1) */

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
    phase: 'preflop', // preflop, flop, turn, river, showdown
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
    logBox.scrollTop = logBox.scrollHeight; // Auto-scroll
}

function formatCard(cardObj) {
    if (!cardObj) return '';
    return `<span class="${cardObj.s.color}">${cardObj.v}${cardObj.s.symbol}</span>`;
}

// === 2. INITIALISERING ===

function initSimulator() {
    const tableSize = parseInt(document.getElementById('sim-table-size').value);
    
    // Reset state
    SIM_STATE.players = [];
    SIM_STATE.pot = 0;
    SIM_STATE.level = 1;
    SIM_STATE.blinds = { sb: 10, bb: 20 };
    SIM_STATE.communityCards = [];
    document.getElementById('sim-log-content').innerHTML = '';
    
    // Opprett spillere (Startstack = 40BB = 800 chips)
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
    
    // Fjern spillere uten sjetonger
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

    // Flytt dealer-knapp
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
    // Stokk (Fisher-Yates)
    for (let i = SIM_STATE.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [SIM_STATE.deck[i], SIM_STATE.deck[j]] = [SIM_STATE.deck[j], SIM_STATE.deck[i]];
    }
}

function dealCards() {
    SIM_STATE.players.forEach(p => {
        if (p.status === 'active') {
            p.cards = [SIM_STATE.deck.pop(), SIM_STATE.deck.pop()];
            // Sorter for enklere visning
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
    SIM_STATE.currentTurnIdx = getNextActivePlayer(bbIdx); // UTG starter
}

function getNextActivePlayer(currentIdx) {
    let idx = currentIdx;
    do {
        idx = (idx + 1) % SIM_STATE.players.length;
    } while (SIM_STATE.players[idx].status !== 'active');
    return idx;
}

// === 4. SPILL-LOOP OG AI ===

function processTurn() {
    updateSimUI();
    
    let activeInHand = SIM_STATE.players.filter(p => p.status === 'active');
    let playersWithChips = activeInHand.filter(p => p.stack > 0);

    // Sjekk om hånden er over (alle har kastet unntatt én)
    if (activeInHand.length === 1) {
        awardPot(activeInHand[0]);
        return;
    }

    // Sjekk om bettingrunden er ferdig
    let allMatched = activeInHand.every(p => p.bet === SIM_STATE.currentBet || p.stack === 0);
    if (allMatched && activeInHand.length > 0) {
        nextPhase();
        return;
    }

    let currentPlayer = SIM_STATE.players[SIM_STATE.currentTurnIdx];
    
    // Hvis spilleren er all-in, hopp over
    if (currentPlayer.stack === 0) {
        SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.currentTurnIdx);
        setTimeout(processTurn, 300);
        return;
    }

    if (currentPlayer.isHero) {
        // Vent på spillerens input
        document.getElementById('sim-controls').classList.remove('hidden');
        setupHeroControls(currentPlayer);
    } else {
        // AI Turn
        document.getElementById('sim-controls').classList.add('hidden');
        setTimeout(() => executeAITurn(currentPlayer), 1200); // 1.2s delay for realisme
    }
}

function executeAITurn(aiPlayer) {
    let callAmount = SIM_STATE.currentBet - aiPlayer.bet;
    let isPreflop = SIM_STATE.phase === 'preflop';
    
    // Ekstremt forenklet heuristikk for V1
    let action = 'FOLD';
    let raiseAmount = 0;

    if (isPreflop) {
        // Veldig enkel logikk for V1: Random sjanse basert på profil og bet size
        if (callAmount === 0) {
            action = 'CHECK';
        } else {
            let roll = Math.random();
            if (aiPlayer.profile === 'Maniac') {
                if (roll > 0.4) action = 'RAISE';
                else if (roll > 0.1) action = 'CALL';
            } else if (aiPlayer.profile === 'Station') {
                if (roll > 0.15) action = 'CALL';
            } else if (aiPlayer.profile === 'TAG') {
                if (roll > 0.7) action = 'RAISE';
                else if (roll > 0.4) action = 'CALL';
            } else { // Nit
                if (roll > 0.85) action = 'RAISE';
                else if (roll > 0.65) action = 'CALL';
            }
        }
    } else {
        // Post-flop (Alt er random / check-fold i V1 hvis vi ikke har bygget håndevaluator for dem ennå)
        if (callAmount === 0) action = 'CHECK';
        else {
            let roll = Math.random();
            if (aiPlayer.profile === 'Station' && roll > 0.3) action = 'CALL';
            else if (aiPlayer.profile === 'Maniac' && roll > 0.5) action = 'RAISE';
            else if (roll > 0.8) action = 'CALL';
        }
    }

    // Utfør handling
    if (action === 'RAISE') {
        let minRaise = SIM_STATE.currentBet === 0 ? SIM_STATE.blinds.bb : SIM_STATE.currentBet * 2;
        raiseAmount = Math.min(aiPlayer.stack + aiPlayer.bet, minRaise);
        if (raiseAmount <= SIM_STATE.currentBet) action = 'CALL'; // Fallback til call hvis for kort stack
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

    if (hero.stack <= callAmount) {
        btnRaise.disabled = true;
        raiseInput.disabled = true;
    } else {
        btnRaise.disabled = false;
        raiseInput.disabled = false;
    }

    // Fjern gamle event listeners
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

// === 6. FASER OG SHOWDOWN ===

function nextPhase() {
    // Samle inn bets til potten
    SIM_STATE.players.forEach(p => {
        SIM_STATE.pot += p.bet;
        p.bet = 0;
    });
    SIM_STATE.currentBet = 0;
    
    let activeInHand = SIM_STATE.players.filter(p => p.status === 'active');

    if (activeInHand.filter(p => p.stack > 0).length <= 1 && SIM_STATE.phase !== 'river') {
        // All-in situasjon - rull ut resten av kortene
        simLog("All-in! Viser resten av bordet...", "alert");
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

    SIM_STATE.currentTurnIdx = getNextActivePlayer(SIM_STATE.dealerIdx); // Small blind først postflop
    updateSimUI();
    setTimeout(processTurn, 1000);
}

function awardPot(winner) {
    SIM_STATE.players.forEach(p => { SIM_STATE.pot += p.bet; p.bet = 0; });
    winner.stack += SIM_STATE.pot;
    simLog(`💰 ${winner.name} vinner potten på ${SIM_STATE.pot}!`, 'hero');
    endHand();
}

function evaluateShowdown() {
    simLog("--- SHOWDOWN ---", "alert");
    // SUPER-ENKEL V1 LØSNING: Vinner kåres tilfeldig for nå for å unngå en 500-linjers hånd-evaluator.
    // I Versjon 23 vil vi bygge den ekte evaluatoren.
    
    let active = SIM_STATE.players.filter(p => p.status === 'active');
    active.forEach(p => {
        simLog(`${p.name} viser ${formatCard(p.cards[0])} ${formatCard(p.cards[1])}`);
    });

    let winner = active[Math.floor(Math.random() * active.length)]; // Midlertidig Random Vinner
    simLog(`(Håndevaluator under bygging. Random vinner valgt for V1)`);
    awardPot(winner);
}

function endHand() {
    updateSimUI();
    document.getElementById('sim-controls').classList.add('hidden');
    document.getElementById('sim-btn-next-hand').classList.remove('hidden');
}

// === 7. UI OPPDATERING ===

function updateSimUI() {
    document.getElementById('sim-pot-display').textContent = `Pot: ${SIM_STATE.pot}`;
    
    // Felleskort
    let ccDiv = document.getElementById('sim-community-cards');
    ccDiv.innerHTML = '';
    SIM_STATE.communityCards.forEach(c => {
        ccDiv.innerHTML += `<div class="card ${c.s.color}"><span>${c.v}</span><span style="font-size:0.6em">${c.s.symbol}</span></div>`;
    });

    // Spillere
    SIM_STATE.players.forEach(p => {
        let seat = document.getElementById(`sim-seat-${p.id}`);
        if (!seat) return;
        
        if (p.status === 'out') {
            seat.classList.add('out');
            return;
        }

        seat.className = `sim-seat ${p.isHero ? 'hero-seat' : ''} ${p.id === SIM_STATE.players[SIM_STATE.currentTurnIdx].id ? 'active' : ''} ${p.status === 'folded' ? 'folded' : ''}`;
        
        let html = `<strong>${p.name}</strong><br>💰 ${p.stack}`;
        if (p.bet > 0) html += `<br><span style="color:var(--gold)">Bet: ${p.bet}</span>`;
        
        // Vis kort (skjult for AI med mindre showdown, åpent for Hero)
        if (p.status === 'active' && p.cards.length === 2) {
            if (p.isHero || SIM_STATE.phase === 'showdown') {
                html += `<div><span class="card ${p.cards[0].s.color}">${p.cards[0].v}${p.cards[0].s.symbol}</span> <span class="card ${p.cards[1].s.color}">${p.cards[1].v}${p.cards[1].s.symbol}</span></div>`;
            } else {
                html += `<div><span class="card black">🂠</span> <span class="card black">🂠</span></div>`;
            }
        }
        
        if (SIM_STATE.players[SIM_STATE.dealerIdx].id === p.id) {
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
