<script lang="ts">
  import mqtt, { type MqttClient } from 'mqtt';
  import { onDestroy } from 'svelte';
  import { CheckCircle2, Plus, Radio, Send, Terminal, Trash2, XCircle } from 'lucide-svelte';
  import { MOSQUITTO_CHEATSHEET } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import AiVsRuleLab from './AiVsRuleLab.svelte';
  import NetworkTopologyGraph from './NetworkTopologyGraph.svelte';

  let cliMode = $state<'putty' | 'cmd'>('putty');
  let cmdInput = $state('');
  let pulseTrigger = $state(0);
  let pulseSource = $state('esp32c3');

  // Optional live WebSocket MQTT connection (Port 9001 on Mosquitto RPi 400)
  let wsUrl = $state(`ws://${appState.brokerIp}:9001`);
  let wsUser = $state('');
  let wsPass = $state('');
  let mqttClient: MqttClient | null = null;

  $effect(() => {
    if (!mqttClient) {
      wsUrl = `ws://${appState.brokerIp}:9001`;
    }
  });

  onDestroy(() => {
    mqttClient?.end(true);
    mqttClient = null;
  });

  function triggerPulse(source: string) {
    pulseSource = source;
    pulseTrigger += 1;
  }

  function handleArchitectureChange(e: Event) {
    appState.netArch = (e.target as HTMLSelectElement).value as 'ap' | 'lan';
    appState.pushTerminalLog(`Architecture basculée -> Broker ${appState.brokerIp}:1883`, 'info');
    appState.saveToStorage();
  }

  function handleTopicChange(e: Event) {
    appState.topicConvention = (e.target as HTMLSelectElement).value as 'v21' | 'v10';
    appState.pushTerminalLog(`Convention de topics active -> ${appState.topicBase}/*`, 'info');
    appState.saveToStorage();
  }

  function connectLiveWebSocket() {
    if (mqttClient) {
      mqttClient.end(true);
      mqttClient = null;
      appState.wsStatus = 'disconnected';
      appState.wsEnabled = false;
      appState.pushTerminalLog('Déconnexion du broker WebSocket réel.', 'info');
      return;
    }

    appState.wsStatus = 'connecting';
    appState.wsEnabled = true;
    appState.pushTerminalLog(`Tentative de connexion WebSocket vers ${wsUrl}...`, 'ws');

    try {
      mqttClient = mqtt.connect(wsUrl, {
        username: wsUser || undefined,
        password: wsPass || undefined,
        reconnectPeriod: 0,
        connectTimeout: 4000,
      });

      mqttClient.on('connect', () => {
        appState.wsStatus = 'connected';
        appState.pushTerminalLog(`Connecté au broker réel ${wsUrl} · Abonnement à atelier/#`, 'ok');
        mqttClient?.subscribe('atelier/#');
      });

      mqttClient.on('message', (topic, payload) => {
        appState.pushTerminalLog(`[LIVE WS] ${topic} -> ${payload.toString()}`, 'ws');
        triggerPulse('esp32c3');
      });

      mqttClient.on('error', (err) => {
        appState.wsStatus = 'error';
        appState.pushTerminalLog(`Erreur WebSocket : ${err.message} (Simulateur local toujours actif)`, 'alert');
        mqttClient?.end(true);
        mqttClient = null;
      });
    } catch {
      appState.wsStatus = 'error';
      appState.pushTerminalLog('Impossible d’ouvrir la connexion WebSocket (vérifier listener 9001 sur Mosquitto).', 'alert');
    }
  }

  function execQuickCmd(kind: 'sub' | 'pub_danger' | 'pub_ok' | 'pub_mode') {
    const base = appState.topicBase;
    const prefix = cliMode === 'cmd' ? 'mosquitto_pub.exe' : 'mosquitto_pub';
    const subCmd = cliMode === 'cmd' ? 'mosquitto_sub.exe' : 'mosquitto_sub';

    if (kind === 'sub') {
      appState.pushTerminalLog(`$ ${subCmd} -h ${appState.brokerIp} -t "${base}/#" -v`, 'cmd');
      appState.pushTerminalLog(`Abonnement actif sur ${appState.brokerIp}:1883 (${base}/#)`, 'ok');
      return;
    }

    if (kind === 'pub_danger') {
      appState.pushTerminalLog(`$ ${prefix} -h ${appState.brokerIp} -t "${base}/distance" -m "15"`, 'cmd');
      appState.pushTerminalLog(`[BROKER] ${base}/distance = 15 cm`, 'info');
      appState.pushTerminalLog(`[RÈGLE SIMULÉE T14] 15 < 20 cm -> Publication ${base}/ia = ALERTE`, 'alert');
      if (mqttClient && appState.wsStatus === 'connected') {
        mqttClient.publish(`${base}/distance`, '15');
      }
      triggerPulse('esp32c3');
      return;
    }

    if (kind === 'pub_ok') {
      appState.pushTerminalLog(`$ ${prefix} -h ${appState.brokerIp} -t "${base}/distance" -m "35"`, 'cmd');
      appState.pushTerminalLog(`[BROKER] ${base}/distance = 35 cm`, 'info');
      appState.pushTerminalLog(`[RÈGLE SIMULÉE T14] 35 >= 20 cm -> Publication ${base}/ia = RAS`, 'ok');
      if (mqttClient && appState.wsStatus === 'connected') {
        mqttClient.publish(`${base}/distance`, '35');
      }
      triggerPulse('esp32c3');
      return;
    }

    appState.pushTerminalLog(`$ ${prefix} -h ${appState.brokerIp} -t "${base}/mode" -m "FABRICATION"`, 'cmd');
    appState.pushTerminalLog(`[BROKER] ${base}/mode = FABRICATION`, 'ok');
    if (mqttClient && appState.wsStatus === 'connected') {
      mqttClient.publish(`${base}/mode`, 'FABRICATION');
    }
    triggerPulse('pc_prof');
  }

  function handleTerminalSubmit(e: Event) {
    e.preventDefault();
    const raw = cmdInput.trim();
    if (!raw) return;
    appState.pushTerminalLog(`$ ${raw}`, 'cmd');

    if (raw.includes('mosquitto_sub')) {
      appState.pushTerminalLog(`Écoute démarrée sur le broker ${appState.brokerIp}:1883.`, 'ok');
    } else if (raw.includes('mosquitto_pub')) {
      const mMatch = raw.match(/-m\s+"?([^"]+)"?/);
      const val = mMatch?.[1] ?? '';
      appState.pushTerminalLog(`Message délivré au broker (${appState.brokerIp}).`, 'ok');
      const num = Number(val);
      if (Number.isFinite(num) && raw.includes('distance')) {
        const decision = num < 20 ? 'ALERTE' : 'RAS';
        appState.pushTerminalLog(
          `[RÈGLE SIMULÉE T14] Distance ${num} cm -> ${decision}`,
          num < 20 ? 'alert' : 'ok',
        );
      }
      triggerPulse('pc_prof');
    } else {
      appState.pushTerminalLog('Commande exécutée dans le terminal simulé.', 'info');
    }
    cmdInput = '';
  }

  // Experimental Protocol Table (3e)
  function addProtocolRow() {
    const nextId = appState.protocolRows.length + 1;
    appState.protocolRows = [
      ...appState.protocolRows,
      { id: nextId, dist: 25, exp: 'RAS', obs: 'RAS', delay: 0.13, pass: true, note: 'Essai ajouté' },
    ];
    appState.saveToStorage();
  }

  function removeProtocolRow(id: number) {
    appState.protocolRows = appState.protocolRows.filter((r) => r.id !== id);
    appState.saveToStorage();
  }

  function updateRow(idx: number) {
    const row = appState.protocolRows[idx];
    if (row) {
      row.exp = row.dist < 20 ? 'ALERTE' : 'RAS';
      row.pass = row.exp === row.obs;
    }
    appState.saveToStorage();
  }

  const avgDelay = $derived.by(() => {
    if (appState.protocolRows.length === 0) return '0.00';
    const sum = appState.protocolRows.reduce((acc, r) => acc + (Number(r.delay) || 0), 0);
    return (sum / appState.protocolRows.length).toFixed(2);
  });

  const successRate = $derived.by(() => {
    if (appState.protocolRows.length === 0) return 100;
    const ok = appState.protocolRows.filter((r) => r.pass).length;
    return Math.round((ok / appState.protocolRows.length) * 100);
  });
</script>

<div class="space-y-6">
  <!-- Architecture & Topics Configuration -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="netArchSelect" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        Architecture réseau de la salle (v2.1 vs v1.0)
      </label>
      <select
        id="netArchSelect"
        value={appState.netArch}
        onchange={handleArchitectureChange}
        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="ap">Point d’Accès dédié ReseauAtelier 2,4 GHz (10.42.0.1 · Fiche T3bis v2.1)</option>
        <option value="lan">Réseau local de la salle Techno (192.168.1.50 · Décision D1 v1.0)</option>
      </select>
    </div>

    <div>
      <label for="topicConventionSelect" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        Convention des Topics Mosquitto MQTT
      </label>
      <select
        id="topicConventionSelect"
        value={appState.topicConvention}
        onchange={handleTopicChange}
        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="v21">v2.1 Normalisée : atelier/poste1/distance · atelier/poste1/ia</option>
        <option value="v10">v1.0 Standard : atelier/lunettes/distance · atelier/lunettes/alerte</option>
      </select>
    </div>
  </section>

  <!-- Network Topology Graph (Cytoscape.js) -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Topologie Wi-Fi 2,4 GHz & Broker Mosquitto (Cytoscape.js)
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Cliquez sur un équipement pour afficher son rôle. Les cartes Wi-Fi (ESP32-C3, Pico W, ESP32-CAM) sont préprogrammées par l’enseignant.
        </p>
      </div>
      <span class="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-md tabular-nums">
        Broker : {appState.brokerIp}:1883
      </span>
    </div>

    <NetworkTopologyGraph {pulseTrigger} {pulseSource} />
  </section>

  <!-- Dual Console Simulator (PuTTY SSH + CMD Windows) + Optional Live WebSocket -->
  <section class="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
      <div class="flex items-center gap-2">
        <Terminal class="w-4 h-4 text-sky-400" />
        <h3 class="text-sm font-semibold text-white">
          Console Réseau & Règle de Décision Simulée T14 (ia_atelier.py)
        </h3>
      </div>

      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-lg bg-slate-800 p-0.5 text-xs">
          <button
            type="button"
            onclick={() => (cliMode = 'putty')}
            class="px-2.5 py-1 rounded-md font-medium cursor-pointer {cliMode === 'putty'
              ? 'bg-sky-600 text-white'
              : 'text-slate-300 hover:text-white'}"
          >
            PuTTY SSH (RPi)
          </button>
          <button
            type="button"
            onclick={() => (cliMode = 'cmd')}
            class="px-2.5 py-1 rounded-md font-medium cursor-pointer {cliMode === 'cmd'
              ? 'bg-sky-600 text-white'
              : 'text-slate-300 hover:text-white'}"
          >
            CMD Windows
          </button>
        </div>

        <button
          type="button"
          onclick={() => (appState.terminalLogs = [])}
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" /> Effacer
        </button>
      </div>
    </div>

    <!-- Honest T14 Disclaimer + Optional Real WebSocket Panel -->
    <div class="bg-slate-800/80 border border-slate-700 rounded-lg p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
      <p class="text-slate-300 leading-relaxed max-w-xl">
        <strong>Note technique :</strong> Le script serveur <code class="text-sky-300">T14 (ia_atelier.py)</code>
        applique une <strong>règle de seuil déterministe simulée</strong> (<code class="text-amber-300">distance &lt; 20 cm</code>) et non un modèle d’IA réel.
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          bind:value={wsUrl}
          aria-label="URL WebSocket Mosquitto"
          class="w-44 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
        />
        <input
          type="text"
          bind:value={wsUser}
          placeholder="Identifiant (opt.)"
          aria-label="Identifiant MQTT"
          class="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
        />
        <input
          type="password"
          bind:value={wsPass}
          placeholder="Mot de passe"
          aria-label="Mot de passe MQTT"
          class="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
        />
        <button
          type="button"
          onclick={connectLiveWebSocket}
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded font-semibold cursor-pointer {appState.wsStatus === 'connected'
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-100'}"
        >
          <Radio class="w-3.5 h-3.5" />
          {appState.wsStatus === 'connected' ? 'WebSocket Connecté' : 'Connecter Broker :9001'}
        </button>
      </div>
    </div>

    <!-- Quick Experimentation Buttons -->
    <div class="flex flex-wrap gap-2 text-xs font-mono">
      <button
        type="button"
        onclick={() => execQuickCmd('sub')}
        class="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
      >
        mosquitto_sub (Écouter atelier)
      </button>
      <button
        type="button"
        onclick={() => execQuickCmd('pub_danger')}
        class="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 cursor-pointer"
      >
        Publier distance = 15 cm (ALERTE)
      </button>
      <button
        type="button"
        onclick={() => execQuickCmd('pub_ok')}
        class="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
      >
        Publier distance = 35 cm (RAS)
      </button>
      <button
        type="button"
        onclick={() => execQuickCmd('pub_mode')}
        class="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer"
      >
        Publier mode = FABRICATION
      </button>
    </div>

    <!-- Terminal Log Output -->
    <div class="h-52 overflow-y-auto bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs space-y-1">
      {#each appState.terminalLogs as log (log.id)}
        <div
          class={log.tone === 'alert'
            ? 'text-rose-400 font-semibold'
            : log.tone === 'ok'
              ? 'text-emerald-400'
              : log.tone === 'cmd'
                ? 'text-amber-300 font-semibold'
                : log.tone === 'ws'
                  ? 'text-sky-300'
                  : 'text-slate-300'}
        >
          <span class="text-slate-500 tabular-nums">[{log.time}]</span> {log.text}
        </div>
      {/each}
    </div>

    <!-- Command Input -->
    <form onsubmit={handleTerminalSubmit} class="flex items-center gap-2 font-mono text-xs">
      <span class="text-amber-400 font-semibold whitespace-nowrap">
        {cliMode === 'putty' ? `pi@${appState.brokerIp}:~$` : 'C:\\Mosquitto>'}
      </span>
      <input
        type="text"
        bind:value={cmdInput}
        placeholder="Saisir mosquitto_pub ou mosquitto_sub..."
        class="flex-grow bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <button
        type="submit"
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-sans font-semibold cursor-pointer"
      >
        <Send class="w-3.5 h-3.5" /> Exécuter
      </button>
    </form>
  </section>

  <!-- Comparative Critical Thinking Lab: T14 Rule vs Simulated Vision AI -->
  <AiVsRuleLab />

  <!-- Mosquitto Cheat Sheet (M. Rousset — Lycée Charles Coeffin) -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Fiche Synthèse Commandes Mosquitto MQTT</h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Ressource de référence — Adaptée des travaux de M. Rousset (Lycée Charles Coeffin, Baie-Mahault).
        </p>
      </div>
      <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Port local TCP 1883 · allow_anonymous false</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
            <th class="p-2.5 font-semibold">Commande / Option</th>
            <th class="p-2.5 font-semibold">Rôle pédagogique & technique</th>
            <th class="p-2.5 font-semibold">Exemple de syntaxe</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {#each MOSQUITTO_CHEATSHEET as row}
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="p-2.5 font-mono font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap">{row.cmd}</td>
              <td class="p-2.5 text-slate-700 dark:text-slate-300">{row.desc}</td>
              <td class="p-2.5 font-mono bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-200">{row.example}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- 3e Experimental Protocol Matrix -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 print-break-inside-avoid">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Protocole d’Essais Expérimentaux & Latence (Niveau 3e)
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Consignez vos 5 essais pour évaluer le temps de réponse moyen, le taux de réussite et les éventuels faux positifs/négatifs.
        </p>
      </div>
      <button
        type="button"
        onclick={addProtocolRow}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer no-print shrink-0"
      >
        <Plus class="w-3.5 h-3.5" /> Ajouter un essai
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
            <th class="p-2 font-semibold">N°</th>
            <th class="p-2 font-semibold">Distance (cm)</th>
            <th class="p-2 font-semibold">Attendu</th>
            <th class="p-2 font-semibold">Observé</th>
            <th class="p-2 font-semibold">Délai (s)</th>
            <th class="p-2 font-semibold">Conformité</th>
            <th class="p-2 font-semibold">Analyse / Biais</th>
            <th class="p-2 font-semibold no-print">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
          {#each appState.protocolRows as row, i (row.id)}
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="p-2 font-mono font-bold dark:text-slate-200">{i + 1}</td>
              <td class="p-2">
                <input
                  type="number"
                  bind:value={row.dist}
                  oninput={() => updateRow(i)}
                  class="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-1.5 py-1 text-center font-mono"
                />
              </td>
              <td class="p-2 font-mono font-semibold dark:text-slate-200">{row.exp}</td>
              <td class="p-2">
                <select
                  bind:value={row.obs}
                  onchange={() => updateRow(i)}
                  class="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-1.5 py-1 font-mono font-semibold"
                >
                  <option value="ALERTE">ALERTE</option>
                  <option value="RAS">RAS</option>
                </select>
              </td>
              <td class="p-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={row.delay}
                  oninput={() => updateRow(i)}
                  class="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-1.5 py-1 text-center font-mono"
                />
              </td>
              <td class="p-2 font-semibold">
                {#if row.pass}
                  <span class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 class="w-3.5 h-3.5" /> Conforme
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                    <XCircle class="w-3.5 h-3.5" /> Écart
                  </span>
                {/if}
              </td>
              <td class="p-2">
                <input
                  type="text"
                  bind:value={row.note}
                  oninput={() => appState.saveToStorage()}
                  class="w-full min-w-[140px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2 py-1"
                />
              </td>
              <td class="p-2 no-print">
                <button
                  type="button"
                  onclick={() => removeProtocolRow(row.id)}
                  title="Supprimer cet essai"
                  class="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs tabular-nums">
      <div>
        <div class="text-slate-500 dark:text-slate-400">Essais consignés</div>
        <div class="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{appState.protocolRows.length} / 5</div>
      </div>
      <div>
        <div class="text-slate-500 dark:text-slate-400">Délai moyen mesuré</div>
        <div class="text-lg font-bold text-sky-700 dark:text-sky-400 font-mono">{avgDelay} s</div>
      </div>
      <div>
        <div class="text-slate-500 dark:text-slate-400">Taux de réussite</div>
        <div class="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">{successRate} %</div>
      </div>
    </div>
  </section>
</div>
