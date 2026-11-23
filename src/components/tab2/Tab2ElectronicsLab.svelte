<script lang="ts">
  import { ExternalLink } from 'lucide-svelte';
  import type { GradeLevel } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import { playBuzzerTone } from '../../lib/utils/audio';
  import BlockEditor from './BlockEditor.svelte';
  import ElectronicLab from './ElectronicLab.svelte';
  import LabChallenges from './LabChallenges.svelte';
  import LogigrammeGraph from './LogigrammeGraph.svelte';
  import MqttWebSocketLab from './MqttWebSocketLab.svelte';
  import WiringBenchSVG from './WiringBenchSVG.svelte';

  function handleScenarioChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as GradeLevel;
    appState.setScenario(val);
  }

  function pressBtnA() {
    appState.btnAPressed = true;
    appState.btnBPressed = false;
    playBuzzerTone(1600, 110, appState.ebepMode);
  }

  function pressBtnB() {
    appState.btnBPressed = true;
    appState.btnAPressed = false;
    playBuzzerTone(1900, 110, appState.ebepMode);
  }

  function resetIhm() {
    appState.btnAPressed = false;
    appState.btnBPressed = false;
  }

  // Trigger subtle audio alert when buzzer activates via slider
  let prevBuzzer = false;
  $effect(() => {
    const active = appState.isBuzzerActive;
    if (active && !prevBuzzer) {
      playBuzzerTone(2000, 140, appState.ebepMode);
    }
    prevBuzzer = active;
  });
</script>

<div class="space-y-6">
  <!-- Scenario & Sensor Controls Bar -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Banc de Test Électronique & Programmation par Blocs</h2>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Ajustez les capteurs ci-dessous pour observer en direct l’impact sur le câblage, les blocs et le logigramme.
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <label for="labScenario" class="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Scénario :</label>
        <select
          id="labScenario"
          value={appState.labScenario}
          onchange={handleScenarioChange}
          class="bg-slate-50 dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 text-xs rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="5e">5e : Éclairage de sécurité (micro:bit + Lux + LED + Buzzer)</option>
          <option value="4e">4e : Détection d’obstacle AR (Ultrason + OLED + Buzzer)</option>
          <option value="3e">3e : IHM boutons A/B + Décision MQTT T14</option>
        </select>
      </div>
    </div>

    <!-- Live Sensor Controls -->
    {#if appState.labScenario === '5e'}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <label for="luxSlider" class="flex justify-between font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            <span>Luminosité ambiante</span>
            <span class="font-mono tabular-nums text-sky-700 dark:text-sky-400">{appState.luxValue} lux</span>
          </label>
          <input
            id="luxSlider"
            type="range"
            min="0"
            max="100"
            bind:value={appState.luxValue}
            oninput={() => appState.saveToStorage()}
            class="w-full accent-sky-600 dark:accent-sky-400 cursor-pointer"
          />
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <div class="text-slate-500 dark:text-slate-400 font-medium">Seuil actif (bloc SI)</div>
          <div class="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">{appState.activeThreshold} lux</div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onclick={() => (appState.luxValue = 20)}
            class="px-3 py-2 rounded-lg bg-slate-900 dark:bg-sky-600 text-white font-semibold hover:bg-slate-800 dark:hover:bg-sky-500 cursor-pointer"
          >
            Tester zone sombre (20 lux)
          </button>
          <button
            type="button"
            onclick={() => (appState.luxValue = 85)}
            class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            Tester plein jour (85 lux)
          </button>
        </div>
      </div>
    {:else if appState.labScenario === '4e'}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <label for="distSlider" class="flex justify-between font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            <span>Distance obstacle mesurée</span>
            <span class="font-mono tabular-nums text-sky-700 dark:text-sky-400">{appState.distValue} cm</span>
          </label>
          <input
            id="distSlider"
            type="range"
            min="5"
            max="50"
            bind:value={appState.distValue}
            oninput={() => appState.saveToStorage()}
            class="w-full accent-sky-600 dark:accent-sky-400 cursor-pointer"
          />
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <div class="text-slate-500 dark:text-slate-400 font-medium">Seuil sécurité (bloc SI)</div>
          <div class="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">{appState.activeThreshold} cm</div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onclick={() => (appState.distValue = 12)}
            class="px-3 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
          >
            Obstacle proche (12 cm)
          </button>
          <button
            type="button"
            onclick={() => (appState.distValue = 35)}
            class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            Zone libre (35 cm)
          </button>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <label for="dist3eSlider" class="flex justify-between font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            <span>Distance ultrason</span>
            <span class="font-mono tabular-nums text-sky-700 dark:text-sky-400">{appState.distValue} cm</span>
          </label>
          <input
            id="dist3eSlider"
            type="range"
            min="5"
            max="50"
            bind:value={appState.distValue}
            oninput={() => appState.saveToStorage()}
            class="w-full accent-sky-600 dark:accent-sky-400 cursor-pointer"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onclick={pressBtnA}
            class="px-3 py-2 rounded-lg font-semibold cursor-pointer {appState.btnAPressed
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            Bouton A · FABRICATION
          </button>
          <button
            type="button"
            onclick={pressBtnB}
            class="px-3 py-2 rounded-lg font-semibold cursor-pointer {appState.btnBPressed
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            Bouton B · RÉPARATION
          </button>
          <button
            type="button"
            onclick={resetIhm}
            class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            VEILLE
          </button>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <div class="text-slate-500 dark:text-slate-400 font-medium">État IHM transmis</div>
          <div class="text-base font-bold font-mono text-sky-700 dark:text-sky-400 mt-0.5">{appState.ihModeLabel}</div>
        </div>
      </div>
    {/if}
  </section>

  <!-- Auto-Validated Practical Challenges by Grade Level -->
  <LabChallenges />

  <!-- Interactive Grid Lab: Battery, Sensor, LED + Short-Circuit Detection -->
  <ElectronicLab />

  <!-- Interactive Wire-by-Wire Shield Grove Workbench -->
  <WiringBenchSVG />

  <!-- Drag & Drop Block Editor + Read-Only MicroPython -->
  <BlockEditor />

  <!-- Cytoscape.js Reactive Flowchart -->
  <LogigrammeGraph />

  <!-- Local MQTT WebSocket Configuration & JSON Payload Viewer -->
  <MqttWebSocketLab />

  <!-- Optional External Online Simulators -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 no-print">
    <h4 class="text-xs font-semibold text-slate-600 dark:text-slate-400">
      Simulateurs complémentaires en ligne (optionnels, nécessitent un accès Internet)
    </h4>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <a
        href="https://velxio.dev"
        target="_blank"
        rel="noopener noreferrer"
        class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 dark:bg-slate-800/40 flex items-center justify-between gap-3 transition-colors"
      >
        <div>
          <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">Velxio Dev Engine</div>
          <p class="text-xs text-slate-600 dark:text-slate-400">Prototypage matériel / logiciel multi-cartes dans le navigateur.</p>
        </div>
        <ExternalLink class="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      </a>
      <a
        href="https://bredbord.vercel.app/app/"
        target="_blank"
        rel="noopener noreferrer"
        class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 dark:bg-slate-800/40 flex items-center justify-between gap-3 transition-colors"
      >
        <div>
          <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">Bredbord Simulation App</div>
          <p class="text-xs text-slate-600 dark:text-slate-400">Plaque d’essai virtuelle pour s’exercer au câblage sans matériel.</p>
        </div>
        <ExternalLink class="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      </a>
    </div>
  </section>
</div>
