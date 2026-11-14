# Pokémon Mystery Dungeon–style TTRPG Companion — V2 Specification

**Status:** Intentionally limited scope / owner has not specified numerical balancing rules.  
**Date:** 2026-11-14  
**Predecessors:** [`V0_SPEC.md`](V0_SPEC.md), [`V1_SPEC.md`](V1_SPEC.md). Their approved requirements remain in force.

## 0. V2 goal — CONFIRMED

**Improve support for Pokémon boss encounters by developing boss-action balance guidance and deciding the advanced boss mechanics later.** The project owner explicitly deferred boss balancing to **V2**. The V0/V1 manual ability for a GM to give a boss additional action opportunities is retained.

This document intentionally **does not invent extra turns per health threshold, damage multipliers, new boss currencies, scripted phases, or artificial difficulty ratings**. These are not approved rules.

## 1. Inherited baseline — CONFIRMED

V2 continues the complete V1 app and battle system, including:

- Pokémon-only adventure, narrative D100 roleplay attributes and independent Gen 9 app combat.
- All Pokémon species through Gen 9, subject to GM-permitted campaign restrictions.
- Two opposing slot lines, A/B/C/...; positioning free until all actions lock.
- Gen 9 actions resolved by move priority then Speed; approved free **Run** position change and consensual free **Switch** Speed exchange.
- Six equipped moves and standard Pokémon combat effects, PP and items; fixed 60-second optional **whole-round** timer and Struggle fallback; player disconnect pauses active timer.
- Rest/creation boundaries for move/Ability changes, Medium Fast experience progression, player-distributed IV/EV-equivalent points, voluntary eligible evolution, custom Agony at 0 HP.
- GM-controlled enemy actions and GM-editable encounters.
- Gen 5 item/Pokémon UI with Showdown `ani` 3D-style animated sprite fallback, a Cloudflare-hosted PWA and live WebSocket relay, no persistent application database, JSON/local saves, complete QR character import when payload fits, GM+player copies, and battle recovery.

## 2. Boss encounter work explicitly deferred to V2

### 2.1 Balance guide — CONFIRMED need, exact content TBD

Create a **GM-facing balancing guide** for the existing combat system and manual additional action opportunities. Before publishing balance figures, test and agree on:

- What party size(s), player levels, number of enemy Pokémon, available moves/items/Abilities, and IV/EV allocations the guide targets.
- How to represent the danger of **additional boss action opportunities** without conflating them with Speed or move priority.
- How Agony and healing affect encounter difficulty.
- How the user wants encounter outcomes and difficulty measured.

**No numerical formula or recommendation is approved yet.** A formula based on arbitrary HP multipliers or a fixed number of extra actions is not allowed without a later owner decision.

### 2.2 Advanced boss encounters — FUTURE / TBD

The owner said “the part about boss actions has to come later with boss balance”, while also allowing **manual additions in V0/V1**. Thus V2 is where to *specify and validate* richer boss-action handling **if requested**. V2 does **not** itself mandate:

- Boss AI, phase transitions, telegraphed moves, scripted encounter mechanics, or automatic boss turns.
- Different Pokémon move formulas, special boss damage rules, or custom co-op effects.
- A new board/grid or different initiative system.

Any such feature requires a separate explicit approval and a testable rule, rather than being quietly included under “epic boss battles”.

## 3. V2 feature boundary and implementation tasks

The only confirmed new deliverable is an owner-approved **balance methodology/guide** for the pre-existing manual boss-action mechanic. To make that possible, engineering work may measure outcomes using **existing**, unaltered Gen 9 math plus V0/V1 custom rules; instrumentation or test fixtures must not change game behavior.

The following are **engineering tasks**, not new gameplay features:

1. Resolve inherited TBDs affecting simulation consistency (especially Agony timing, Switch Speed semantics, custom line targeting and round timer behavior).
2. Build reproducible encounter test cases covering different party sizes, levels, types, attacks, support moves, positions, and a manually configured extra boss action.
3. Check correctness against the adapted Gen 9 battle engine and persisted encounter snapshots.
4. Record results and submit proposed difficulty guidance for GM/owner review.
5. Publish **only approved** guidance to the GM interface/documentation.

## 4. V2 acceptance checklist

- [ ] Every V1 acceptance check still passes, including support for all Gen 1–9 species and save/load of unfinished combats.
- [ ] GM can still insert manual additional boss actions with no forced automatic balance assumptions.
- [ ] A documented, reproducible validation suite tests boss encounters under the approved combat semantics and party configurations.
- [ ] The GM-facing balancing guide exists **after its rules and numerical thresholds have been approved by the owner**.
- [ ] No unapproved new combat resources, AI, boss phase scripts or bespoke Pokémon calculations are introduced.
- [ ] No database introduced; GM authoritative state / JSON file and localStorage persistence remain intact.

## 5. Open owner decisions

- What constitutes a fair/easy/hard boss encounter, and which party sizes and levels matter most?
- How many extra actions may bosses have, and how does the GM place them in priority/Speed order?
- Should boss action opportunities behave like independent turns for status durations and Agony, or only like extra move selections? This is presently **undefined**; V0/V1 support remains *manual* pending clarification.
- Does the owner actually want telegraphs/phases/other boss-specific mechanics, or only a balance guide for extra actions?
- Carry forward any still-open V0/V1 decisions; do not silently close them.

---

**Version definition:** V2 = **V1 + owner-approved boss balance guidance** (and *only* subsequently approved boss features). No fabricated boss system.
