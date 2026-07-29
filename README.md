# INVARIANTX — Spartan Hyperaggressive Warrior Combat Module v2.0

**OnlyBuilds.ai Tank Arena** · **Blackhorse-ʞGraph Authorized** · **ErosGenesis-Integrated**

> Doctrine: *"Calorie versus footed soldiers"* — maximum energy density per action.  
> Every frame is a kill window. No defensive posture. Only forward pressure.

**Binding:** `conv_a1b2c3d4e5f6g7h8i9j0`  
**Deployment targets:** Browser console · Kimi WebBridge · OpenClaw · ErosGenesis Arena

## Quick Start

1. Open the tank arena page that exposes a `<canvas>` element.
2. Paste the contents of `spartan_hyperaggressive_warrior_v2.js` into the browser console (or load via script tag / OpenClaw bridge).
3. The module auto-starts when a canvas is detected:

```js
// Manual control
window.SpartanWarrior.start();
window.SpartanWarrior.status();
window.SpartanWarrior.stop();
```

## Core Systems

| System | Description |
|--------|-------------|
| **Phase State Machine** | `INIT → PRESS → DUEL → EXECUTE → OVERDRIVE` with `RETREAT` (GLASS_BREAK) failsafe |
| **Predictive Fire** | Lead calculation with velocity smoothing + river arc compensation |
| **Corner Trap Geometry** | Forces rival into arena corners using side-aware positioning |
| **Thermodynamic Heat** | Action heat budget (Blackhorse-ʞGraph). Overdrive triggers at 70 % heat |
| **Canvas Surveillance** | Flood-fill pixel clustering for player/enemy tank detection |
| **Telemetry** | Batched events to `telemetry.genesisconductor.io` (Yennefer agentic node) |
| **ErosGenesis Stats** | Optional SHA-256-derived combat modifiers (might / cunning / resolve / arcana) |

## Configuration Highlights

```js
SPARTAN.FIRE_COOLDOWN_MS      // 145 ms base ROF
SPARTAN.PREDICTION_LEAD       // 1.22× projectile lead
SPARTAN.OVERDRIVE_ROF_MULT    // 0.72× cooldown under overdrive
SPARTAN.EMERGENCY_RETREAT_HP  // 15 % HP triggers GLASS_BREAK
```

Enable ErosGenesis integration by setting:

```js
SPARTAN.EG_ENABLED = true;
SPARTAN.CHARACTER_SEED = { name, personality, background, secret };
```

## License & Authority

Authorized under Blackhorse-ʞGraph thermodynamic governance protocols.  
Part of the Genesis Conductor / Diamondnode ecosystem by Igor Holt.

---

*Forward pressure only.*
