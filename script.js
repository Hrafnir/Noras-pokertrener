/* Version: #17 */

// === 1. KONFIGURASJON OG DATA ===

const POSITIONS = ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const VALUES = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
];

// GTO RFI Ranges (Åpen Pott)
const RFI_RANGES = {
    "UTG":  ["77+", "ATs+", "A5s-A4s", "KQs", "QJs", "JTs", "AQo+"],
    "UTG1": ["66+", "A9s+", "A5s-A3s", "KJs+", "QJs", "JTs", "AQo+"],
    "UTG2": ["55+", "A8s+", "A5s-A2s", "KTs+", "QTs+", "JTs", "T9s", "AJo+"],
    "LJ":   ["44+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
    "HJ":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "ATo+", "KJo+", "KQo"],
    "CO":   ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "97s+", "87s", "76s", "ATo+", "KTo+", "QJo"],
    "BTN":  ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "54s+", "A2o+", "K9o+", "Q9o+", "J9o+", "T9o+"],
    "SB_RAISE": ["55+", "A8s+", "A5s-A4s", "KJs+", "QJs", "AJo+", "KQo"],
    "SB_LIMP":  ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "95s+", "84s+", "74s+", "63s+", "53s+", "43s+", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o+"],
    "HU_BTN": ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "94s+", "84s+", "74s+", "64s+", "54s+", "A2o+", "K2o+", "Q4o+", "J6o+", "T7o+", "97o+", "87o+"] // Ekstremt bred Heads-Up range
};

// GTO Defense Ranges (Møter en Raise)
const CALL_RANGES = {
    "UTG1": ["88", "99", "TT", "JJ", "AQs"],
    "UTG2": ["77", "88", "99", "TT", "JJ", "AQs", "KQs"],
    "LJ":   ["66", "77", "88", "99", "TT", "JJ", "AQs", "KQs", "JTs"],
    "HJ":   ["55", "66", "77", "88", "99", "TT", "JJ", "AJs+", "KQs", "QJs", "JTs", "T9s"],
    "CO":   ["44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AQo"],
    "BTN":  ["22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AQo"],
    "SB":   [], 
    "BB":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "76s", "AJo+", "KQo", "KJo+"],
    "HU_BB": ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T4s+", "95s+", "85s+", "75s+", "65s+", "A2o+", "K2o+", "Q7o+", "J8o+", "T8o+", "98o+"] // HU BB forsvarer veldig bredt mot BTN
};

const THREE_BET_RANGES = {
    "UTG1": ["QQ+", "AKs", "AKo"],
    "UTG2": ["QQ+", "AKs", "AKo", "A5s"],
    "LJ":   ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
    "HJ":   ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
    "CO":   ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s"],
    "BTN":  ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s"],
    "SB":   ["99+", "AJs+", "KQs", "AQo+", "A5s-A4s"], 
    "BB":   ["JJ+", "AQs+", "AKo", "A5s-A2s"],
    "HU_BB": ["88+", "A9s+", "KJs+", "QJs", "AJo+", "KQo", "A5s-A2s"] // Tøff 3-bet fra BB i Heads-Up
};

// === 2. APP-TILSTAND ===
let state = {
    tableSize: 9,
    activePositions: [],
    currentPosString: "",
    villainPosString: "",
    hand: [],
    handStr: "",
    isSuited: false,
    score: 0,
    streak: 0,
    expanded: { rfi: {}, call: {}, threeBet: {} }
};

// === 3. KATEGORISERING & KONTEKSTUELL PEDAGOGIKK ===

function log(msg) { console.log(`[POKER-LOG] ${msg}`); }

function getHandCategory(handStr) {
    if (["AA", "KK", "QQ"].includes(handStr)) return "PREMIUM_PAIR";
    if (["JJ", "TT"].includes(handStr)) return "HIGH_PAIR";
    if (["99", "88", "77"].includes(handStr)) return "MID_PAIR";
    if (handStr.length === 2) return "LOW_PAIR"; 

    if (["AKs", "AKo", "AQs", "AQo"].includes(handStr)) return "PREMIUM_BROADWAY";
    if (["A5s", "A4s", "A3s", "A2s"].includes(handStr)) return "SUITED_WHEEL_ACE";
    
    const v1 = VALUES.indexOf(handStr[0]), v2 = VALUES.indexOf(handStr[1]);
    const isSuited = handStr.endsWith('s');
    
    if (handStr[0] === 'A' && isSuited && v2 >= 5 && v2 <= 8) return "MID_SUITED_ACE"; 
    if (v1 <= 4 && v2 <= 4) return isSuited ? "SUITED_BROADWAY" : "OFFSUIT_BROADWAY";
    
    if (isSuited) {
        if (v2 - v1 === 1) return "SUITED_CONNECTOR";
        if (v2 - v1 === 2) return "SUITED_GAPPER";
    }

    if (!isSuited && (v1 > 4 || v2 > 4) && (v2 - v1 > 1)) return "TRASH";
    return "GENERAL";
}

function getCategoryExplanation(category, tableSize) {
    let prefix = "";
    if (tableSize === 2) prefix = "💡 [Heads-Up] I Heads-Up må du være knallhard! Blindene spiser deg opp hvis du venter på gode kort. ";
    else if (tableSize <= 6) prefix = "💡 [Short-Handed] Med færre spillere ved bordet øker verdien på nesten alle hender. Spilles bredere! ";

    switch(category) {
        case "SUITED_WHEEL_ACE": return prefix + "Moderne GTO elsker A2s-A5s! De blokkerer sterke ess, kan treffe nut-flush, og lage straight (wheel) på lave bord. Perfekte bløff-kandidater.";
        case "PREMIUM_PAIR": return prefix + "Monsterpar. Disse skal spilles knallhardt for å bygge pott og hente verdi.";
        case "HIGH_PAIR": return prefix + "Sterke par (TT-JJ). Solide, men krever forsiktighet postflop hvis overkort treffer.";
        case "MID_PAIR": return prefix + "Mellomstore par (77-99) spilles primært for å 'set-mine' eller vinne mot overkort på lave bord.";
        case "LOW_PAIR": return prefix + (tableSize > 6 ? "Små par mister verdi i tidlig posisjon fordi de ofte møter 3-bets. Knallgode fra sen posisjon!" : "Små par er ekstremt sterke når dere er få spillere. Du treffer sjelden sett, men paret er ofte best uansett!");
        case "SUITED_CONNECTOR": return prefix + "Suited connectors (f.eks 87s) spiller fantastisk postflop. De realiserer equity bra og treffer sterke trekk.";
        case "OFFSUIT_BROADWAY": return prefix + (tableSize > 6 ? "Offsuit broadways (som KJo) er felle-hender fra tidlig posisjon." : "Når bordet er lite (som nå), er høye offsuit kort mye mer verdifulle og spilles oftere for ren kortverdi.");
        case "TRASH": return prefix + (tableSize === 2 ? "Selv i Heads-up er det grenser. Dette er søppel, kast den!" : "Søppel. Kast og vent på et bedre spot!");
        default: return prefix + "Suited hender foretrekkes generelt over offsuit på grunn av mye bedre 'spillbarhet' postflop.";
    }
}

// === 4. DYNAMISK "NESTEN RIKTIG" LOGIKK ===

function isMarginalOutside(handStr, rangeSet) {
    if(rangeSet.has(handStr) || rangeSet === "ANY") return false;
    let v1 = VALUES.indexOf(handStr[0]), v2 = VALUES.indexOf(handStr[1]);
    let type = handStr.length === 3 ? handStr[2] : "";

    if(handStr.length === 2 && v1 > 0) return rangeSet.has(VALUES[v1-1] + VALUES[v1-1]);
    if(v2 > 0 && v2 - 1 !== v1) if(rangeSet.has(VALUES[v1] + VALUES[v2-1] + type)) return true;
    if(v1 > 0) if(rangeSet.has(VALUES[v1-1] + VALUES[v2] + type)) return true;
    return false;
}

function isMarginalInside(handStr, rangeSet) {
    if(!rangeSet.has(handStr) || rangeSet === "ANY") return false;
    let v1 = VALUES.indexOf(handStr[0]), v2 = VALUES.indexOf(handStr[1]);
    let type = handStr.length === 3 ? handStr[2] : "";

    if(handStr.length === 2) return (v1 < 12) ? !rangeSet.has(VALUES[v1+1] + VALUES[v1+1]) : true;
    if(v2 < 12) return !rangeSet.has(VALUES[v1] + VALUES[v2+1] + type);
    return false;
}

// === 5. RANGE MOTOR ===

function expandRangeConfig(rangeArr) {
    if (rangeArr.includes("ANY")) return "ANY";
    let hands = new Set();
    rangeArr.forEach(item => {
        if (item.endsWith('+')) {
            let base = item.slice(0, -1);
            if (base.length === 2) { 
                let valIdx = VALUES.indexOf(base[0]);
                for (let i = 0; i <= valIdx; i++) hands.add(VALUES[i] + VALUES[i]);
            } else { 
                let c1 = base[0], c2 = base[1], type = base[2];
                let idx1 = VALUES.indexOf(c1), idx2 = VALUES.indexOf(c2);
                for (let i = idx1 + 1; i <= idx2; i++) hands.add(c1 + VALUES[i] + type);
            }
        } else if (item.includes('-')) { 
            let parts = item.split('-');
            let base1 = parts[0], base2 = parts[1];
            let c1 = base1[0], type = base1[2];
            let start = Math.min(VALUES.indexOf(base1[1]), VALUES.indexOf(base2[1]));
            let end = Math.max(VALUES.indexOf(base1[1]), VALUES.indexOf(base2[1]));
            for (let i = start; i <= end; i++) hands.add(c1 + VALUES[i] + type);
        } else hands.add(item);
    });
    if(!rangeArr.includes("ANY") && rangeArr.length > 0) {
        hands.add("AA"); hands.add("KK"); 
        if(rangeArr !== CALL_RANGES["SB"]) hands.add("AKs"); 
    }
    return hands;
}

function initializeRanges() {
    log("Kalkulerer og utvider alle ranges inkludert Heads-Up...");
    for (let pos in RFI_RANGES) state.expanded.rfi[pos] = expandRangeConfig(RFI_RANGES[pos]);
    for (let pos in CALL_RANGES) state.expanded.call[pos] = expandRangeConfig(CALL_RANGES[pos]);
    for (let pos in THREE_BET_RANGES) state.expanded.threeBet[pos] = expandRangeConfig(THREE_BET_RANGES[pos]);
}

function getActivePositions(size) {
    if (size === 9) return ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
    if (size === 8) return ["UTG", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"]; 
    if (size === 6) return ["LJ", "HJ", "CO", "BTN", "SB", "BB"];
    if (size === 3) return ["BTN", "SB", "BB"];
    if (size === 2) return ["BTN", "BB"]; // I HU er BTN også SB
    return [];
}

// === 6. SPILLELOGIKK ===

function dealNewHand() {
    const mode = document.getElementById('mode-selector').value;
    state.tableSize = parseInt(document.getElementById('table-size-selector').value);
    state.activePositions = getActivePositions(state.tableSize);
    
    // Sett CSS for bordgeometri
    const gameArea = document.getElementById('game-area');
    gameArea.className = (state.tableSize < 9) ? `table-${state.tableSize}max` : '';

    log(`Deler ny hånd. Modus: ${mode}, Bord: ${state.tableSize}-Max`);

    if (mode === "RFI") {
        // I RFI øver vi ikke på BB lenger (Walks er bortkastet tid)
        let rfiOptions = state.activePositions.filter(p => p !== "BB");
        state.currentPosString = rfiOptions[Math.floor(Math.random() * rfiOptions.length)];
        state.villainPosString = "";
    } else { // FACING RAISE
        // Hero kan ikke være den første som handler (må være plass til en raiser før)
        let heroOptions = state.activePositions.slice(1);
        state.currentPosString = heroOptions[Math.floor(Math.random() * heroOptions.length)];
        
        // Villain MÅ være posisjonen før Hero
        let heroIdx = state.activePositions.indexOf(state.currentPosString);
        let villainOptions = state.activePositions.slice(0, heroIdx);
        state.villainPosString = villainOptions[Math.floor(Math.random() * villainOptions.length)];
    }

    // Kortgenerering
    let c1v = Math.floor(Math.random() * 13), c1s = Math.floor(Math.random() * 4);
    let c2v = Math.floor(Math.random() * 13), c2s = Math.floor(Math.random() * 4);
    while (c1v === c2v && c1s === c2s) { c2v = Math.floor(Math.random() * 13); c2s = Math.floor(Math.random() * 4); }

    state.hand = [{ v: VALUES[c1v], s: SUITS[c1s], idx: c1v }, { v: VALUES[c2v], s: SUITS[c2s], idx: c2v }];
    state.isSuited = c1s === c2s;
    state.hand.sort((a, b) => a.idx - b.idx);
    state.handStr = (state.hand[0].v === state.hand[1].v) ? state.hand[0].v + state.hand[1].v : state.hand[0].v + state.hand[1].v + (state.isSuited ? "s" : "o");
    
    updateUI();
}

function getCorrectRangeSet(type) {
    const pos = state.currentPosString;
    if (type === "RFI") {
        if (state.tableSize === 2 && pos === "BTN") return state.expanded.rfi["HU_BTN"];
        if (pos === "SB") return state.expanded.rfi["SB_RAISE"];
        return state.expanded.rfi[pos];
    } else if (type === "CALL") {
        if (state.tableSize === 2 && pos === "BB") return state.expanded.call["HU_BB"];
        return state.expanded.call[pos];
    } else if (type === "3BET") {
        if (state.tableSize === 2 && pos === "BB") return state.expanded.threeBet["HU_BB"];
        return state.expanded.threeBet[pos];
    }
}

function checkAction(userAction) {
    const pos = state.currentPosString;
    const mode = document.getElementById('mode-selector').value;
    const categoryExplanation = getCategoryExplanation(getHandCategory(state.handStr), state.tableSize);
    
    let isCorrect = false;
    let title = "", text = "", statusClass = "";

    if (mode === "RFI") {
        const raiseRange = getCorrectRangeSet("RFI");
        const isRaise = raiseRange.has(state.handStr);
        const isMarginalAggro = isMarginalOutside(state.handStr, raiseRange);
        const isMarginalTight = isMarginalInside(state.handStr, raiseRange);

        if (pos === "SB" && state.tableSize > 2 && userAction === "CALL") {
            isCorrect = state.expanded.rfi["SB_LIMP"].has(state.handStr);
            text = isCorrect ? `Godkjent limp (complete). ${categoryExplanation}` : `Feil. For svakt selv for en limp.`;
        } else if (userAction === "CALL") {
            text = "I en uåpnet pott skal du ALDRI limpe (med unntak av Small Blind). Raise eller fold!";
        } else if (userAction === "RAISE") { 
            if (isRaise) { isCorrect = true; text = `Riktig standard åpning. ${categoryExplanation}`; }
            else if (isMarginalAggro) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Litt for aggressivt, men god tankegang. Dette er rett under cutoff for RFI herfra. ${categoryExplanation}`; }
            else { text = `Altfor løst! Denne kastes fra ${pos}. ${categoryExplanation}`; }
        } else { // FOLD
            if (!isRaise) { isCorrect = true; text = `Godt kast. ${categoryExplanation}`; }
            else if (isMarginalTight) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Litt for forsiktig! Denne er akkurat sterk nok til å åpne. ${categoryExplanation}`; }
            else { text = `Feil! GTO sier Raise. Du går glipp av verdi! ${categoryExplanation}`; }
        }
    } else { // FACING RAISE
        const threeBetRange = getCorrectRangeSet("3BET");
        const callRange = getCorrectRangeSet("CALL");
        const is3Bet = threeBetRange.has(state.handStr);
        const isCall = callRange.has(state.handStr);

        if (userAction === "RAISE") {
            if (is3Bet) { isCorrect = true; text = `Solid 3-Bet! ${categoryExplanation}`; }
            else if (isMarginalOutside(state.handStr, threeBetRange)) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `God idé, men rett under grensen for 3-bet bløff/verdi her. ${categoryExplanation}`; }
            else { text = `Overspill. Du bør ikke 3-bette denne. ${categoryExplanation}`; }
        } else if (userAction === "CALL") {
            if (pos === "SB" && state.tableSize > 2) { text = "Fra SB spiller moderne GTO nesten utelukkende 3-bet eller fold mot en raise."; }
            else if (isCall) { isCorrect = true; text = `Godt forsvar (flat-call). ${categoryExplanation}`; }
            else if (is3Bet) { text = `Feil! Denne er så sterk at den MÅ 3-bettes. ${categoryExplanation}`; }
            else if (isMarginalOutside(state.handStr, callRange)) { title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Litt for løst syn. Akkurat for svak til å forsvare. ${categoryExplanation}`; }
            else { text = `Hånden er altfor svak til å syne en raise med. Fold!`; }
        } else { // FOLD
            if (!is3Bet && !isCall) { isCorrect = true; text = `Disiplinert kast. ${categoryExplanation}`; }
            else if (isMarginalInside(state.handStr, callRange) || isMarginalInside(state.handStr, threeBetRange)) {
                title = "NESTEN RIKTIG!"; statusClass = "marginal"; text = `Litt for forsiktig! Innafor å forsvare. ${categoryExplanation}`;
            }
            else { text = `Feil! Denne hånden er for sterk til å kastes mot en raise. ${categoryExplanation}`; }
        }
    }

    if(!statusClass) statusClass = isCorrect ? "correct" : "wrong";
    if(!title) title = isCorrect ? "RIKTIG!" : "FEIL!";

    if (isCorrect) {
        state.score += 10;
        state.streak += 1;
    } else {
        state.streak = 0; 
        if (document.getElementById('auto-range-toggle').checked) setTimeout(() => openModal(true), 600); 
    }
    
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('streak-display').textContent = state.streak;
    displayFeedback(title, text, statusClass);
}

// === 7. UI OG MODAL HÅNDTERING ===

function updateUI() {
    const pos = state.currentPosString;
    const mode = document.getElementById('mode-selector').value;
    
    document.getElementById('current-pos-display').textContent = pos + (state.tableSize === 2 && pos === "BTN" ? " (SB)" : "");
    document.getElementById('range-pos-label').textContent = pos;
    
    if (mode === "FACING_RAISE") {
        document.getElementById('scenario-display').textContent = `Møter en Raise fra ${state.villainPosString}`;
        document.getElementById('btn-call').textContent = "CALL (FLAT)";
        document.getElementById('btn-raise').textContent = "RAISE (3-BET)";
    } else {
        document.getElementById('scenario-display').textContent = state.tableSize === 2 ? "Heads-Up (Du handler først)" : "Åpen Pott (Ingen har høynet)";
        document.getElementById('btn-call').textContent = "LIMP / CHECK";
        document.getElementById('btn-raise').textContent = "RAISE (RFI)";
    }

    document.querySelectorAll('.seat').forEach(s => { s.classList.remove('active-hero'); s.classList.remove('active-villain'); });
    document.getElementById("seat-" + pos.toLowerCase()).classList.add('active-hero');
    if (mode === "FACING_RAISE") document.getElementById("seat-" + state.villainPosString.toLowerCase()).classList.add('active-villain');

    const cc = document.getElementById('hole-cards');
    cc.innerHTML = '';
    state.hand.forEach(c => {
        const div = document.createElement('div');
        div.className = `card ${c.s.color}`;
        div.innerHTML = `<span>${c.v}</span><span style="font-size: 0.6em; margin-top: 5px;">${c.s.symbol}</span>`;
        cc.appendChild(div);
    });

    document.getElementById('feedback-section').classList.add('hidden');
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = false);
}

function displayFeedback(title, text, statusClass) {
    const panel = document.getElementById('feedback-section');
    panel.className = statusClass; 
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-text').textContent = text;
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
    panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function buildMatrix(highlightError = false) {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';
    const mode = document.getElementById('mode-selector').value;
    
    document.getElementById('modal-pos-title').textContent = state.currentPosString;

    let redRange, blueRange;
    if (mode === "FACING_RAISE") {
        redRange = getCorrectRangeSet("3BET") || new Set();
        blueRange = getCorrectRangeSet("CALL") || new Set();
    } else {
        redRange = getCorrectRangeSet("RFI") || new Set();
        blueRange = state.currentPosString === "SB" && state.tableSize > 2 ? state.expanded.rfi["SB_LIMP"] : new Set();
    }

    for (let r = 0; r < 13; r++) {
        for (let c = 0; c < 13; c++) {
            const cell = document.createElement('div');
            let handName = (r === c) ? VALUES[r] + VALUES[c] : (c > r ? VALUES[r] + VALUES[c] + "s" : VALUES[c] + VALUES[r] + "o"); 

            cell.textContent = handName;
            cell.className = 'matrix-cell';

            if (redRange === "ANY" || (redRange.has && redRange.has(handName))) cell.classList.add('raise');
            else if (blueRange.has && blueRange.has(handName)) cell.classList.add('call');

            if (highlightError && handName === state.handStr) cell.classList.add('highlight-hand');
            container.appendChild(cell);
        }
    }
}

function openModal(isError = false) { buildMatrix(isError); document.getElementById('range-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('range-modal').classList.add('hidden'); }

// === 8. INITIALISERING ===

document.addEventListener('DOMContentLoaded', () => {
    initializeRanges();
    document.getElementById('btn-fold').addEventListener('click', () => checkAction('FOLD'));
    document.getElementById('btn-call').addEventListener('click', () => checkAction('CALL'));
    document.getElementById('btn-raise').addEventListener('click', () => checkAction('RAISE'));
    document.getElementById('btn-next').addEventListener('click', dealNewHand);
    
    document.getElementById('btn-show-range').addEventListener('click', () => openModal(false));
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('mode-selector').addEventListener('change', dealNewHand);
    document.getElementById('table-size-selector').addEventListener('change', dealNewHand);
    document.getElementById('range-modal').addEventListener('click', (e) => { if (e.target.id === 'range-modal') closeModal(); });

    dealNewHand();
});

/* Version: #17 */
