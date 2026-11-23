/* ==========================================================================
   Helios & Chronos — Pure Astronomical & Battery State Model
   No DOM access. Loaded via <script src="solar-model.js"> and tests/verify.mjs.
   ========================================================================== */
(function (root) {
    'use strict';

    /**
     * NOAA Astronomical Solar Calculation Algorithm
     * Computes Sunrise, Solar Noon, and Sunset for any date and coordinates.
     * Official sunrise/sunset zenith angle: 90.833 deg (includes refraction + solar disc radius).
     */
    function calculateSolarEvents(dateObj, lat, lon) {
        const rad = Math.PI / 180;
        const deg = 180 / Math.PI;

        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const day = dateObj.getDate();

        const startOfLocalDay = new Date(year, month, day, 0, 0, 0, 0);
        const startOfYear = new Date(year, 0, 0);
        const dayOfYear = Math.floor((startOfLocalDay - startOfYear) / 86400000);

        // Fractional year gamma in radians
        const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

        // Equation of time (minutes)
        const eqTime = 229.18 * (
            0.000075 +
            0.001868 * Math.cos(gamma) -
            0.032077 * Math.sin(gamma) -
            0.014615 * Math.cos(2 * gamma) -
            0.040849 * Math.sin(2 * gamma)
        );

        // Solar declination (radians)
        const decl = 0.006918 -
            0.399912 * Math.cos(gamma) +
            0.070257 * Math.sin(gamma) -
            0.006758 * Math.cos(2 * gamma) +
            0.000907 * Math.sin(2 * gamma) -
            0.002697 * Math.cos(3 * gamma) +
            0.00148 * Math.sin(3 * gamma);

        // Official sunrise/sunset zenith (90.833 deg)
        const zenith = 90.833 * rad;
        const cosHA = (Math.cos(zenith) / (Math.cos(lat * rad) * Math.cos(decl))) -
                      (Math.tan(lat * rad) * Math.tan(decl));

        if (cosHA < -1) return { polarDay: true, polarNight: false, dayOfYear, eqTime, decl };
        if (cosHA > 1) return { polarDay: false, polarNight: true, dayOfYear, eqTime, decl };

        const haDegrees = Math.acos(cosHA) * deg;
        const solarNoonUTCMin = 720 - (4 * lon) - eqTime;
        const sunriseUTCMin = solarNoonUTCMin - (4 * haDegrees);
        const sunsetUTCMin = solarNoonUTCMin + (4 * haDegrees);

        const utcMidnightMs = Date.UTC(year, month, day, 0, 0, 0, 0);
        const sunriseDate = new Date(utcMidnightMs + sunriseUTCMin * 60000);
        const sunsetDate = new Date(utcMidnightMs + sunsetUTCMin * 60000);
        const solarNoonDate = new Date(utcMidnightMs + solarNoonUTCMin * 60000);

        // Yesterday's sunset & tomorrow's sunrise for smooth night-recharge interpolation
        const prevUtcMidnightMs = Date.UTC(year, month, day - 1, 0, 0, 0, 0);
        const nextUtcMidnightMs = Date.UTC(year, month, day + 1, 0, 0, 0, 0);
        const prevSunsetDate = new Date(prevUtcMidnightMs + sunsetUTCMin * 60000);
        const nextSunriseDate = new Date(nextUtcMidnightMs + sunriseUTCMin * 60000);

        return {
            polarDay: false,
            polarNight: false,
            sunrise: sunriseDate,
            sunset: sunsetDate,
            solarNoon: solarNoonDate,
            prevSunset: prevSunsetDate,
            nextSunrise: nextSunriseDate,
            daylightMs: sunsetDate.getTime() - sunriseDate.getTime(),
            dayOfYear,
            eqTime,
            decl
        };
    }

    /**
     * Maps remaining usable daylight percentage (0..100) to discrete battery charge bands.
     */
    function classifyBatteryLevel(leftPct) {
        if (leftPct <= 0) return 'empty';
        if (leftPct <= 10) return 'critical';
        if (leftPct <= 20) return 'low';
        if (leftPct <= 50) return 'medium';
        if (leftPct >= 95) return 'full';
        return 'high';
    }

    /**
     * Computes the Solar Daylight Battery state (100% at Sunrise -> 0% at Sunset).
     */
    function computeSolarBatteryState(nowMs, s) {
        if (!s) {
            return {
                phase: 'unknown',
                level: 'empty',
                leftPct: 0,
                usedPct: 0,
                elapsedMs: 0,
                remMs: 0,
                untilNextRiseMs: 0,
                nightProgress: 0
            };
        }

        if (s.polarDay) {
            return {
                phase: 'polar-day',
                level: 'full',
                leftPct: 100,
                usedPct: 0,
                elapsedMs: 0,
                remMs: 86400000,
                untilNextRiseMs: 0,
                nightProgress: 0
            };
        }

        if (s.polarNight) {
            return {
                phase: 'polar-night',
                level: 'empty',
                leftPct: 0,
                usedPct: 100,
                elapsedMs: 0,
                remMs: 0,
                untilNextRiseMs: 0,
                nightProgress: 0
            };
        }

        const riseMs = s.sunrise.getTime();
        const setMs = s.sunset.getTime();
        const totalSunMs = s.daylightMs;

        if (nowMs >= riseMs && nowMs <= setMs) {
            const elapsedMs = Math.max(0, nowMs - riseMs);
            const remMs = Math.max(0, setMs - nowMs);
            const leftPct = totalSunMs > 0 ? Math.max(0, Math.min(100, (remMs / totalSunMs) * 100)) : 0;
            const usedPct = Math.max(0, Math.min(100, 100 - leftPct));
            return {
                phase: 'daylight',
                level: classifyBatteryLevel(leftPct),
                leftPct,
                usedPct,
                elapsedMs,
                remMs,
                untilNextRiseMs: 0,
                nightProgress: 0
            };
        }

        if (nowMs < riseMs) {
            const untilNextRiseMs = Math.max(0, riseMs - nowMs);
            const prevSetMs = s.prevSunset.getTime();
            const span = riseMs - prevSetMs;
            const nightProgress = span > 0 ? Math.max(0, Math.min(1, (nowMs - prevSetMs) / span)) : 0;
            return {
                phase: 'pre-dawn',
                level: 'empty',
                leftPct: 0,
                usedPct: 0,
                elapsedMs: 0,
                remMs: 0,
                untilNextRiseMs,
                nightProgress
            };
        }

        // Post-sunset
        const nextRiseMs = s.nextSunrise.getTime();
        const untilNextRiseMs = Math.max(0, nextRiseMs - nowMs);
        const span = nextRiseMs - setMs;
        const nightProgress = span > 0 ? Math.max(0, Math.min(1, (nowMs - setMs) / span)) : 0;
        return {
            phase: 'post-sunset',
            level: 'empty',
            leftPct: 0,
            usedPct: 100,
            elapsedMs: totalSunMs,
            remMs: 0,
            untilNextRiseMs,
            nightProgress
        };
    }

    /**
     * Computes UTC 24-hour day percentage telemetry.
     */
    function computeUtcDayState(dateObj) {
        const nowMs = dateObj.getTime();
        const utcMidnightMs = Date.UTC(
            dateObj.getUTCFullYear(),
            dateObj.getUTCMonth(),
            dateObj.getUTCDate(),
            0, 0, 0, 0
        );
        const totalDayMs = 86400000;
        const elapsedUtcMs = Math.max(0, Math.min(totalDayMs, nowMs - utcMidnightMs));
        const remUtcMs = Math.max(0, totalDayMs - elapsedUtcMs);
        const utcPct = (elapsedUtcMs / totalDayMs) * 100;
        return {
            utcPct,
            elapsedUtcMs,
            remUtcMs,
            secondsGone: Math.floor(elapsedUtcMs / 1000)
        };
    }

    function pad2(n) {
        return String(Math.floor(n)).padStart(2, '0');
    }

    function formatHMS(dateObj, useUTC) {
        if (!dateObj || isNaN(dateObj.getTime())) return '--:--:--';
        const h = useUTC ? dateObj.getUTCHours() : dateObj.getHours();
        const m = useUTC ? dateObj.getUTCMinutes() : dateObj.getMinutes();
        const s = useUTC ? dateObj.getUTCSeconds() : dateObj.getSeconds();
        return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    }

    function formatHM(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime())) return '--:--';
        return `${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`;
    }

    function formatDurationHMS(ms) {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${pad2(h)}h ${pad2(m)}m ${pad2(s)}s`;
    }

    function formatDurationHM(ms) {
        const totalMin = Math.max(0, Math.round(ms / 60000));
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}h ${pad2(m)}m`;
    }

    function splitPercentage(pct, decimals) {
        const clamped = Math.max(0, Math.min(100, pct));
        const fixedStr = clamped.toFixed(decimals);
        const parts = fixedStr.split('.');
        return {
            intPart: parts[0].padStart(2, '0'),
            decPart: parts[1] ? `.${parts[1]}` : ''
        };
    }

    const api = {
        calculateSolarEvents,
        classifyBatteryLevel,
        computeSolarBatteryState,
        computeUtcDayState,
        pad2,
        formatHMS,
        formatHM,
        formatDurationHMS,
        formatDurationHM,
        splitPercentage
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.SolarModel = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
