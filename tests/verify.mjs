#!/usr/bin/env node
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const M = require('../solar-model.js');

let passed = 0;
function check(name, fn) {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
}

console.log('Helios & Chronos — Model Verification');

check('Equinox Göppingen (~12h daylight)', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 2, 20, 12, 0, 0)), 48.703, 9.652);
    assert.equal(s.polarDay, false);
    assert.equal(s.polarNight, false);
    const hours = s.daylightMs / 3600000;
    assert.ok(hours > 11.8 && hours < 12.5, `expected ~12.1h at equinox, got ${hours.toFixed(2)}h`);
    assert.ok(s.sunrise < s.solarNoon && s.solarNoon < s.sunset);
});

check('Summer Solstice Göppingen (~16h daylight)', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)), 48.703, 9.652);
    const hours = s.daylightMs / 3600000;
    assert.ok(hours > 15.8 && hours < 16.5, `expected ~16.1h in summer, got ${hours.toFixed(2)}h`);
});

check('Winter Solstice Göppingen (~8.2h daylight)', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 11, 21, 12, 0, 0)), 48.703, 9.652);
    const hours = s.daylightMs / 3600000;
    assert.ok(hours > 7.9 && hours < 8.6, `expected ~8.2h in winter, got ${hours.toFixed(2)}h`);
});

check('Polar Day (Svalbard 78.22°N, June 21)', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)), 78.22, 15.63);
    assert.equal(s.polarDay, true);
    assert.equal(s.polarNight, false);
    const b = M.computeSolarBatteryState(Date.UTC(2026, 5, 21, 12, 0, 0), s);
    assert.equal(b.phase, 'polar-day');
    assert.equal(b.leftPct, 100);
    assert.equal(b.level, 'full');
});

check('Polar Night (Svalbard 78.22°N, Dec 21)', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 11, 21, 12, 0, 0)), 78.22, 15.63);
    assert.equal(s.polarDay, false);
    assert.equal(s.polarNight, true);
    const b = M.computeSolarBatteryState(Date.UTC(2026, 11, 21, 12, 0, 0), s);
    assert.equal(b.phase, 'polar-night');
    assert.equal(b.leftPct, 0);
    assert.equal(b.level, 'empty');
});

check('Battery drains from 100% at Sunrise to 0% at Sunset', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 5, 1, 12, 0, 0)), 48.703, 9.652);
    const rise = s.sunrise.getTime();
    const set = s.sunset.getTime();
    const dur = s.daylightMs;

    const atRise = M.computeSolarBatteryState(rise, s);
    assert.equal(atRise.phase, 'daylight');
    assert.equal(atRise.leftPct, 100);
    assert.equal(atRise.usedPct, 0);
    assert.equal(atRise.level, 'full');

    const atQuarter = M.computeSolarBatteryState(rise + dur * 0.25, s);
    assert.ok(Math.abs(atQuarter.leftPct - 75) < 1e-6);
    assert.equal(atQuarter.level, 'high');

    const atNoon = M.computeSolarBatteryState(rise + dur * 0.5, s);
    assert.ok(Math.abs(atNoon.leftPct - 50) < 1e-6);
    assert.equal(atNoon.level, 'medium');

    const atLow = M.computeSolarBatteryState(rise + dur * 0.85, s);
    assert.ok(Math.abs(atLow.leftPct - 15) < 1e-6);
    assert.equal(atLow.level, 'low');

    const atCritical = M.computeSolarBatteryState(rise + dur * 0.95, s);
    assert.ok(Math.abs(atCritical.leftPct - 5) < 1e-6);
    assert.equal(atCritical.level, 'critical');

    const atSet = M.computeSolarBatteryState(set, s);
    assert.equal(atSet.phase, 'daylight');
    assert.equal(atSet.leftPct, 0);
    assert.equal(atSet.usedPct, 100);
    assert.equal(atSet.level, 'empty');
});

check('Pre-Dawn & Post-Sunset Nighttime Battery State (0% left, recharging)', () => {
    const s = M.calculateSolarEvents(new Date(Date.UTC(2026, 10, 23, 12, 0, 0)), 48.703, 9.652);
    const preDawn = M.computeSolarBatteryState(s.sunrise.getTime() - 3600000, s);
    assert.equal(preDawn.phase, 'pre-dawn');
    assert.equal(preDawn.leftPct, 0);
    assert.equal(preDawn.level, 'empty');
    assert.equal(preDawn.untilNextRiseMs, 3600000);
    assert.ok(preDawn.nightProgress > 0.5 && preDawn.nightProgress < 1);

    const postSet = M.computeSolarBatteryState(s.sunset.getTime() + 3600000, s);
    assert.equal(postSet.phase, 'post-sunset');
    assert.equal(postSet.leftPct, 0);
    assert.equal(postSet.usedPct, 100);
    assert.equal(postSet.level, 'empty');
    assert.ok(postSet.untilNextRiseMs > 0);
    assert.ok(postSet.nightProgress > 0 && postSet.nightProgress < 0.5);
});

check('UTC 24-Hour Day State at 00:00, 12:00, 18:00', () => {
    const t0 = M.computeUtcDayState(new Date(Date.UTC(2026, 10, 23, 0, 0, 0)));
    assert.equal(t0.utcPct, 0);
    assert.equal(t0.secondsGone, 0);

    const t12 = M.computeUtcDayState(new Date(Date.UTC(2026, 10, 23, 12, 0, 0)));
    assert.equal(t12.utcPct, 50);
    assert.equal(t12.secondsGone, 43200);

    const t18 = M.computeUtcDayState(new Date(Date.UTC(2026, 10, 23, 18, 0, 0)));
    assert.equal(t18.utcPct, 75);
    assert.equal(t18.secondsGone, 64800);
});

check('splitPercentage clamping and decimal precision', () => {
    assert.deepEqual(M.splitPercentage(100, 3), { intPart: '100', decPart: '.000' });
    assert.deepEqual(M.splitPercentage(105, 2), { intPart: '100', decPart: '.00' });
    assert.deepEqual(M.splitPercentage(-3, 1), { intPart: '00', decPart: '.0' });
    assert.deepEqual(M.splitPercentage(7.8912, 4), { intPart: '07', decPart: '.8912' });
});

console.log(`All ${passed} checks passed.`);
