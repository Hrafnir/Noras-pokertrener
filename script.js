/* Version: #13 */

// === 1. KONFIGURASJON OG DATA ===

const POSITIONS = ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const VALUES = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
];

// GTO RFI Ranges (Åpen Pott) - Nå oppdatert med moderne Suited Wheel Aces aggresjon
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
    "BB": ["ANY"] // Får Walk
};

// GTO Defense Ranges (Møter en Raise - 3-Bet og Call for 40BB)
const CALL_RANGES = {
    "UTG1": ["88", "99", "TT", "JJ", "AQs"],
    "UTG2": ["77", "88", "99", "TT", "JJ", "AQs", "KQs"],
    "LJ":   ["66", "77", "88", "99", "TT", "JJ", "AQs", "KQs", "JTs"],
    "HJ":   ["55", "66", "77", "88", "99", "TT", "JJ", "AJs+", "KQs", "QJs", "JTs", "T9s"],
    "CO":   ["44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AQo"],
    "BTN":  ["22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "ATs+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AQo"],
    "SB":   [], // SB flat-caller nesten aldri i moderne teori (kun 3-bet/fold)
    "BB":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "76s", "AJo+", "KQo", "KJo+"]
};

// Oppdatert med tung 3-betting med A2s-A5s som bløffer/semi-bløffer
const THREE_BET_RANGES = {
    "UTG1": ["QQ+", "AKs", "AKo"],
    "UTG2": ["QQ+", "AKs", "AKo", "A5s"],
    "LJ":   ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
    "HJ":   ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
    "CO":   ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s"],
    "BTN":  ["QQ+", "AKs", "AQs", "AJs", "AKo", "A5s-A2s"],
    "SB":   ["99+", "AJs+", "KQs", "AQo+", "A5s-A4s"], 
    "BB":   ["JJ+", "AQs+", "AKo", "A5s-A2s"] 
};

// === 2. APP-TILSTAND ===
let state = {
    currentPosIdx: 0,
    villainPosIdx: -1, 
    hand: [],
    handStr: "",
    isSuited: false,
    score: 0,
    streak: 0,
    expanded: {
        rfi: {},
        call: {},
        threeBet: {}
    }
};

// === 3. MOTOR FOR RANGE-TOLKNING & FEEDBACK ===

function log(msg) { console.log(`[POKER-LOG] ${msg}`); }

// Analyserer håndkategori for pedagogisk feedback
function getHandCategory(handStr) {
    if (["AA", "KK", "QQ", "JJ"].includes(handStr)) return "PREMIUM_PAIR";
    if (["AKs", "AKo", "AQs", "AQo"].includes(handStr)) return "PREMIUM_BROADWAY";
    if (handStr.length === 2 && handStr[0] === handStr[1]) return "POCKET_PAIR";
    if (["A5s", "A4s", "A3s", "A2s"].includes(handStr)) return "SUITED_WHEEL_ACE";
    
    const v1 = VALUES.indexOf(handStr[0]);
    const v2 = VALUES.indexOf(handStr[1]);
    const isSuited = handStr.endsWith('s');
    
    if (isSuited && v1 <= 4 && v2 <= 4) return "SUITED_BROADWAY"; 
    if (isSuited && Math.abs(v1 - v2) === 1) return "SUITED_CONNECTOR";
    if (!isSuited && (v1 > 4 || v2 > 4)) return "OFFSUIT_WEAK";
    
    return "GENERAL";
}

function getCategoryExplanation(category) {
    switch(category) {
        case "SUITED_WHEEL_ACE":
            return "Moderne GTO elsker Suited Wheel Aces (A2s-A5s). De blokkerer sterke ess (AA/AK), kan treffe nut-flush, og kan lage straight (wheel connectivity) på lave bord. Perfekt for aggressive åpninger og 3-bet bløffer.";
        case "PREMIUM_PAIR":
            return "Premium lommepar. Disse skal spilles aggressivt for å bygge pott og hente maksimal verdi mens du (sannsynligvis) er foran.";
        case "POCKET_PAIR":
            return "Lommepar spilles for 'set-mining' (håpe på å treffe tre like). Fra tidlig posisjon kaster vi de laveste, men fra sen posisjon er nesten alle par sterke nok til å åpne.";
        case "SUITED_CONNECTOR":
            return "Suited connectors (som 98s, 87s) spiller utrolig bra postflop. De realiserer equity bra fordi de ofte treffer sterke trekk (straights og flusher).";
        case "PREMIUM_BROADWAY":
            return "Sterke broadway-hender. De dominerer motstandernes svakere ess og konger, og tjener mye penger på å treffe sterke topp-par.";
        case "OFFSUIT_WEAK":
            return "Offsuit hender er vanskelige å spille. De treffer sjeldnere bra postflop og mangler flush-potensialet som gjør suitede hender profitable.";
        default:
            return "Suited hender foretrekkes generelt over offsuit på grunn av mye bedre 'spillbarhet' postflop. Posisjon avgjør hvor bredt vi kan spille dem.";
    }
}

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
                let idx1 = VALUES.indexOf(c1);
                let idx2 = VALUES.indexOf(c2);
                for (let i = idx1 + 1; i <= idx2; i++) hands.add(c1 + VALUES[i] + type);
            }
        } else if (item.includes('-')) { 
            let parts = item.split('-');
            let base1 = parts[0], base2 = parts[1];
            let c1 = base1[0], type = base1[2];
            let idx1 = VALUES.indexOf(base1[1]);
            let idx2 = VALUES.indexOf(base2[1]);
            let start = Math.min(idx1, idx2);
            let end = Math.max(idx1, idx2);
            for (let i = start; i <= end; i++) hands.add(c1 + VALUES[i] + type);
        } else {
            hands.add(item);
        }
    });

    if(!rangeArr.includes("ANY") && rangeArr.length > 0) {
        hands.add("AA"); hands.add("KK"); 
        if(rangeArr !== CALL_RANGES["SB"]) hands.add("AKs"); 
    }
    return hands;
}

function initializeRanges() {
    log("Kalkulerer og utvider alle ranges...");
    for (let pos in RFI_RANGES) state.expanded.rfi[pos] = expandRangeConfig(RFI_RANGES[pos]);
    for (let pos in CALL_RANGES) state.expanded.call[pos] = expandRangeConfig(CALL_RANGES[pos]);
    for (let pos in THREE_BET_RANGES) state.expanded.threeBet[pos] = expandRangeConfig(THREE_BET_RANGES[pos]);
}

// === 4. SPILLELOGIKK ===

function dealNewHand() {
    const mode = document.getElementById('mode-selector').value;
    log(`Deler ut ny hånd. Modus: ${mode}`);
    
    if (mode === "FACING_RAISE") {
        state.currentPosIdx = Math.floor(Math.random() * (POSITIONS.length - 1)) + 1; 
        state.villainPosIdx = Math.floor(Math.random() * state.currentPosIdx);
    } else {
        state.currentPosIdx = Math.floor(Math.random() * POSITIONS.length);
        state.villainPosIdx = -1;
    }

    const pos = POSITIONS[state.currentPosIdx];

    let c1v = Math.floor(Math.random() * 13), c1s = Math.floor(Math.random() * 4);
    let c2v = Math.floor(Math.random() * 13), c2s = Math.floor(Math.random() * 4);

    while (c1v === c2v && c1s === c2s) {
        c2v = Math.floor(Math.random() * 13);
        c2s = Math.floor(Math.random() * 4);
    }

    state.hand = [
        { v: VALUES[c1v], s: SUITS[c1s], idx: c1v },
        { v: VALUES[c2v], s: SUITS[c2s], idx: c2v }
    ];
    state.isSuited = c1s === c2s;
    state.hand.sort((a, b) => a.idx - b.idx);
    
    if (state.hand[0].v === state.hand[1].v) state.handStr = state.hand[0].v + state.hand[1].v;
    else state.handStr = state.hand[0].v + state.hand[1].v + (state.isSuited ? "s" : "o");

    updateUI();
}

function checkAction(userAction) {
    const pos = POSITIONS[state.currentPosIdx];
    const mode = document.getElementById('mode-selector').value;
    const category = getHandCategory(state.handStr);
    const categoryExplanation = getCategoryExplanation(category);
    
    let isCorrect = false;
    let title = "", text = "", statusClass = "";

    if (mode === "RFI") {
        if (pos === "BB") {
            if (userAction === "CALL") { isCorrect = true; text = "Du får en Walk og vinner potten gratis."; }
            else { text = "Handlingen er over. Du vinner potten automatisk (Walk)."; }
        } else if (pos === "SB") {
            const isRaise = state.expanded.rfi["SB_RAISE"].has(state.handStr);
            const isLimp = state.expanded.rfi["SB_LIMP"].has(state.handStr);
            if (userAction === "RAISE") { isCorrect = isRaise; text = isCorrect ? `Riktig raise. ${categoryExplanation}` : `Feil. Hånden er for svak til å raise her.`; }
            else if (userAction === "CALL") { isCorrect = isLimp; text = isCorrect ? `Godkjent limp (complete). ${categoryExplanation}` : `Feil. For svakt selv for en limp.`; }
            else { isCorrect = (!isRaise && !isLimp); text = isCorrect ? `Riktig fold. ${categoryExplanation}` : `Feil, denne er for sterk til å kastes fra SB!`; }
        } else {
            const isRaise = state.expanded.rfi[pos].has(state.handStr);
            if (userAction === "CALL") { text = "Du skal ALDRI limpe utenfor SB!"; }
            else if (userAction === "RAISE") { 
                isCorrect = isRaise; 
                text = isCorrect ? `Riktig standard åpning. ${categoryExplanation}` : `For aggressivt! Denne kastes fra ${pos}.`; 
            }
            else { 
                isCorrect = !isRaise; 
                text = isCorrect ? `Godt kast. ${categoryExplanation}` : `Feil! GTO sier Raise. ${categoryExplanation}`; 
            }
        }
    } else {
        const is3Bet = state.expanded.threeBet[pos].has(state.handStr);
        const isCall = state.expanded.call[pos].has(state.handStr);

        if (userAction === "RAISE") {
            isCorrect = is3Bet;
            text = isCorrect ? `Solid 3-Bet! ${categoryExplanation}` : `Overspill. Du bør ikke 3-bette denne fra ${pos}.`;
        } else if (userAction === "CALL") {
            if (pos === "SB") {
                text = "Feil. Fra SB spiller moderne GTO nesten utelukkende 3-bet eller fold.";
            } else {
                isCorrect = isCall;
                text = isCorrect ? `Godt forsvar (flat-call). ${categoryExplanation}` : (is3Bet ? `Feil! Denne er så sterk at den MÅ 3-bettes. ${categoryExplanation}` : `Feil, hånden er for svak til å syne.`);
            }
        } else { 
            isCorrect = (!is3Bet && !isCall);
            text = isCorrect ? `Disiplinert kast. ${categoryExplanation}` : `Feil! Denne hånden er for sterk til å kastes. ${categoryExplanation}`;
        }
    }

    statusClass = isCorrect ? "correct" : "wrong";
    if(!title) title = isCorrect ? "RIKTIG!" : "FEIL!";

    if (isCorrect) {
        state.score += 10;
        state.streak += 1;
    } else {
        state.streak = 0;
        if (document.getElementById('auto-range-toggle').checked) {
            setTimeout(() => openModal(true), 600); 
        }
    }
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('streak-display').textContent = state.streak;

    displayFeedback(title, text, statusClass);
}

// === 5. UI OPPTEGNING ===

function updateUI() {
    const pos = POSITIONS[state.currentPosIdx];
    const mode = document.getElementById('mode-selector').value;
    
    document.getElementById('current-pos-display').textContent = pos;
    document.getElementById('range-pos-label').textContent = pos;
    
    if (mode === "FACING_RAISE") {
        const vilPos = POSITIONS[state.villainPosIdx];
        document.getElementById('scenario-display').textContent = `Møter en Raise fra ${vilPos}`;
        document.getElementById('btn-call').textContent = "CALL (FLAT)";
        document.getElementById('btn-raise').textContent = "RAISE (3-BET)";
    } else {
        document.getElementById('scenario-display').textContent = "Åpen Pott (Ingen har høynet)";
        document.getElementById('btn-call').textContent = "LIMP / CHECK";
        document.getElementById('btn-raise').textContent = "RAISE (RFI)";
    }

    document.querySelectorAll('.seat').forEach(s => {
        s.classList.remove('active-hero');
        s.classList.remove('active-villain');
    });
    
    document.getElementById("seat-" + pos.toLowerCase()).classList.add('active-hero');
    if (mode === "FACING_RAISE") {
        document.getElementById("seat-" + POSITIONS[state.villainPosIdx].toLowerCase()).classList.add('active-villain');
    }

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

// === 6. RANGE MATRISE (MODAL) ===

function buildMatrix(highlightError = false) {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';
    const pos = POSITIONS[state.currentPosIdx];
    const mode = document.getElementById('mode-selector').value;
    
    document.getElementById('modal-pos-title').textContent = pos;

    let redRange, blueRange;
    if (mode === "FACING_RAISE") {
        redRange = state.expanded.threeBet[pos] || new Set();
        blueRange = state.expanded.call[pos] || new Set();
    } else {
        redRange = pos === "SB" ? state.expanded.rfi["SB_RAISE"] : (pos === "BB" ? new Set(["ANY"]) : state.expanded.rfi[pos]);
        blueRange = pos === "SB" ? state.expanded.rfi["SB_LIMP"] : new Set();
    }

    for (let r = 0; r < 13; r++) {
        for (let c = 0; c < 13; c++) {
            const cell = document.createElement('div');
            let handName = "";

            if (r === c) handName = VALUES[r] + VALUES[c]; 
            else if (c > r) handName = VALUES[r] + VALUES[c] + "s"; 
            else handName = VALUES[c] + VALUES[r] + "o"; 

            cell.textContent = handName;
            cell.className = 'matrix-cell';

            if (redRange === "ANY" || (redRange.has && redRange.has(handName))) {
                cell.classList.add('raise');
            } else if (blueRange.has && blueRange.has(handName)) {
                cell.classList.add('call');
            }

            if (highlightError && handName === state.handStr) {
                cell.classList.add('highlight-hand');
            }

            container.appendChild(cell);
        }
    }
}

function openModal(isError = false) {
    buildMatrix(isError);
    document.getElementById('range-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('range-modal').classList.add('hidden');
}

// === 7. INITIALISERING ===

document.addEventListener('DOMContentLoaded', () => {
    initializeRanges();
    
    document.getElementById('btn-fold').addEventListener('click', () => checkAction('FOLD'));
    document.getElementById('btn-call').addEventListener('click', () => checkAction('CALL'));
    document.getElementById('btn-raise').addEventListener('click', () => checkAction('RAISE'));
    document.getElementById('btn-next').addEventListener('click', dealNewHand);
    
    document.getElementById('btn-show-range').addEventListener('click', () => openModal(false));
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('mode-selector').addEventListener('change', dealNewHand);
    
    document.getElementById('range-modal').addEventListener('click', (e) => {
        if (e.target.id === 'range-modal') closeModal();
    });

    dealNewHand();
});

/* Version: #13 */
