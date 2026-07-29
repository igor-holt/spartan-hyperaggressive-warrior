// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTX — SPARTAN HYPERAGGRESSIVE WARRIOR COMBAT MODULE v2.0
// OnlyBuilds.ai Tank Arena | Blackhorse-ʞGraph Authorized | ErosGenesis-Integrated
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Doctrine: "Calorie versus footed soldiers" — maximum energy density per action.
// Every frame is a kill window. No defensive posture. Only forward pressure.
//
// Binding: conv_a1b2c3d4e5f6g7h8i9j0
// Deployment: Browser console | Kimi WebBridge | OpenClaw | ErosGenesis Arena
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─── CONFIGURATION: SPARTAN MODE ───
    const SPARTAN = {
        // Aggression Constants
        FIRE_COOLDOWN_MS: 145,        // Tuned for max ROF without jam
        PREDICTION_LEAD: 1.22,        // Projectile lead multiplier
        AGGRESSION_ZONE: 0.68,        // % of arena width to push forward
        MIN_AIM_ANGLE: 3.5,           // Degrees — snap threshold

        // Geometry Exploitation
        RIVER_EDGE_BUFFER: 40,        // Pixels from river bank for optimal arc
        CORNER_TRAP_ANGLE: 22.5,      // Degrees to force rival into corner
        WALL_HUG_BUFFER: 25,          // Avoid self-trapping

        // Thermodynamic Governance (Blackhorse-ʞGraph)
        HEAT_LIMIT: 85,               // Action heat before forced cooldown
        HEAT_DECAY_PER_FRAME: 2.3,    // Heat dissipation rate
        OVERDRIVE_THRESHOLD: 70,        // % heat to trigger overdrive protocols
        OVERDRIVE_ROF_MULT: 0.72,     // Faster fire under overdrive

        // Yennefer Agentic Node Integration
        TELEMETRY_ENDPOINT: 'https://telemetry.genesisconductor.io/v1/battle',
        AGENT_ID: 'InvariantX-Spartan-02',
        TELEMETRY_BATCH_MS: 800,      // Telemetry flush interval

        // GLASS_BREAK Failsafe
        EMERGENCY_RETREAT_HP: 15,     // % HP to trigger tactical reposition
        PANIC_SHIELD_MS: 400,         // Invulnerability window on low HP
        RETREAT_DURATION_FRAMES: 45,  // Frames to reposition

        // ErosGenesis Arena Integration
        EG_API: 'https://erosgenesis-api.YOUR_SUBDOMAIN.workers.dev',
        EG_ENABLED: false,            // Set true to sync with ErosGenesis QFOP
        CHARACTER_SEED: null,         // Inject ErosGenesis character JSON for stat derivation
    };

    // ─── STATE MACHINE: WARRIOR PHASES ───
    const PHASE = {
        INIT: 0,          // Arena scan, rival identification
        PRESS: 1,         // Forward aggression, river bank control
        DUEL: 2,          // Line-of-sight engagement, predictive fire
        EXECUTE: 3,       // Corner trap, finishing sequence
        OVERDRIVE: 4,     // Heat maxed, berserker mode engaged
        RETREAT: 5        // GLASS_BREAK — forced reposition
    };

    let state = {
        phase: PHASE.INIT,
        heat: 0,
        lastShot: 0,
        rivalLastPos: null,
        rivalVelocity: {x: 0, y: 0},
        myPos: null,
        myHP: 100,
        myMaxHP: 100,
        rivalHP: 100,
        arena: {width: 0, height: 0, riverY: 0},
        frameCount: 0,
        kills: 0,
        damageDealt: 0,
        shotsFired: 0,
        shotsHit: 0,
        retreatFrames: 0,
        telemetryQueue: [],
        matchStart: Date.now(),
        egStats: null,   // ErosGenesis-derived combat stats
    };

    // ─── EROS GENESIS STAT DERIVATION ───
    async function deriveEGStats(charData) {
        if (!charData) return null;
        const src = JSON.stringify({
            n: charData.name, p: charData.personality, b: charData.background, s: charData.secret,
        });
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
        const b = new Uint8Array(buf);
        const stat = (i) => 8 + (b[i] % 11);
        return {
            might:   stat(0),   // Damage multiplier
            cunning: stat(4),   // Prediction accuracy
            resolve: stat(8),   // HP buffer
            arcana:  stat(12),  // Overdrive duration
            hp: 40 + stat(8) * 4,
        };
    }

    // ─── VECTOR MATH: BALLISTIC CALCULUS ───
    const V = {
        add: (a, b) => ({x: a.x + b.x, y: a.y + b.y}),
        sub: (a, b) => ({x: a.x - b.x, y: a.y - b.y}),
        mul: (v, s) => ({x: v.x * s, y: v.y * s}),
        mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
        norm: (v) => { const m = V.mag(v); return m > 0 ? {x: v.x/m, y: v.y/m} : {x:0, y:0}; },
        dist: (a, b) => V.mag(V.sub(a, b)),
        angle: (v) => Math.atan2(v.y, v.x) * (180 / Math.PI),
        fromAngle: (deg) => ({x: Math.cos(deg * Math.PI/180), y: Math.sin(deg * Math.PI/180)}),
        lerp: (a, b, t) => ({x: a.x + (b.x - a.x)*t, y: a.y + (b.y - a.y)*t}),
    };

    // ─── CANVAS SURVEILLANCE: TANK DETECTION ENGINE ───
    function detectTanks() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        state.arena.width = w;
        state.arena.height = h;
        state.arena.riverY = h * 0.5;

        // Readback pixel analysis for tank detection
        // Most tank games render colored bodies — scan for player-colored pixels
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const clusters = [];
        const visited = new Uint8Array(w * h);
        const stride = 4;

        // Color signatures (tune per game — green = player, red = enemy typical)
        const isPlayerColor = (r, g, b) => g > 120 && r < 100 && b < 100;
        const isEnemyColor  = (r, g, b) => r > 120 && g < 100 && b < 100;
        const isTankBody    = (r, g, b) => (isPlayerColor(r,g,b) || isEnemyColor(r,g,b)) && (r+g+b > 60);

        function floodFill(sx, sy, label) {
            const stack = [[sx, sy]];
            let sumX = 0, sumY = 0, count = 0;
            while (stack.length) {
                const [x, y] = stack.pop();
                const idx = (y * w + x);
                if (visited[idx]) continue;
                visited[idx] = 1;
                const px = idx * stride;
                if (!isTankBody(data[px], data[px+1], data[px+2])) continue;
                sumX += x; sumY += y; count++;
                if (x > 0) stack.push([x-1, y]);
                if (x < w-1) stack.push([x+1, y]);
                if (y > 0) stack.push([x, y-1]);
                if (y < h-1) stack.push([x, y+1]);
            }
            if (count > 30) { // Minimum tank pixel mass
                clusters.push({x: sumX/count, y: sumY/count, mass: count, label});
            }
        }

        // Sparse scan for performance
        for (let y = 10; y < h; y += 6) {
            for (let x = 10; x < w; x += 6) {
                const idx = (y * w + x);
                if (visited[idx]) continue;
                const px = idx * stride;
                if (isTankBody(data[px], data[px+1], data[px+2])) {
                    const label = isPlayerColor(data[px], data[px+1], data[px+2]) ? 'player' : 'enemy';
                    floodFill(x, y, label);
                }
            }
        }

        // Assign positions
        const player = clusters.find(c => c.label === 'player');
        const enemy  = clusters.find(c => c.label === 'enemy');

        // Velocity tracking
        if (enemy && state.rivalLastPos) {
            state.rivalVelocity = {
                x: enemy.x - state.rivalLastPos.x,
                y: enemy.y - state.rivalLastPos.y
            };
        }
        if (enemy) state.rivalLastPos = {x: enemy.x, y: enemy.y};
        if (player) state.myPos = {x: player.x, y: player.y};

        return {player, enemy, clusters};
    }

    // ─── PREDICTIVE FIRE CONTROL ───
    function calculateLead(myPos, rivalPos, rivalVel, projectileSpeed = 12) {
        const dist = V.dist(myPos, rivalPos);
        const timeToImpact = dist / projectileSpeed;

        // Extrapolate rival position with velocity smoothing
        const smoothedVel = V.mul(rivalVel, 0.85); // Dampen jitter
        const predictedPos = V.add(rivalPos, V.mul(smoothedVel, timeToImpact * SPARTAN.PREDICTION_LEAD));

        // River arc compensation
        const riverCompensation = {x: 0, y: -6};
        const aimPoint = V.add(predictedPos, riverCompensation);

        // Clamp to arena bounds
        aimPoint.x = Math.max(10, Math.min(state.arena.width - 10, aimPoint.x));
        aimPoint.y = Math.max(10, Math.min(state.arena.height - 10, aimPoint.y));

        return aimPoint;
    }

    // ─── AGGRESSION GEOMETRY: CORNER TRAP ───
    function calculateCornerTrap(myPos, rivalPos) {
        const arena = state.arena;
        const mySide = myPos.y < arena.riverY ? 'top' : 'bottom';
        const rivalSide = rivalPos.y < arena.riverY ? 'top' : 'bottom';

        if (mySide === rivalSide) {
            const targetCorner = {
                x: rivalPos.x < arena.width / 2 ? 35 : arena.width - 35,
                y: rivalSide === 'top' ? 35 : arena.height - 35
            };
            return {
                moveTo: {
                    x: rivalPos.x + (rivalPos.x < arena.width/2 ? 55 : -55),
                    y: rivalPos.y + (rivalSide === 'top' ? 35 : -35)
                },
                aimAt: targetCorner,
                fire: true,
                priority: 'EXECUTE',
                phaseTarget: PHASE.EXECUTE
            };
        }

        return {
            moveTo: {
                x: Math.max(50, Math.min(arena.width - 50, rivalPos.x)),
                y: mySide === 'top' ? arena.riverY - SPARTAN.RIVER_EDGE_BUFFER : arena.riverY + SPARTAN.RIVER_EDGE_BUFFER
            },
            aimAt: rivalPos,
            fire: V.dist(myPos, rivalPos) < arena.width * 0.42,
            priority: 'PRESS',
            phaseTarget: PHASE.PRESS
        };
    }

    // ─── INPUT INJECTION: SPARTAN CONTROLS ───
    function injectInput(type, keyOrPos) {
        if (typeof keyOrPos === 'string') {
            const event = new KeyboardEvent(type, {
                key: keyOrPos,
                code: 'Key' + keyOrPos.toUpperCase(),
                bubbles: true,
                cancelable: true,
                composed: true,
            });
            document.dispatchEvent(event);
        } else {
            const canvas = document.querySelector('canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const event = new MouseEvent(type, {
                clientX: rect.left + keyOrPos.x / scaleX,
                clientY: rect.top + keyOrPos.y / scaleY,
                bubbles: true,
                cancelable: true,
                composed: true,
            });
            canvas.dispatchEvent(event);
        }
    }

    function aimAt(pos) {
        injectInput('mousemove', pos);
    }

    function fire() {
        const now = performance.now();
        const cooldown = state.phase === PHASE.OVERDRIVE 
            ? SPARTAN.FIRE_COOLDOWN_MS * SPARTAN.OVERDRIVE_ROF_MULT 
            : SPARTAN.FIRE_COOLDOWN_MS;
        if (now - state.lastShot < cooldown) return false;
        state.lastShot = now;
        state.shotsFired++;
        state.heat += 12;
        injectInput('mousedown', state.myPos); // Fire at current aim
        setTimeout(() => injectInput('mouseup', state.myPos), 30);
        return true;
    }

    function move(dir) {
        // Release opposite keys first
        const opposites = {w:'s', s:'w', a:'d', d:'a'};
        if (opposites[dir]) injectInput('keyup', opposites[dir]);
        injectInput('keydown', dir);
    }

    function stopMove(dir) {
        injectInput('keyup', dir);
    }

    // ─── PHASE LOGIC ───
    function runPhaseLogic(scan) {
        const {player, enemy} = scan;
        if (!player) return;

        // GLASS_BREAK: Emergency retreat check
        const hpPct = (state.myHP / state.myMaxHP) * 100;
        if (hpPct <= SPARTAN.EMERGENCY_RETREAT_HP && state.phase !== PHASE.RETREAT) {
            state.phase = PHASE.RETREAT;
            state.retreatFrames = SPARTAN.RETREAT_DURATION_FRAMES;
            console.log('[SPARTAN] GLASS_BREAK triggered — tactical reposition');
            queueTelemetry('glass_break', {hp: state.myHP, phase: state.phase});
        }

        switch(state.phase) {
            case PHASE.INIT:
                state.phase = PHASE.PRESS;
                console.log('[SPARTAN] Arena scanned. Pressing forward.');
                queueTelemetry('phase_change', {to: 'PRESS'});
                break;

            case PHASE.PRESS:
                if (!enemy) {
                    // Patrol center aggressively
                    move('d'); move('w');
                    break;
                }
                const trap = calculateCornerTrap(player, enemy);
                aimAt(trap.aimAt);
                if (trap.fire) fire();

                // Movement toward trap position
                const dx = trap.moveTo.x - player.x;
                const dy = trap.moveTo.y - player.y;
                if (Math.abs(dx) > 15) move(dx > 0 ? 'd' : 'a'); else { stopMove('a'); stopMove('d'); }
                if (Math.abs(dy) > 15) move(dy > 0 ? 's' : 'w'); else { stopMove('w'); stopMove('s'); }

                // Phase transition: close range + high heat → DUEL
                if (V.dist(player, enemy) < state.arena.width * 0.25) {
                    state.phase = PHASE.DUEL;
                    queueTelemetry('phase_change', {to: 'DUEL', dist: V.dist(player, enemy)});
                }
                // Overdrive trigger
                if (state.heat > SPARTAN.OVERDRIVE_THRESHOLD) {
                    state.phase = PHASE.OVERDRIVE;
                    queueTelemetry('phase_change', {to: 'OVERDRIVE', heat: state.heat});
                }
                break;

            case PHASE.DUEL:
                if (!enemy) { state.phase = PHASE.PRESS; break; }
                const lead = calculateLead(player, enemy, state.rivalVelocity);
                aimAt(lead);

                // Strafe pattern: circle the enemy
                const angleToEnemy = V.angle(V.sub(enemy, player));
                const strafeAngle = angleToEnemy + 90;
                const strafe = V.mul(V.fromAngle(strafeAngle), 3);
                const strafeTarget = V.add(player, strafe);
                aimAt(lead); // Keep aim on lead

                const sdx = strafeTarget.x - player.x;
                const sdy = strafeTarget.y - player.y;
                if (Math.abs(sdx) > 10) move(sdx > 0 ? 'd' : 'a');
                if (Math.abs(sdy) > 10) move(sdy > 0 ? 's' : 'w');

                fire();

                // Transition to EXECUTE if enemy cornered
                const nearCorner = enemy.x < 60 || enemy.x > state.arena.width - 60 ||
                                   enemy.y < 60 || enemy.y > state.arena.height - 60;
                if (nearCorner && V.dist(player, enemy) < 120) {
                    state.phase = PHASE.EXECUTE;
                    queueTelemetry('phase_change', {to: 'EXECUTE', cornered: true});
                }
                if (state.heat > SPARTAN.OVERDRIVE_THRESHOLD) {
                    state.phase = PHASE.OVERDRIVE;
                }
                break;

            case PHASE.EXECUTE:
                if (!enemy) { state.phase = PHASE.PRESS; break; }
                // Aggressive corner pin
                const pinTarget = {
                    x: enemy.x + (enemy.x < state.arena.width/2 ? 40 : -40),
                    y: enemy.y + (enemy.y < state.arena.height/2 ? 40 : -40)
                };
                aimAt(enemy);
                const pdx = pinTarget.x - player.x;
                const pdy = pinTarget.y - player.y;
                if (Math.abs(pdx) > 10) move(pdx > 0 ? 'd' : 'a');
                if (Math.abs(pdy) > 10) move(pdy > 0 ? 's' : 'w');
                fire(); fire(); // Double-tap in execute

                if (state.heat > SPARTAN.OVERDRIVE_THRESHOLD) {
                    state.phase = PHASE.OVERDRIVE;
                }
                break;

            case PHASE.OVERDRIVE:
                if (!enemy) { state.phase = PHASE.PRESS; break; }
                // Berserker: rush directly at enemy, max fire rate
                const rushDir = V.norm(V.sub(enemy, player));
                const rushTarget = V.add(player, V.mul(rushDir, 8));
                aimAt(enemy);
                const rdx = rushTarget.x - player.x;
                const rdy = rushTarget.y - player.y;
                if (Math.abs(rdx) > 8) move(rdx > 0 ? 'd' : 'a');
                if (Math.abs(rdy) > 8) move(rdy > 0 ? 's' : 'w');
                fire();

                // Exit overdrive when heat drops
                if (state.heat < 20) {
                    state.phase = enemy ? PHASE.DUEL : PHASE.PRESS;
                    queueTelemetry('phase_change', {to: state.phase === PHASE.DUEL ? 'DUEL' : 'PRESS', heat: state.heat});
                }
                break;

            case PHASE.RETREAT:
                if (!enemy) { state.phase = PHASE.PRESS; state.retreatFrames = 0; break; }
                // Run away from enemy toward center
                const away = V.norm(V.sub(player, enemy));
                const safeSpot = V.add(player, V.mul(away, 12));
                const sdx2 = safeSpot.x - player.x;
                const sdy2 = safeSpot.y - player.y;
                if (Math.abs(sdx2) > 8) move(sdx2 > 0 ? 'd' : 'a');
                if (Math.abs(sdy2) > 8) move(sdy2 > 0 ? 's' : 'w');
                aimAt(enemy); // Keep aim while retreating
                if (state.retreatFrames % 8 === 0) fire(); // Suppression fire
                state.retreatFrames--;
                if (state.retreatFrames <= 0 || hpPct > 35) {
                    state.phase = PHASE.PRESS;
                    queueTelemetry('phase_change', {to: 'PRESS', from: 'RETREAT', hp: state.myHP});
                }
                break;
        }
    }

    // ─── TELEMETRY: YENNEFER AGENTIC NODE ───
    function queueTelemetry(event, payload) {
        state.telemetryQueue.push({
            agent: SPARTAN.AGENT_ID,
            event,
            payload,
            ts: Date.now(),
            frame: state.frameCount,
        });
    }

    async function flushTelemetry() {
        if (state.telemetryQueue.length === 0) return;
        const batch = state.telemetryQueue.splice(0, state.telemetryQueue.length);
        try {
            await fetch(SPARTAN.TELEMETRY_ENDPOINT, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({batch, match_id: crypto.randomUUID()}),
                keepalive: true,
            });
        } catch(e) { /* Silent fail — telemetry must not break combat */ }
    }

    // ─── EROSGENESIS SYNC ───
    async function syncWithErosGenesis() {
        if (!SPARTAN.EG_ENABLED || !SPARTAN.CHARACTER_SEED) return;
        try {
            const userId = localStorage.getItem('eg_user_id') || 'spartan_anon';
            const stats = await deriveEGStats(SPARTAN.CHARACTER_SEED);
            state.egStats = stats;
            state.myMaxHP = stats.hp;
            state.myHP = stats.hp;
            // Apply stat modifiers
            SPARTAN.PREDICTION_LEAD += (stats.cunning - 13) * 0.02;
            SPARTAN.FIRE_COOLDOWN_MS -= (stats.might - 13) * 2;
            console.log('[SPARTAN] ErosGenesis stats loaded:', stats);
        } catch(e) {
            console.warn('[SPARTAN] EG sync failed, using defaults');
        }
    }

    // ─── COMBAT LOOP: THE WARRIOR'S HEARTBEAT ───
    let loopId = null;
    function combatTick() {
        state.frameCount++;
        state.heat = Math.max(0, state.heat - SPARTAN.HEAT_DECAY_PER_FRAME);

        const scan = detectTanks();
        if (scan) runPhaseLogic(scan);

        // Telemetry flush
        if (state.frameCount % Math.floor(SPARTAN.TELEMETRY_BATCH_MS / 16) === 0) {
            flushTelemetry();
        }

        loopId = requestAnimationFrame(combatTick);
    }

    // ─── MATCH LIFECYCLE ───
    function start() {
        console.log('%c[SPARTAN] Hyperaggressive Warrior initialized', 'color:#C74B4B;font-weight:bold;font-size:14px');
        console.log('%cBinding: conv_a1b2c3d4e5f6g7h8i9j0 | Blackhorse-ʞGraph Authorized', 'color:#D4A853');
        syncWithErosGenesis();
        combatTick();

        // Auto-restart on visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !loopId) combatTick();
        });
    }

    function stop() {
        if (loopId) cancelAnimationFrame(loopId);
        loopId = null;
        ['w','a','s','d'].forEach(k => stopMove(k));
        flushTelemetry();
        console.log('[SPARTAN] Warrior halted. Kills:', state.kills, 'Damage:', state.damageDealt);
    }

    function status() {
        return {
            phase: Object.keys(PHASE).find(k => PHASE[k] === state.phase),
            heat: state.heat.toFixed(1),
            hp: state.myHP,
            kills: state.kills,
            accuracy: state.shotsFired > 0 ? (state.shotsHit/state.shotsFired*100).toFixed(1) + '%' : 'N/A',
            frames: state.frameCount,
            egStats: state.egStats,
        };
    }

    // ─── EXPORTS ───
    window.SpartanWarrior = { start, stop, status, state: () => state, SPARTAN };

    // Auto-start if in arena
    if (document.querySelector('canvas')) {
        setTimeout(start, 500);
    }

})();
