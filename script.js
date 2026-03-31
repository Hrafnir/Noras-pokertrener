/* Version: #8 */

:root {
    --poker-green: radial-gradient(circle, #2e7d32 0%, #1b5e20 100%);
    --table-border: #3e2723;
    --gold: #ffc107;
    --bg-dark: #121212;
    --panel-bg: #1e1e1e;
    --raise-color: #d32f2f;
    --fold-color: #333333;
    --call-color: #1976d2;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background-color: var(--bg-dark);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    justify-content: center;
    min-height: 100vh;
}

#app-container {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    padding: 15px;
}

/* === HEADER === */
header {
    text-align: center;
    margin-bottom: 20px;
}

header h1 {
    font-size: 1.5rem;
    color: var(--gold);
    margin-bottom: 10px;
}

.secondary-btn {
    background: #444;
    color: white;
    border: 1px solid #666;
    padding: 8px 16px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
}

.secondary-btn:hover { background: #555; }

/* === POKERBORDET === */
#game-area {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
}

#poker-table {
    width: 85%;
    height: 75%;
    background: var(--poker-green);
    border: 12px solid var(--table-border);
    border-radius: 200px;
    position: absolute;
    box-shadow: 0 15px 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.5);
}

/* Seteplassering (9 plasser - Clockwise) */
.seat {
    position: absolute;
    width: clamp(45px, 10vw, 60px);
    height: clamp(45px, 10vw, 60px);
    background: #212121;
    border: 2px solid #555;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: clamp(0.6rem, 2vw, 0.8rem);
    font-weight: bold;
    z-index: 10;
    transition: all 0.3s ease;
}

#seat-bb   { top: 25%; left: 5%; }
#seat-utg  { top: 8%; left: 25%; }
#seat-utg1 { top: 3%; left: 50%; transform: translateX(-50%); }
#seat-utg2 { top: 8%; right: 25%; }
#seat-lj   { top: 35%; right: 3%; }
#seat-hj   { bottom: 20%; right: 15%; }
#seat-co   { bottom: 5%; left: 50%; transform: translateX(-50%); }
#seat-btn  { bottom: 20%; left: 15%; }
#seat-sb   { top: 60%; left: 3%; }

.seat.active-hero {
    border-color: var(--gold);
    box-shadow: 0 0 20px var(--gold);
    background: #333;
    transform: scale(1.15);
}

/* Kort og Senter-info */
#center-info {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 5;
}

#current-pos-display {
    color: var(--gold);
    font-weight: bold;
    font-size: 1.2rem;
    margin-bottom: 10px;
    letter-spacing: 1px;
}

#hole-cards {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.card {
    width: clamp(55px, 12vw, 75px);
    aspect-ratio: 2.5 / 3.5;
    background: white;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-size: clamp(1.2rem, 4vw, 1.8rem);
    font-weight: bold;
    box-shadow: 2px 5px 10px rgba(0,0,0,0.6);
}

.card.red { color: var(--raise-color); }
.card.black { color: #111; }

/* === KONTROLLER & INTEGRERT FEEDBACK === */
#controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 15px;
}

.action-btn {
    padding: 15px 5px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: clamp(0.8rem, 3vw, 1rem);
    cursor: pointer;
    color: white;
    transition: transform 0.1s, opacity 0.2s;
}

.action-btn:active { transform: scale(0.95); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.fold-btn { background: #555; }
.call-btn { background: var(--call-color); }
.raise-btn { background: #e64a19; }

#feedback-section {
    background: var(--panel-bg);
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    border-top: 4px solid transparent;
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

#feedback-section.correct { border-top-color: #4caf50; }
#feedback-section.wrong { border-top-color: #f44336; }
#feedback-section.marginal { border-top-color: #ff9800; }

#feedback-title { margin-bottom: 10px; font-size: 1.2rem; }
#feedback-text { margin-bottom: 20px; line-height: 1.4; color: #ddd; }

.next-btn {
    width: 100%;
    padding: 15px;
    background: white;
    color: black;
    font-weight: bold;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}

/* === RANGE MATRISE MODAL (13x13 Grid) === */
#range-modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 15px;
}

.modal-content {
    background: var(--panel-bg);
    width: 100%;
    max-width: 550px;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.9);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
}

#close-modal {
    background: none;
    border: none;
    color: white;
    font-size: 2rem;
    cursor: pointer;
    line-height: 1;
}

/* Selve rutenettet */
#matrix-container {
    display: grid;
    grid-template-columns: repeat(13, 1fr);
    gap: 2px;
    width: 100%;
    aspect-ratio: 1;
    margin-bottom: 15px;
}

.matrix-cell {
    background: var(--fold-color);
    color: #888;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: clamp(0.5rem, 1.5vw, 0.75rem);
    font-weight: bold;
    border-radius: 2px;
    user-select: none;
}

.matrix-cell.raise { background: var(--raise-color); color: white; }
.matrix-cell.limp { background: var(--call-color); color: white; } /* For SB/BB logikk senere */

.legend {
    display: flex;
    justify-content: center;
    gap: 20px;
    font-size: 0.9rem;
}

.legend-item { display: flex; align-items: center; gap: 5px; }
.color-box { width: 15px; height: 15px; border-radius: 3px; }
.raise-color { background: var(--raise-color); }
.fold-color { background: var(--fold-color); border: 1px solid #555; }

.hidden { display: none !important; }

/* Version: #8 */
