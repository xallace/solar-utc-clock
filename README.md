<div align="center">

# ☀️ Helios & Chronos — Solar & UTC Percentage Clocks
### Real-Time Usable Daylight & Universal UTC Decimal Day Clocks with NOAA Solar Ephemeris & Interactive Scrubber

[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-f59e0b?style=for-the-badge&logo=github)](https://xallace.github.io/solar-utc-clock/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)
[![Platform: Web](https://img.shields.io/badge/Platform-HTML5_Canvas_%2B_SVG-38bdf8?style=for-the-badge)](https://developer.mozilla.org)
[![Aesthetics: Dark Glass](https://img.shields.io/badge/Design-TailwindCSS_Glassmorphism-6366f1?style=for-the-badge)](https://tailwindcss.com)
[![Dependencies: Zero](https://img.shields.io/badge/Dependencies-Zero_Vanilla_JS-10b981?style=for-the-badge)](https://developer.mozilla.org)

*A clean, scientific dual-clock dashboard expressing the diurnal rhythm of local sunlight and universal human coordination as high-precision decimal percentages.*

[**🚀 Launch Live Clock**](https://xallace.github.io/solar-utc-clock/) • [**📐 Astronomical Formulations**](#astronomical-formulations) • [**✨ Key Features**](#key-features) • [**🧭 Presets & Geolocation**](#presets--geolocation)

</div>

---

## 🌟 Overview

Standard 12/24-hour clocks divide time into arbitrary sexagesimal units (hours, minutes, seconds) that mask two intuitive perspectives of human time:

1. **The Helios Dial (Local Usable Daylight Percentage):**  
   Measures where you currently stand within the real astronomical day—from local sunrise ($0.000\%$) through solar noon ($50.000\%$) to sunset ($100.000\%$). During nighttime hours, it tracks progress through the solar nocturnal trough with a dedicated starlight phase arc.

2. **The Chronos Dial (Universal UTC Decimal Day Percentage):**  
   Tracks the earth's rotation in universal coordinated time from $0.0000\%$ to $99.9999\%$, eliminating time zone ambiguities for global teams, scientific recording, and planetary synchronization.

---

## ✨ Key Features

* **60 FPS High-Precision Dial Renderers:** Smooth dual SVG circular meters with glow halos and animated progress pulses.
* **Configurable Decimal Precision:** Switch seamlessly between 1 (`.0`), 2 (`.00`), 3 (`.000`), or 4 (`.0000`) decimal places with sub-second accuracy.
* **Interactive Time Scrubber Simulation:** Drag across the 24-hour continuum to preview the sun's trajectory, golden hour, solar noon, and dusk for any moment of the day.
* **Astronomical Solar Milestones:** Real-time countdowns and timestamps for:
  * Astronomical Sunrise & Sunset
  * Solar Noon (Meridian Transit)
  * Total Usable Daylight Duration
  * Golden Hour & Blue Hour windows
  * Day of the Year ($N$) and Equation of Time ($\Delta t$)
* **Instant GPS & Global Presets:** One-click browser geolocation or quick-switching presets (Göppingen, London, New York, Tokyo, Sydney, Reykjavik, Singapore).
* **Responsive Dark Glassmorphism:** Tailored with Tailwind CSS, backdrop filters, and Phosphor Icons for ultra-low power consumption and aesthetic desk display.
* **Zero Dependencies:** Standalone single-page web application with pure vanilla ES6 JavaScript.

---

## 📐 Astronomical Formulations

Calculations follow the **NOAA Solar Ephemeris** model using J. W. Spencer's Fourier series for solar declination and the Equation of Time:

### 1. Fractional Year Angle ($\gamma$)
Given the day of the year $N \in [1, 366]$:
$$\gamma = \frac{2\pi}{365} (N - 1)$$

### 2. Equation of Time ($E_t$ in minutes)
Accounts for orbital eccentricity and axial tilt:
$$E_t = 229.18 \cdot \left(0.000075 + 0.001868\cos\gamma - 0.032077\sin\gamma - 0.014615\cos 2\gamma - 0.040849\sin 2\gamma\right)$$

### 3. Solar Declination ($\delta$)
$$\delta = 0.006918 - 0.399912\cos\gamma + 0.070257\sin\gamma - 0.006758\cos 2\gamma + 0.000907\sin 2\gamma - 0.002697\cos 3\gamma + 0.00148\sin 3\gamma$$

### 4. Hour Angle ($H_0$) at Sunrise & Sunset
Using official atmospheric refraction zenith angle $\theta_0 = 90.833^\circ$:
$$\cos H_0 = \frac{\cos(90.833^\circ) - \sin\phi\sin\delta}{\cos\phi\cos\delta}$$

Where $\phi$ is observer latitude.

### 5. Solar Percentage Metric
During daylight ($T_{\text{rise}} \le t \le T_{\text{set}}$):
$$\mathcal{P}_{\text{daylight}}(t) = \frac{t - T_{\text{rise}}}{T_{\text{set}} - T_{\text{rise}}} \times 100\%$$

During nighttime ($t > T_{\text{set}}$ or $t < T_{\text{rise}}$):
$$\mathcal{P}_{\text{night}}(t) = \frac{t - T_{\text{set}}}{T_{\text{rise, next}} - T_{\text{set}}} \times 100\%$$

---

## 🧭 Presets & Geolocation

| Location | Latitude ($\phi$) | Longitude ($\lambda$) | Note |
| :--- | :--- | :--- | :--- |
| **Göppingen, DE** | $48.703^\circ\text{ N}$ | $9.652^\circ\text{ E}$ | Default home coordinates |
| **London, UK** | $51.507^\circ\text{ N}$ | $-0.128^\circ\text{ W}$ | Greenwich Reference (UTC+0) |
| **New York, US** | $40.713^\circ\text{ N}$ | $-74.006^\circ\text{ W}$ | Eastern Standard / Daylight |
| **Tokyo, JP** | $35.676^\circ\text{ N}$ | $139.650^\circ\text{ E}$ | Japan Standard (UTC+9) |
| **Sydney, AU** | $-33.869^\circ\text{ S}$ | $151.209^\circ\text{ E}$ | Southern Hemisphere Inverted Seasons |
| **Reykjavik, IS** | $64.146^\circ\text{ N}$ | $-21.942^\circ\text{ W}$ | High latitude sub-polar daylight swing |
| **Singapore, SG** | $1.352^\circ\text{ N}$ | $103.820^\circ\text{ E}$ | Equatorial near-constant 12h day |

---

## 🛠️ Local Development & Deployment

Clone the repository and launch directly in any modern browser:

```bash
git clone https://github.com/xallace/solar-utc-clock.git
cd solar-utc-clock
# Open index.html in default browser
open index.html   # macOS
start index.html  # Windows
xdg-open index.html # Linux
```

No build step or Node.js runtime required.

---

## 📄 License

Distributed under the [MIT License](LICENSE).  
Copyright © 2026 Walter (@xallace).
