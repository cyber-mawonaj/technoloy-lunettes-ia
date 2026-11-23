<script lang="ts">
  import { CheckCircle2, Circle, Target } from 'lucide-svelte';
  import { appState } from '../../lib/stores/appState.svelte';

  const challenges = $derived.by(() => {
    if (appState.labScenario === '5e') {
      return [
        {
          id: 'c5_1',
          title: 'Circuit grille sans court-circuit',
          desc: 'Relier Batterie 5V, Capteur et LED sur la grille SVG sans défaut de polarité ni court-circuit.',
          done: appState.electronicGridValid && !appState.electronicGridShort,
        },
        {
          id: 'c5_2',
          title: 'Détection zone sombre active',
          desc: 'Régler la luminosité sous le seuil pour allumer la LED (P1) et activer le buzzer (P2).',
          done: appState.isLedActive && appState.isBuzzerActive,
        },
        {
          id: 'c5_3',
          title: 'Continuité électrique Shield Grove',
          desc: 'Vérifier que le buzzer (P2) n’est pas en panne fil et que le câblage est conforme.',
          done: !appState.hasElectricalError && !appState.buzzerFault,
        },
      ];
    }
    if (appState.labScenario === '4e') {
      return [
        {
          id: 'c4_1',
          title: 'Afficheur OLED câblé sur I2C',
          desc: 'Câbler l’écran OLED sur le port I2C et intégrer le bloc « Afficher sur OLED I2C ».',
          done: appState.isOledActive,
        },
        {
          id: 'c4_2',
          title: 'Alerte obstacle proche (< seuil)',
          desc: 'Placer l’obstacle sous le seuil de sécurité pour déclencher le buzzer et le HUD.',
          done: appState.isConditionTriggered && appState.isBuzzerActive && !appState.hasElectricalError,
        },
        {
          id: 'c4_3',
          title: 'Grille électrique sécurisée',
          desc: 'Maintenir la résistance 220 Ω active et aucun court-circuit sur la grille SVG.',
          done: !appState.electronicGridShort && !appState.electronicGridResistorBypassed,
        },
      ];
    }
    return [
      {
        id: 'c3_1',
        title: 'Chaîne complète capteurs + IHM',
        desc: 'Activer simultanément le câblage OLED I2C, LED P1 et Buzzer P2 sans erreur électrique.',
        done: appState.isOledActive && !appState.hasElectricalError && !appState.electronicGridShort,
      },
      {
        id: 'c3_2',
        title: 'Télémesure JSON émise en WebSocket',
        desc: 'Connecter la passerelle WebSocket locale et émettre au moins une trame JSON.',
        done: appState.mqttSentCount > 0,
      },
      {
        id: 'c3_3',
        title: 'Sauvegarde d’une variante de programme',
        desc: 'Enregistrer une version locale de votre assemblage de blocs pour comparaison.',
        done: appState.programDrafts.length > 0,
      },
    ];
  });

  const completedCount = $derived(challenges.filter((c) => c.done).length);
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div class="flex items-center gap-2">
      <Target class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Défis Pratiques Auto-Validés — Niveau {appState.labScenario}
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Les objectifs ci-dessous se valident automatiquement selon vos branchements, vos blocs et vos tests.
        </p>
      </div>
    </div>
    <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-md border {completedCount === challenges.length
      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}">
      {completedCount} / {challenges.length} validés
    </span>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    {#each challenges as ch (ch.id)}
      <div
        class="p-3.5 rounded-xl border text-xs space-y-1 transition-colors {ch.done
          ? 'bg-emerald-50/70 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800'
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'}"
      >
        <div class="flex items-center gap-1.5 font-semibold {ch.done ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}">
          {#if ch.done}
            <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {:else}
            <Circle class="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {/if}
          <span>{ch.title}</span>
        </div>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed pl-5.5">{ch.desc}</p>
      </div>
    {/each}
  </div>
</section>
