/* Version: #9 */

// === 1. KONFIGURASJON OG DATA ===

const POSITIONS = ["UTG", "UTG1", "UTG2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const VALUES = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
];

// GTO RFI Ranges (40BB) - Bruker standard pluss-notasjon
const RANGES = {
    "UTG":  ["77+", "ATs+", "KQs", "QJs", "JTs", "AQo+"],
    "UTG1": ["66+", "A9s+", "KJs+", "QJs", "JTs", "AQo+"],
    "UTG2": ["55+", "A8s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+"],
    "LJ":   ["44+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
    "HJ":   ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "ATo+", "KJo+", "KQo"],
    "CO":   ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "97s+", "87s", "76s", "ATo+", "KTo+", "QJo"],
    "BTN":  ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "54s+", "A2o+", "K9o+", "Q9o+", "J9o+", "T9o+"],
    
    // SB har en delt strategi (Raise med sterk range, Limp med bredere range)
    "SB_RAISE": ["55+", "A8s+", "KJs+", "QJs", "AJo+", "KQo"],
    "SB_LIMP":  ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "95s+", "84s+", "74s+", "63s+", "53s+", "43s+", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o+"],
    
    // BB får en "Walk" i en uåpnet pott. Alt er en sjekk/seier.
    "BB": ["ANY"] 
};

// === 2. APP-TILSTAND ===
let state = {
    currentPosIdx: 0,
    hand: [],
    handStr: "",
    isSuited: false,
    expandedRanges: {} // Cacher de kalkulerte rangene
};

// === 3. MOTOR FOR RANGE-TOLKNING ===

function log(msg) { console.log(`[POKER-LOG] ${msg}`); }

// Utvider "A9s+" til ["AKs", "AQs", "AJs", "ATs", "A9s"]
function expandRangeConfig(rangeArr) {
    if (rangeArr.includes("ANY")) return "ANY";
    let hands = new Set();
    
    rangeArr.forEach(item => {
        if (item.endsWith('+')) {
            let base = item.slice(0, -1);
            if (base.length === 2) { // Par, f.eks. "77+"
                let valIdx = VALUES.indexOf(base[0]);
                for (let i = 0; i <= valIdx; i++) hands.add(VALUES[i] + VALUES[i]);
            } else { // Suited/Offsuit, f.eks. "ATs+"
                let c1 = base[0], c2 = base[1], type = base[2];
                let idx1 = VALUES.indexOf(c1);
                let idx2 = VALUES.indexOf(c2);
                for (let i = idx1 + 1; i <= idx2; i++) {
                    hands.add(c1 + VALUES[i] + type);
                }
            }
        } else {
            hands.add(item); // Enkelt-hender som "KQs"
        }
    });

    // Premium-garanti
    hands.add("AA"); hands.add("KK"); hands.add("QQ"); hands.add("AKs");
    return hands;
}

// Pre-kalkuler alle ranges ved oppstart for rask oppslag
function initializeRanges() {
    log("Kalkulerer og utvider GTO ranges...");
    for (let pos in RANGES) {
        state.expandedRanges[pos] = expandRangeConfig(RANGES[pos]);
    }
}

// === 4. SPILLELOGIKK ===

function dealNewHand() {
    log("Deler ut ny hånd...");
    
    // Roter posisjon tilfeldig
    state.currentPosIdx = Math.floor(Math.random() * POSITIONS.length);
    const pos = POSITIONS[state.currentPosIdx];

    // Generer unike kort (1-13 konverteres til index 0-12)
    let c1v = Math.floor(Math.random() * 13);
    let c1s = Math.floor(Math.random() * 4);
    let c2v = Math.floor(Math.random() * 13);
    let c2s = Math.floor(Math.random() * 4);

    while (c1v === c2v && c1s === c2s) {
        c2v = Math.floor(Math.random() * 13);
        c2s = Math.floor(Math.random() * 4);
    }

    state.hand = [
        { v: VALUES[c1v], s: SUITS[c1s], idx: c1v },
        { v: VALUES[c2v], s: SUITS[c2s], idx: c2v }
    ];
    state.isSuited = c1s === c2s;

    // Sorter slik at høyeste kort (lavest index i VALUES) kommer først
    state.hand.sort((a, b) => a.idx - b.idx);
    
    const hHigh = state.hand[0].v;
    const hLow = state.hand[1].v;

    if (hHigh === hLow) {
        state.handStr = hHigh + hLow;
    } else {
        state.handStr = hHigh + hLow + (state.isSuited ? "s" : "o");
    }

    updateUI(pos);
    log(`Ny posisjon: ${pos}, Hånd: ${state.handStr}`);
}

function checkAction(userAction) {
    const pos = POSITIONS[state.currentPosIdx];
    let title = "", text = "", statusClass = "";

    // SPESIALHÅNDTERING: Big Blind
    if (pos === "BB") {
        if (userAction === "LIMP") {
            title = "RIKTIG!"; statusClass = "correct";
            text = "Godt observert. Siden alle foran deg har kastet, får du en 'Walk' (du vinner potten gratis). Her 'sjekker' du bare for å ta sjetongene.";
        } else {
            title = "UNØDVENDIG"; statusClass = "wrong";
            text = "Husk situasjonen: Alle frem til Big Blind har kastet. Handlingen er over, og du vinner potten (walk). Du trenger verken folde eller raise.";
        }
    } 
    // SPESIALHÅNDTERING: Small Blind
    else if (pos === "SB") {
        const isRaise = state.expandedRanges["SB_RAISE"].has(state.handStr);
        const isLimp = state.expandedRanges["SB_LIMP"].has(state.handStr);

        if (userAction === "RAISE") {
            if (isRaise) { title = "RIKTIG!"; statusClass = "correct"; text = `${state.handStr} er sterk nok til å open-raise fra SB for å presse BB.`; }
            else { title = "FEIL!"; statusClass = "wrong"; text = `${state.handStr} er for svakt til å raise. Vurder limp (complete) eller fold i stedet.`; }
        } else if (userAction === "LIMP") {
            if (isRaise) { title = "MARGINALT"; statusClass = "marginal"; text = `Du kan limpe, men med ${state.handStr} er det bedre å raise for verdi.`; }
            else if (isLimp) { title = "RIKTIG!"; statusClass = "correct"; text = `Å limpe (complete) med ${state.handStr} er standard GTO-spill fra SB mot BB.`; }
            else { title = "FEIL!"; statusClass = "wrong"; text = `${state.handStr} er for svakt selv til å limpe. Fold!`; }
        } else { // FOLD
            if (!isLimp && !isRaise) { title = "RIKTIG!"; statusClass = "correct"; text = `Bra kast! ${state.handStr} er søppel.`; }
            else { title = "FOR TIGHT"; statusClass = "wrong"; text = `SB gir deg gode odds for å i det minste limpe (complete) med ${state.handStr}.`; }
        }
    } 
    // STANDARD: UTG til BTN
    else {
        const isRaise = state.expandedRanges[pos].has(state.handStr);
        
        if (userAction === "LIMP") {
            title = "FEIL!"; statusClass = "wrong"; text = "Limping er et amatørtrekk i uåpnede potter utenfor blindene. Alltid Raise eller Fold!";
        } else if (userAction === "RAISE") {
            if (isRaise) { title = "RIKTIG!"; statusClass = "correct"; text = `${state.handStr} er en profitabel åpning fra ${pos}.`; }
            else { title = "FOR AGGRESSIVT"; statusClass = "marginal"; text = `${state.handStr} kastes normalt fra ${pos}.`; }
        } else { // FOLD
            if (!isRaise) { title = "RIKTIG!"; statusClass = "correct"; text = `Disiplinert. ${state.handStr} hører hjemme i mucken herfra.`; }
            else { title = "FOR TIGHT"; statusClass = "wrong"; text = `GTO sier Raise! ${state.handStr} er altfor sterk til å kastes fra ${pos}.`; }
        }
    }

    displayFeedback(title, text, statusClass);
}

// === 5. UI OPPTEGNING ===

function updateUI(pos) {
    document.getElementById('current-pos-display').textContent = pos;
    document.getElementById('range-pos-label').textContent = pos;
    
    // Oppdater visuelle seter
    document.querySelectorAll('.seat').forEach(s => s.classList.remove('active-hero'));
    const seatId = "seat-" + pos.toLowerCase();
    const activeSeat = document.getElementById(seatId);
    if(activeSeat) activeSeat.classList.add('active-hero');

    // Tegn kort
    const cc = document.getElementById('hole-cards');
    cc.innerHTML = '';
    state.hand.forEach(c => {
        const div = document.createElement('div');
        div.className = `card ${c.s.color}`;
        div.innerHTML = `<span>${c.v}</span><span style="font-size: 0.6em; margin-top: 5px;">${c.s.symbol}</span>`;
        cc.appendChild(div);
    });

    // Skjul feedback panel og reaktiver knapper
    document.getElementById('feedback-section').classList.add('hidden');
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = false);
}

function displayFeedback(title, text, statusClass) {
    const panel = document.getElementById('feedback-section');
    panel.className = statusClass; // Resetter hidden og legger til farge
    
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-text').textContent = text;
    
    // Deaktiver handlingsknapper mens vi ser på svaret
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
    
    // Scroll ned på mobil
    panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// === 6. RANGE MATRISE (MODAL) ===

function buildMatrix() {
    log("Bygger 13x13 Range Matrise GUI...");
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';

    const pos = POSITIONS[state.currentPosIdx];
    document.getElementById('modal-pos-title').textContent = pos;

    let raiseRange = pos === "SB" ? state.expandedRanges["SB_RAISE"] : (pos === "BB" ? "ANY" : state.expandedRanges[pos]);
    let limpRange = pos === "SB" ? state.expandedRanges["SB_LIMP"] : new Set();

    for (let r = 0; r < 13; r++) {
        for (let c = 0; c < 13; c++) {
            const cell = document.createElement('div');
            let handName = "";

            if (r === c) {
                handName = VALUES[r] + VALUES[c]; // Par
            } else if (c > r) {
                handName = VALUES[r] + VALUES[c] + "s"; // Suited
            } else {
                handName = VALUES[c] + VALUES[r] + "o"; // Offsuit
            }

            cell.textContent = handName;
            cell.className = 'matrix-cell';

            if (pos === "BB") {
                cell.classList.add('limp'); // Alt er Walk
            } else if (raiseRange.has(handName)) {
                cell.classList.add('raise');
            } else if (limpRange.has(handName)) {
                cell.classList.add('limp');
            }

            container.appendChild(cell);
        }
    }
}

function openModal() {
    buildMatrix();
    document.getElementById('range-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('range-modal').classList.add('hidden');
}

// === 7. INITIALISERING ===

document.addEventListener('DOMContentLoaded', () => {
    initializeRanges();
    
    // Event Listeners - Handlinger
    document.getElementById('btn-fold').addEventListener('click', () => checkAction('FOLD'));
    document.getElementById('btn-call').addEventListener('click', () => checkAction('LIMP'));
    document.getElementById('btn-raise').addEventListener('click', () => checkAction('RAISE'));
    document.getElementById('btn-next').addEventListener('click', dealNewHand);
    
    // Event Listeners - Modal
    document.getElementById('btn-show-range').addEventListener('click', openModal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // Lukk modal hvis man trykker utenfor vinduet
    document.getElementById('range-modal').addEventListener('click', (e) => {
        if (e.target.id === 'range-modal') closeModal();
    });

    dealNewHand();
});

/* Version: #9 */
