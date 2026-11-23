<script lang="ts">
  import { AlertTriangle, ShieldCheck } from 'lucide-svelte';
  import { EQUIPMENT_RATIONALE_PILLARS } from '../../lib/data/curriculum';

  const BOARDS = [
    {
      name: 'micro:bit V2',
      role: 'Cible programmation blocs élèves',
      cpu: 'nRF52833 Cortex-M4 · 64 MHz',
      wireless: 'Bluetooth 5.0 / Radio (pas de Wi-Fi IP)',
      io: '25 broches edge + Shield Grove',
      level: '5e / 4e / 3e',
      note: 'Matrice 5×5 LED, boutons A/B, haut-parleur intégré.',
    },
    {
      name: 'ESP32-C3 SuperMini',
      role: 'Nœud Wi-Fi préprogrammé (Prof)',
      cpu: 'RISC-V 32-bit · 160 MHz',
      wireless: 'Wi-Fi 2,4 GHz + BLE 5.0',
      io: '11 GPIO compactes + USB-C',
      level: '4e / 3e (Préprogrammé)',
      note: 'Format miniature adapté au montage sur branche de lunettes.',
    },
    {
      name: 'ESP32-CAM OV2640',
      role: 'Nœud Caméra Wi-Fi (Prof)',
      cpu: 'Xtensa Dual-Core · 240 MHz',
      wireless: 'Wi-Fi 2,4 GHz + BLE',
      io: '10 GPIO + Port DVP caméra',
      level: '4e / 3e (Préprogrammé)',
      note: 'Flux vidéo HTTP MJPEG sans fil, alimentation 5 V stable requise.',
    },
    {
      name: 'Raspberry Pi Pico W',
      role: 'Nœud Wi-Fi préprogrammé (Prof)',
      cpu: 'RP2040 Dual Cortex-M0+ · 133 MHz',
      wireless: 'Wi-Fi 2,4 GHz (CYW43439)',
      io: '26 GPIO multifonctions',
      level: '4e / 3e (Préprogrammé)',
      note: 'Brochage lisible, MicroPython stable sur réseau 2,4 GHz.',
    },
    {
      name: 'Raspberry Pi 400',
      role: 'Serveur Atelier (Réservé Prof)',
      cpu: 'BCM2711 Quad-Core · 1,8 GHz',
      wireless: 'AP Wi-Fi 2,4 GHz + Ethernet',
      io: '40 broches GPIO standard',
      level: 'Enseignant uniquement',
      note: 'Héberge ReseauAtelier (10.42.0.1), Mosquitto, T14 et cette PWA.',
    },
    {
      name: 'ESP-12F / ESP8266EX',
      role: 'Ancien nœud v1.0 (Legacy)',
      cpu: 'Tensilica L106 · 80 MHz',
      wireless: 'Wi-Fi 2,4 GHz 802.11 b/g/n',
      io: '9 GPIO limitées',
      level: 'Fin de vie industrielle',
      note: 'Not recommended for new designs — conservé pour compatibilité v1.0.',
    },
  ];
</script>

<div class="space-y-6">
  <!-- Cameras Comparison -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div>
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
        Comparatif Capteurs Vidéo : ESP32-CAM OV2640 vs Endoscope USB-C
      </h2>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Analyse technique utilisée en 5e (observation collective) et en 4e (justification du choix sans fil).
      </p>
    </div>

    <div class="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
      <AlertTriangle class="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <strong>Mise en garde matérielle :</strong> La présence d’une prise <strong>USB-C</strong> ou d’un indice
        d’étanchéité <strong>IP67</strong> sur un endoscope du commerce <strong>ne garantit pas la compatibilité UVC</strong>
        (USB Video Class) Plug-and-Play sur tous les PC ou smartphones.
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
            <th class="p-3 font-semibold">Critère technique</th>
            <th class="p-3 font-semibold">Module ESP32-CAM OV2640</th>
            <th class="p-3 font-semibold">Endoscope USB-C 7 mm (UVC)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">Résolution d’image</td>
            <td class="p-3 font-mono text-slate-700 dark:text-slate-300">UXGA (1600×1200) / SVGA (800×600)</td>
            <td class="p-3 font-mono text-slate-700 dark:text-slate-300">HD 720p (1280×720) / VGA (640×480)</td>
          </tr>
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">Connectivité & Protocole</td>
            <td class="p-3 text-slate-700 dark:text-slate-300">Wi-Fi 2,4 GHz sans fil · Flux HTTP / MJPEG</td>
            <td class="p-3 text-slate-700 dark:text-slate-300">Filaire USB · Standard UVC (à vérifier avant achat)</td>
          </tr>
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">Alimentation (5 V USB)</td>
            <td class="p-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">5 V DC (pic 310 mA en Wi-Fi)</td>
            <td class="p-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">5 V via port USB (~120 mA)</td>
          </tr>
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">Étanchéité & Protection</td>
            <td class="p-3 text-slate-700 dark:text-slate-300">Circuit PCB nu (boîtier imprimé 3D requis)</td>
            <td class="p-3 text-slate-700 dark:text-slate-300">Tête étanche IP67 (7 mm), câble semi-rigide</td>
          </tr>
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">Usage en classe</td>
            <td class="p-3 text-slate-700 dark:text-slate-300">Mobilité de l’ouvrier, flux réseau 4e / 3e</td>
            <td class="p-3 text-slate-700 dark:text-slate-300">Inspection mécanique directe sur poste PC (5e)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- 6 Programmable Boards Matrix -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
        Matrice des 6 Cartes du Kit Consolidé & Séparation des Rôles
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Seule la carte <strong>micro:bit V2</strong> est programmée par les élèves. Les nœuds Wi-Fi et le Raspberry Pi 400 sont préparés par l’enseignant.
      </p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800">
            <th class="p-2.5 font-semibold">Carte</th>
            <th class="p-2.5 font-semibold">Rôle dans le kit</th>
            <th class="p-2.5 font-semibold">Processeur</th>
            <th class="p-2.5 font-semibold">Sans fil</th>
            <th class="p-2.5 font-semibold">Observation technique</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {#each BOARDS as b}
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="p-2.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{b.name}</td>
              <td class="p-2.5 font-medium text-sky-800 dark:text-sky-400">{b.role}</td>
              <td class="p-2.5 font-mono text-slate-700 dark:text-slate-300">{b.cpu}</td>
              <td class="p-2.5 text-slate-700 dark:text-slate-300">{b.wireless}</td>
              <td class="p-2.5 text-slate-600 dark:text-slate-400">{b.note}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- 4 Software Tools -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
      Comparatif des 4 Logiciels de l’Environnement TechnoLOY
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">mBlock 5</div>
        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
          Logiciel principal de programmation par blocs pour les élèves (5e/4e/3e) ciblant la micro:bit V2 + Grove.
        </p>
      </div>
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">MakeCode micro:bit</div>
        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
          Plan B officiel Microsoft pour programmer la micro:bit par blocs et générer les fichiers .hex.
        </p>
      </div>
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">Thonny IDE</div>
        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
          Outil enseignant pour flasher et tester les scripts MicroPython sur Pico W et ESP32-C3.
        </p>
      </div>
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">PuTTY / CMD Windows</div>
        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
          Administration SSH du Raspberry Pi 400 et observation des échanges MQTT via mosquitto_sub / pub.
        </p>
      </div>
    </div>
  </section>

  <!-- Synthèse : Justification des Choix Matériels Cycle 4 -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-sky-600 dark:text-sky-400" />
        Synthèse : Pourquoi ces choix matériels pour le Cycle 4 ?
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Arguments techniques et pédagogiques à mobiliser dans les dossiers élèves (4e / 3e) pour justifier l’architecture retenue.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each EQUIPMENT_RATIONALE_PILLARS as pillar}
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div class="text-[11px] font-mono font-semibold text-sky-700 dark:text-sky-400">{pillar.code}</div>
          <div class="text-sm font-bold text-slate-900 dark:text-slate-100">{pillar.title}</div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{pillar.summary}</p>
          <ul class="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-800">
            {#each pillar.choices as item}
              <li class="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5"></span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>
</div>
