<script lang="ts">
  import { Compass } from 'lucide-svelte';
  import { appState } from '../../lib/stores/appState.svelte';

  const DRAWING_OPTIONS = [
    { value: 'ortho3', label: 'Vue d’ensemble (3 Vues ISO E : Face, Gauche, Dessus)' },
    { value: 'exploded_annotated', label: 'Vue éclatée annotée du châssis & fixations' },
    { value: 'comp_microbit', label: 'Dessin de définition : Carte micro:bit V2' },
    { value: 'comp_shield', label: 'Dessin de définition : Shield Grove micro:bit' },
    { value: 'comp_esp32c3', label: 'Dessin de définition : Carte ESP32-C3 SuperMini' },
    { value: 'comp_esp32cam', label: 'Dessin de définition : Module ESP32-CAM OV2640' },
    { value: 'comp_lux', label: 'Dessin de définition : Capteur Luminosité Grove' },
    { value: 'comp_ultra', label: 'Dessin de définition : Capteur Ultrason Grove' },
    { value: 'comp_buzzer', label: 'Dessin de définition : Module Buzzer Grove' },
    { value: 'comp_led', label: 'Dessin de définition : Module LED Blanche Grove' },
    { value: 'comp_oled', label: 'Dessin de définition : Afficheur OLED 0,96" I2C' },
    { value: 'comp_pico', label: 'Dessin de définition : Raspberry Pi Pico W' },
  ];

  const componentSpecs: Record<string, { title: string; dims: string; w: string; h: string; pins: string }> = {
    comp_shield: { title: 'SHIELD GROVE MICRO:BIT V2', dims: '72 × 54 mm', w: '72 mm', h: '54 mm', pins: '4 × JST 4 broches (P0, P1, P2, I2C)' },
    comp_esp32c3: { title: 'ESP32-C3 SUPERMINI (RISC-V)', dims: '22,5 × 18 mm', w: '22,5 mm', h: '18 mm', pins: 'USB-C · Wi-Fi 2,4 GHz · 11 GPIO' },
    comp_esp32cam: { title: 'MODULE ESP32-CAM OV2640', dims: '40,5 × 27 mm', w: '40,5 mm', h: '27 mm', pins: '5 V DC · DVP 24 broches · Flash GPIO4' },
    comp_lux: { title: 'CAPTEUR LUMINOSITÉ GROVE', dims: '20 × 20 mm', w: '20 mm', h: '20 mm', pins: 'JST 4P · SIG Analogique -> P0' },
    comp_ultra: { title: 'CAPTEUR ULTRASON GROVE', dims: '42 × 24 mm', w: '42 mm', h: '24 mm', pins: '40 kHz · Portée 2–350 cm · P0' },
    comp_buzzer: { title: 'MODULE BUZZER PIÉZO GROVE', dims: '20 × 20 mm', w: '20 mm', h: '20 mm', pins: 'JST 4P · PWM 2 kHz -> P2' },
    comp_led: { title: 'MODULE LED BLANCHE 5 MM GROVE', dims: '20 × 20 mm', w: '20 mm', h: '20 mm', pins: 'JST 4P · Sortie Digitale -> P1' },
    comp_oled: { title: 'AFFICHEUR OLED 0,96" SSD1306', dims: '27 × 27 mm', w: '27 mm', h: '27 mm', pins: '128×64 px · Bus I2C (SDA / SCL) 3,3 V' },
    comp_pico: { title: 'RASPBERRY PI PICO W (RP2040)', dims: '51 × 21 mm', w: '51 mm', h: '21 mm', pins: 'CYW43439 Wi-Fi 2,4 GHz · 26 GPIO' },
  };
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 print-break-inside-avoid">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Compass class="w-4 h-4 text-sky-600 dark:text-sky-400" />
        Dessins Techniques Normalisés (Projection Européenne ISO E & Cartouche)
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Planche vectorielle synchronisée automatiquement avec le cartouche élève (NF EN ISO 7200).
      </p>
    </div>

    <div class="flex items-center gap-2 no-print">
      <label for="techDrawSelect" class="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Planche :</label>
      <select
        id="techDrawSelect"
        bind:value={appState.techDrawMode}
        class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        {#each DRAWING_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-x-auto">
    <svg viewBox="0 0 900 540" class="w-full h-auto min-w-[680px] max-h-[540px] font-mono">
      <defs>
        <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.6" />
        </pattern>
      </defs>

      <rect width="900" height="540" fill="#0f172a" />
      <rect width="900" height="540" fill="url(#cadGrid)" />
      <rect x="12" y="12" width="876" height="516" fill="none" stroke="#334155" stroke-width="1.5" />

      {#if appState.techDrawMode === 'ortho3'}
        <!-- 3 Views ISO E synchronized with the real 3D physical placement -->
        <text x="235" y="38" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">VUE DE FACE</text>
        <text x="660" y="38" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">VUE DE GAUCHE</text>
        <text x="235" y="266" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">VUE DE DESSUS</text>

        <!-- Front View -->
        <g stroke="#e2e8f0" stroke-width="2" fill="none">
          <!-- Front frame & brow bar -->
          <rect x="85" y="92" width="300" height="18" rx="4" />
          <rect x="105" y="110" width="100" height="68" rx="8" stroke="#38bdf8" />
          <rect x="265" y="110" width="100" height="68" rx="8" stroke="#38bdf8" />
          <path d="M 205 120 Q 235 134 265 120" />

          <!-- 05 Ultrasonic Ranger (Center Top Brow Saddle) -->
          <rect x="197" y="64" width="76" height="28" rx="3" stroke="#38bdf8" fill="#0c2d5e" />
          <circle cx="216" cy="78" r="9" stroke="#e2e8f0" stroke-width="1.5" />
          <circle cx="254" cy="78" r="9" stroke="#e2e8f0" stroke-width="1.5" />
          <text x="235" y="56" fill="#38bdf8" font-size="9" stroke="none" text-anchor="middle">05 Ultrason (Centre)</text>

          <!-- 04 Light Sensor LDR (Left Top Brow Saddle) -->
          <rect x="128" y="68" width="34" height="24" rx="3" stroke="#38bdf8" fill="#0c2d5e" />
          <circle cx="145" cy="80" r="6" stroke="#f87171" stroke-width="1.5" />
          <text x="145" y="59" fill="#93c5fd" font-size="9" stroke="none" text-anchor="middle">04 Lux</text>

          <!-- 07 LED 5mm (Left Outer Hinge Bracket) -->
          <rect x="58" y="88" width="24" height="24" rx="3" stroke="#facc15" fill="#0c2d5e" />
          <circle cx="70" cy="100" r="6" fill="#fef08a" stroke="#facc15" stroke-width="1.2" />
          <text x="64" y="80" fill="#facc15" font-size="9" stroke="none" text-anchor="middle">07 LED</text>

          <!-- 01 OV2640 Lens Pod (Right Outer Hinge) -->
          <rect x="388" y="88" width="24" height="24" rx="3" stroke="#10b981" fill="#0f172a" />
          <circle cx="400" cy="100" r="7" stroke="#10b981" stroke-width="1.6" />
          <text x="405" y="80" fill="#10b981" font-size="9" stroke="none" text-anchor="middle">01 OV2640</text>

          <!-- 08 OLED + 45° AR Prism (Upper-Outer Right Lens Corner — Clear Central Pupil) -->
          <rect x="322" y="114" width="38" height="22" rx="3" stroke="#a855f7" stroke-dasharray="3,2" />
          <text x="342" y="150" fill="#c084fc" font-size="8.5" stroke="none" text-anchor="middle">08 Prisme 45°</text>

          <!-- Dimension 160 mm -->
          <line x1="85" y1="198" x2="385" y2="198" stroke="#f43f5e" stroke-width="1" />
          <text x="235" y="212" fill="#f43f5e" font-size="11" stroke="none" text-anchor="middle">160 mm</text>
        </g>

        <!-- Left View (placed right of front view per ISO E) -->
        <g stroke="#e2e8f0" stroke-width="2" fill="none">
          <!-- Front rim profile + left temple + ear curve -->
          <rect x="540" y="92" width="16" height="86" rx="3" />
          <path d="M 556 102 L 758 102 Q 778 102 790 132" />

          <!-- 05 Ultrason & 04 Lux perched atop brow -->
          <rect x="536" y="64" width="22" height="28" rx="2" stroke="#38bdf8" fill="#0c2d5e" />
          <text x="547" y="56" fill="#38bdf8" font-size="8.5" stroke="none" text-anchor="middle">04/05</text>

          <!-- 03 Shield Grove clamped on outer left temple + 4 JST ports -->
          <rect x="598" y="96" width="96" height="44" rx="4" stroke="#38bdf8" fill="#1e293b" />
          <text x="646" y="120" fill="#38bdf8" font-size="9" stroke="none" text-anchor="middle">03 Shield Grove</text>
          <rect x="606" y="128" width="16" height="10" stroke="#f8fafc" stroke-width="1" />
          <rect x="628" y="128" width="16" height="10" stroke="#f8fafc" stroke-width="1" />
          <rect x="650" y="128" width="16" height="10" stroke="#f8fafc" stroke-width="1" />
          <rect x="672" y="128" width="16" height="10" stroke="#f8fafc" stroke-width="1" />
          <text x="646" y="155" fill="#94a3b8" font-size="8.5" stroke="none" text-anchor="middle">4 × JST (P0 P1 P2 I2C)</text>

          <!-- 02 micro:bit V2 docked directly inside Shield top edge connector -->
          <rect x="608" y="54" width="76" height="44" rx="4" stroke="#f59e0b" fill="#0f172a" />
          <line x1="608" y1="95" x2="684" y2="95" stroke="#eab308" stroke-width="4" />
          <text x="646" y="79" fill="#f59e0b" font-size="9.5" stroke="none" text-anchor="middle">02 micro:bit V2</text>

          <!-- Projection guidelines -->
          <line x1="385" y1="92" x2="540" y2="92" stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />
          <line x1="385" y1="178" x2="540" y2="178" stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />
        </g>

        <!-- Top View (placed below front view per ISO E) -->
        <g stroke="#e2e8f0" stroke-width="2" fill="none">
          <!-- Front frame & two temples -->
          <rect x="85" y="302" width="300" height="16" rx="4" />
          <rect x="88" y="318" width="14" height="175" rx="3" />
          <rect x="368" y="318" width="14" height="175" rx="3" />

          <!-- Front brow modules: Lux (left), Ultrasonic (center), OLED+Prism (right front corner) -->
          <rect x="130" y="294" width="32" height="10" stroke="#38bdf8" fill="#0c2d5e" />
          <rect x="197" y="290" width="76" height="14" stroke="#38bdf8" fill="#0c2d5e" />
          <rect x="322" y="280" width="46" height="18" rx="3" stroke="#a855f7" />
          <text x="345" y="274" fill="#c084fc" font-size="8.5" stroke="none" text-anchor="middle">08 OLED + Prisme</text>

          <!-- Left temple: Shield Grove + micro:bit V2 on outer face -->
          <rect x="66" y="362" width="20" height="82" rx="3" stroke="#f59e0b" fill="#1e293b" />
          <text x="58" y="405" fill="#f59e0b" font-size="8.5" stroke="none" text-anchor="end">02+03</text>
          <text x="58" y="418" fill="#f59e0b" font-size="8" stroke="none" text-anchor="end">micro:bit</text>

          <!-- Right temple: ESP32-CAM (front) + Buzzer (rear near ear) -->
          <rect x="384" y="328" width="18" height="60" rx="3" stroke="#10b981" fill="#0f172a" />
          <text x="410" y="360" fill="#10b981" font-size="8.5" stroke="none">01 ESP32-CAM</text>
          <rect x="384" y="422" width="18" height="28" rx="3" stroke="#f43f5e" fill="#0c2d5e" />
          <text x="410" y="440" fill="#fda4af" font-size="8.5" stroke="none">06 Buzzer (oreille)</text>

          <!-- Routed 4-wire Grove harness tucked cleanly behind brow bar and along temples -->
          <path d="M 86 382 L 94 316 L 374 316 L 382 428" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4,3" />
          <text x="235" y="336" fill="#f59e0b" font-size="9.5" stroke="none" text-anchor="middle">Faisceau Grove 4 fils (plaqué sur l’arc &amp; branches)</text>

          <!-- Projection guidelines -->
          <line x1="85" y1="178" x2="85" y2="302" stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />
          <line x1="385" y1="178" x2="385" y2="302" stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />
        </g>
      {:else if appState.techDrawMode === 'exploded_annotated'}
        <text x="450" y="42" fill="#38bdf8" font-size="14" font-weight="bold" text-anchor="middle">
          VUE ÉCLATÉE ANNOTÉE — IMPLANTATION ÉQUILIBRÉE DES 8 FONCTIONS
        </text>
        <g stroke="#38bdf8" stroke-width="1.8" fill="#1e293b">
          <rect x="290" y="185" width="320" height="58" rx="8" />
          <text x="450" y="218" fill="#f8fafc" font-size="12" stroke="none" text-anchor="middle">00 · Monture + Verres + Support nez</text>

          <rect x="48" y="76" width="184" height="52" rx="6" stroke="#f59e0b" />
          <text x="140" y="100" fill="#f59e0b" font-size="11" stroke="none" text-anchor="middle">02 · micro:bit V2</text>
          <text x="140" y="117" fill="#cbd5e1" font-size="9" stroke="none" text-anchor="middle">Enfichée dans Shield (branche G)</text>

          <rect x="48" y="275" width="184" height="52" rx="6" stroke="#38bdf8" />
          <text x="140" y="299" fill="#38bdf8" font-size="11" stroke="none" text-anchor="middle">03 · Shield Grove (4 JST)</text>
          <text x="140" y="316" fill="#cbd5e1" font-size="9" stroke="none" text-anchor="middle">Brides 3D branche gauche</text>

          <rect x="330" y="72" width="240" height="54" rx="6" stroke="#38bdf8" />
          <text x="450" y="96" fill="#e0f2fe" font-size="11" stroke="none" text-anchor="middle">05 Ultrason · 04 Lux · 07 LED</text>
          <text x="450" y="113" fill="#93c5fd" font-size="9" stroke="none" text-anchor="middle">Selles arc frontal &amp; charnière gauche</text>

          <rect x="665" y="76" width="185" height="52" rx="6" stroke="#10b981" />
          <text x="757" y="100" fill="#10b981" font-size="11" stroke="none" text-anchor="middle">01 · ESP32-CAM OV2640</text>
          <text x="757" y="117" fill="#cbd5e1" font-size="9" stroke="none" text-anchor="middle">Branche droite + nappe FPC avant</text>

          <rect x="665" y="275" width="185" height="52" rx="6" stroke="#a855f7" />
          <text x="757" y="299" fill="#c084fc" font-size="11" stroke="none" text-anchor="middle">08 · OLED + Prisme 45° / 06 Buzzer</text>
          <text x="757" y="316" fill="#cbd5e1" font-size="9" stroke="none" text-anchor="middle">Coin ext. droit &amp; oreille droite</text>
        </g>
        <g stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3">
          <line x1="232" y1="102" x2="290" y2="195" />
          <line x1="232" y1="301" x2="290" y2="230" />
          <line x1="140" y1="128" x2="140" y2="275" stroke="#f59e0b" />
          <line x1="450" y1="126" x2="450" y2="185" />
          <line x1="665" y1="102" x2="610" y2="195" />
          <line x1="665" y1="301" x2="610" y2="230" />
        </g>
      {:else if appState.techDrawMode === 'comp_microbit'}
        <text x="450" y="45" fill="#38bdf8" font-size="15" font-weight="bold" text-anchor="middle">
          DESSIN DE DÉFINITION : CARTE MICRO:BIT V2 (CIBLE ÉLÈVES)
        </text>
        <g stroke="#e2e8f0" stroke-width="2" fill="none">
          <rect x="240" y="95" width="360" height="260" rx="14" fill="#1e293b" />
          <rect x="240" y="315" width="360" height="40" fill="#eab308" stroke="#fef08a" />
          <circle cx="275" cy="335" r="10" fill="#0f172a" stroke="#eab308" />
          <circle cx="340" cy="335" r="10" fill="#0f172a" stroke="#eab308" />
          <circle cx="420" cy="335" r="10" fill="#0f172a" stroke="#eab308" />
          <circle cx="500" cy="335" r="10" fill="#0f172a" stroke="#eab308" />
          <circle cx="565" cy="335" r="10" fill="#0f172a" stroke="#eab308" />
          <text x="275" y="339" fill="#fef08a" font-size="10" stroke="none" text-anchor="middle">0</text>
          <text x="340" y="339" fill="#fef08a" font-size="10" stroke="none" text-anchor="middle">1</text>
          <text x="420" y="339" fill="#fef08a" font-size="10" stroke="none" text-anchor="middle">2</text>
          <text x="500" y="339" fill="#fef08a" font-size="10" stroke="none" text-anchor="middle">3V</text>
          <text x="565" y="339" fill="#fef08a" font-size="10" stroke="none" text-anchor="middle">GND</text>
          <!-- 5x5 LED matrix symbol -->
          {#each [0, 1, 2, 3, 4] as r}
            {#each [0, 1, 2, 3, 4] as c}
              <rect x={370 + c * 22} y={150 + r * 22} width="10" height="14" fill="#ef4444" stroke="none" />
            {/each}
          {/each}
          <rect x="275" y="195" width="30" height="30" rx="4" stroke="#38bdf8" />
          <text x="290" y="215" fill="#38bdf8" font-size="13" stroke="none" text-anchor="middle">A</text>
          <rect x="535" y="195" width="30" height="30" rx="4" stroke="#38bdf8" />
          <text x="550" y="215" fill="#38bdf8" font-size="13" stroke="none" text-anchor="middle">B</text>
          <!-- Cotes -->
          <line x1="240" y1="74" x2="600" y2="74" stroke="#f43f5e" stroke-width="1.2" />
          <text x="420" y="68" fill="#f43f5e" font-size="12" stroke="none" text-anchor="middle">52 mm</text>
          <line x1="210" y1="95" x2="210" y2="355" stroke="#f43f5e" stroke-width="1.2" />
          <text x="195" y="228" fill="#f43f5e" font-size="12" stroke="none" text-anchor="middle">42</text>
        </g>
      {:else}
        {@const spec = componentSpecs[appState.techDrawMode] ?? componentSpecs.comp_shield}
        <text x="450" y="48" fill="#38bdf8" font-size="15" font-weight="bold" text-anchor="middle">
          DESSIN DE DÉFINITION : {spec.title}
        </text>
        <g stroke="#38bdf8" stroke-width="2" fill="#1e293b">
          <rect x="240" y="110" width="420" height="220" rx="10" />
          <rect x="265" y="135" width="370" height="170" rx="4" fill="#0f172a" stroke="#475569" stroke-dasharray="4,3" />
          <text x="450" y="195" fill="#f8fafc" font-size="14" stroke="none" text-anchor="middle">{spec.title}</text>
          <text x="450" y="226" fill="#38bdf8" font-size="12" stroke="none" text-anchor="middle">Encombrement : {spec.dims}</text>
          <text x="450" y="256" fill="#eab308" font-size="11" stroke="none" text-anchor="middle">{spec.pins}</text>
          <line x1="240" y1="88" x2="660" y2="88" stroke="#f43f5e" stroke-width="1.2" />
          <text x="450" y="82" fill="#f43f5e" font-size="11" stroke="none" text-anchor="middle">{spec.w}</text>
          <line x1="216" y1="110" x2="216" y2="330" stroke="#f43f5e" stroke-width="1.2" />
          <text x="196" y="225" fill="#f43f5e" font-size="11" stroke="none" text-anchor="middle">{spec.h}</text>
        </g>
      {/if}

      <!-- NF EN ISO 7200 Standardized Title Block (Cartouche) -->
      <g transform="translate(472, 400)" stroke="#e2e8f0" stroke-width="1.3" fill="none">
        <rect x="0" y="0" width="404" height="118" fill="#0f172a" />
        <line x1="0" y1="30" x2="404" y2="30" />
        <line x1="0" y1="60" x2="404" y2="60" />
        <line x1="0" y1="90" x2="404" y2="90" />
        <line x1="236" y1="0" x2="236" y2="118" />

        <!-- European Projection Symbol (ISO E) -->
        <g transform="translate(14, 6)" stroke="#38bdf8" stroke-width="1.2">
          <polygon points="4,14 20,7 20,21 4,14" fill="none" />
          <circle cx="34" cy="14" r="7" fill="none" />
          <line x1="0" y1="14" x2="44" y2="14" stroke-dasharray="2,2" />
        </g>

        <text x="68" y="20" fill="#f8fafc" font-size="10.5" font-weight="bold" stroke="none">TechnoLOY Guadeloupe · Cycle 4</text>
        <text x="10" y="49" fill="#facc15" font-size="10" font-weight="bold" stroke="none">OBJET : LUNETTES CONNECTÉES IA</text>
        <text x="10" y="79" fill="#38bdf8" font-size="10" stroke="none">ÉCHELLE : 1:1 · FORMAT : A4</text>
        <text x="10" y="108" fill="#94a3b8" font-size="9.5" stroke="none">NORME : Projection ISO E</text>

        <text x="246" y="20" fill="#38bdf8" font-size="10" font-weight="bold" stroke="none">DESSINATEUR / ÉLÈVE :</text>
        <text x="246" y="49" fill="#ffffff" font-size="10.5" font-weight="bold" stroke="none">
          {(appState.studentInfo.prenom || 'PRÉNOM').toUpperCase()} {(appState.studentInfo.nom || 'NOM').toUpperCase()}
        </text>
        <text x="246" y="79" fill="#fbbf24" font-size="10" stroke="none">
          NIVEAU : {appState.studentInfo.niveau} · CLASSE : {appState.studentInfo.classe || '---'}
        </text>
        <text x="246" y="108" fill="#94a3b8" font-size="9.5" stroke="none">
          GROUPE : {appState.studentInfo.groupe || '---'} · {appState.studentInfo.date}
        </text>
      </g>
    </svg>
  </div>
</section>
