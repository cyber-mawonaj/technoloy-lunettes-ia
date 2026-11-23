export type GradeLevel = '5e' | '4e' | '3e';

export interface ComponentSpec {
  id: string;
  index: string;
  name: string;
  role: string;
  voltage: string;
  bus: string;
  placement: string;
  whyChosen: string;
  alternativeRejected: string;
  threeTarget: 'camera' | 'microbit' | 'shield' | 'lux' | 'ultra' | 'buzzer' | 'led' | 'oled';
  zoomPreset: 'ensemble' | 'microbit' | 'jst' | 'sensors' | 'camera' | 'oled' | 'buzzer';
}

export interface EquipmentRationalePillar {
  id: string;
  code: string;
  title: string;
  summary: string;
  choices: string[];
}

export const EQUIPMENT_RATIONALE_PILLARS: EquipmentRationalePillar[] = [
  {
    id: 'ergonomie',
    code: '01 · Ergonomie & Implantation',
    title: 'Équilibrage gauche/droite et champ visuel dégagé',
    summary:
      'Chaque composant est placé pour équilibrer la masse sur les deux branches et préserver l’axe de vision central de l’opérateur.',
    choices: [
      'Branche gauche : micro:bit V2 enfichée dans le Shield Grove (centre de masse près du pivot temporal, boutons A/B accessibles à la main gauche).',
      'Branche droite : ESP32-CAM OV2640 à l’avant et buzzer piézo près de l’oreille droite (contrepoids mécanique équilibré).',
      'Arc frontal supérieur : Ultrason au centre et capteur de luminosité à gauche, alignés dans l’axe du regard sans empiéter sur les verres.',
      'Coin supérieur externe du verre droit : OLED 0,96" + prisme semi-transparent à 45° hors de l’axe central de la pupille.',
    ],
  },
  {
    id: 'pedagogie',
    code: '02 · Pédagogie Cycle 4',
    title: 'micro:bit V2 + Grove sans soudure pour les élèves',
    summary:
      'Le duo micro:bit V2 et Shield Grove maximise le temps d’apprentissage en algorithmique et chaîne d’information dès la 5e.',
    choices: [
      'Programmation 100 % par blocs (mBlock 5 / MakeCode) conforme aux attendus du Cycle 4 sans barrière syntaxique C++.',
      'Connectique Grove JST 4 broches détrompée (Rouge/Noir/Blanc/Jaune) : zéro soudure, zéro risque d’inversion de polarité 5 V / GND.',
      'IHM embarquée immédiate (matrice LED 5×5, boutons A/B, micro) permettant un diagnostic visuel direct sur la maquette.',
    ],
  },
  {
    id: 'reseau',
    code: '03 · Réseau & Séparation des Rôles',
    title: 'Nœuds Wi-Fi 2,4 GHz préprogrammés + Serveur Raspberry Pi 400',
    summary:
      'La micro:bit ne possède pas de Wi-Fi IP natif : la couche réseau est déléguée à des nœuds spécialisés préparés par l’enseignant.',
    choices: [
      'ESP32-CAM OV2640 (vidéo MJPEG sans fil) et ESP32-C3 / Pico W (télémétrie MQTT) fonctionnent en Wi-Fi 2,4 GHz sur le hotspot local ReseauAtelier (10.42.0.1).',
      'Le Raspberry Pi 400 enseignant centralise Mosquitto MQTT, le script de décision simulée T14 et l’hébergement hors ligne de cette PWA.',
      'L’endoscope USB-C filaire reste utile en observation 5e, mais ne permet pas la mobilité atelier et exige de vérifier la compatibilité UVC.',
    ],
  },
  {
    id: 'securite',
    code: '04 · Sécurité & Esprit Critique',
    title: 'Très basse tension 5 V USB, sans batterie LiPo, maquette non-EPI',
    summary:
      'Les choix matériels répondent aux exigences de sécurité d’un laboratoire de technologie de collège et à l’honnêteté scientifique.',
    choices: [
      'Alimentation 5 V DC par câble USB ou batterie externe USB normée : aucune cellule LiPo nue à proximité du visage des élèves.',
      'Maquette pédagogique non certifiée EPI : ne remplace jamais des lunettes de protection normalisées EN 166.',
      'Transparence sur « l’IA » : le service T14 applique une règle de seuil déterministe (distance < 20 cm), support idéal pour étudier faux positifs et faux négatifs.',
    ],
  },
];

export const POSTER_COMPONENTS: ComponentSpec[] = [
  {
    id: 'cam',
    index: '01',
    name: 'Module ESP32-CAM OV2640',
    role: 'Acquisition vidéo UXGA/SVGA et diffusion du flux MJPEG sans fil vers le serveur atelier.',
    voltage: '5 V DC (pic 310 mA)',
    bus: 'Wi-Fi 2,4 GHz + DVP',
    placement: 'Face externe de la branche droite (charnière avant), nappe FPC vers l’objectif OV2640 pointé dans l’axe du regard.',
    whyChosen:
      'Combine microcontrôleur Wi-Fi 2,4 GHz et caméra miniature 2 Mpx pour transmettre un flux vidéo mains libres sans câble relié au PC, tout en équilibrant la branche gauche.',
    alternativeRejected:
      'Endoscope USB-C filaire : entrave les déplacements de l’ouvrier et un port USB-C / IP67 ne garantit pas le standard vidéo UVC.',
    threeTarget: 'camera',
    zoomPreset: 'camera',
  },
  {
    id: 'microbit',
    index: '02',
    name: 'Carte micro:bit V2',
    role: 'Unité de calcul programmable par blocs (élèves) : matrice LED 5×5, boutons A/B, haut-parleur.',
    voltage: '3,3 V / 5 V USB',
    bus: 'Edge 25 broches',
    placement: 'Enfichée verticalement dans le connecteur 25 broches du Shield Grove sur la face externe de la branche gauche.',
    whyChosen:
      'Seule carte programmée par les élèves : programmation par blocs (mBlock 5 / MakeCode), robuste en classe et dotée d’une IHM intégrée (boutons A/B + matrice 5×5) accessible à la main gauche.',
    alternativeRejected:
      'Arduino Uno / ESP32 programmé en C++ : trop encombrant ou trop complexe pour la progression spiralaire 5e → 3e en temps contraint.',
    threeTarget: 'microbit',
    zoomPreset: 'microbit',
  },
  {
    id: 'shield',
    index: '03',
    name: 'Shield Grove micro:bit',
    role: 'Interface d’adaptation à 4 connecteurs JST détrompés (Rouge, Noir, Blanc, Jaune) sans soudure.',
    voltage: '3,3 V / 5 V régulé',
    bus: 'P0, P1, P2, I2C',
    placement: 'Clipée sur la branche gauche (2 brides imprimées 3D), recevant la micro:bit V2 sur sa tranche et les 4 nappes Grove vers l’avant.',
    whyChosen:
      'Supprime les faux contacts des platines d’essai et évite toute soudure ou inversion 5 V / GND grâce aux détrompeurs mécaniques JST-PH 4 broches.',
    alternativeRejected:
      'Platine breadboard + fils Dupont volants : câblage fragile impossible à porter sur une monture et source fréquente de courts-circuits en classe.',
    threeTarget: 'shield',
    zoomPreset: 'jst',
  },
  {
    id: 'lux',
    index: '04',
    name: 'Capteur Luminosité Grove',
    role: 'Mesure l’éclairement ambiant (lux) pour déclencher l’éclairage frontal en zone sombre.',
    voltage: '3,3 V — 5 V',
    bus: 'Analogique (P0)',
    placement: 'Selle supérieure gauche de l’arc frontal, photorésistance orientée vers la zone de travail observée.',
    whyChosen:
      'Photorésistance (LDR) à sortie analogique linéaire très simple à lire par blocs en 5e pour introduire la notion de seuil (50 → 80) dans un bloc SI.',
    alternativeRejected:
      'Capteur numérique I2C complexe (BH1750/TSL2561) : nécessite des bibliothèques dédiées superflues pour une première approche en 5e.',
    threeTarget: 'lux',
    zoomPreset: 'sensors',
  },
  {
    id: 'ultra',
    index: '05',
    name: 'Capteur Ultrason Grove',
    role: 'Mesure la distance aux obstacles (2–350 cm) par écho d’ondes ultrasonores 40 kHz.',
    voltage: '5 V DC',
    bus: 'Numérique SIG (P0)',
    placement: 'Selle centrale au-dessus du pont nasal, transducteurs émetteur/récepteur 40 kHz parfaitement centrés dans l’axe frontal.',
    whyChosen:
      'Module Grove à 1 seule broche signal (SIG), fiable en atelier lumineux comme dans le noir, rendant visible le principe physique émission/réception d’écho.',
    alternativeRejected:
      'Capteur infrarouge Sharp ou LiDAR laser : perturbé par les reflets métalliques/lumière ambiante ou trop coûteux pour un équipement complet de classe.',
    threeTarget: 'ultra',
    zoomPreset: 'sensors',
  },
  {
    id: 'buzzer',
    index: '06',
    name: 'Buzzer Piézoélectrique Grove',
    role: 'Avertisseur sonore d’urgence (bip 2 kHz) signalant un seuil critique à l’ouvrier.',
    voltage: '3,3 V — 5 V',
    bus: 'PWM / Digital (P2)',
    placement: 'Branche droite arrière, positionné à proximité directe de l’oreille droite pour rester audible en environnement atelier.',
    whyChosen:
      'Très faible consommation, pilotable en tout-ou-rien ou PWM depuis la broche P2, offrant un retour auditif immédiat sans quitter la pièce mécanique des yeux.',
    alternativeRejected:
      'Casque audio Bluetooth ou haut-parleur amplifié : trop lourd sur la branche, consommation élevée et complexité d’appairage en classe.',
    threeTarget: 'buzzer',
    zoomPreset: 'buzzer',
  },
  {
    id: 'led',
    index: '07',
    name: 'LED Blanche 5 mm Grove',
    role: 'Projecteur frontal d’assistance lumineuse mains libres lors d’interventions sous châssis.',
    voltage: '3,3 V — 5 V',
    bus: 'Sortie Digitale (P1)',
    placement: 'Équerre latérale gauche à la charnière frontale, faisceau dirigé vers l’avant le long de l’axe visuel.',
    whyChosen:
      'Module Grove équipé d’un potentiomètre de réglage d’intensité et d’une résistance de protection intégrée : éclairage mains libres sécurisé sans éblouissement.',
    alternativeRejected:
      'LED de puissance 1 W / 3 W : échauffement thermique dangereux près des tempes et appel de courant incompatible avec le bus 5 V USB de la micro:bit.',
    threeTarget: 'led',
    zoomPreset: 'sensors',
  },
  {
    id: 'oled',
    index: '08',
    name: 'Afficheur OLED + Prisme AR',
    role: 'Restitution tête haute (HUD) des consignes FABRICATION / REPARATION et alertes réseau.',
    voltage: '3,3 V',
    bus: 'Bus I2C (SDA/SCL)',
    placement: 'Bras articulé sur charnière droite projetant dans un prisme semi-transparent 45° au coin supérieur externe du verre droit (vision centrale dégagée).',
    whyChosen:
      'Écran OLED 0,96" SSD1306 auto-émissif très contrasté, léger et câblé en 4 fils I2C seulement ; couplé à un prisme 45°, il reproduit le principe optique des lunettes AR réelles.',
    alternativeRejected:
      'Écran LCD 16×2 rétroéclairé : beaucoup trop lourd, encombrant et impossible à projeter proprement en réalité assistée devant l’œil.',
    threeTarget: 'oled',
    zoomPreset: 'oled',
  },
];

export interface TeacherFiche {
  id: string;
  phase: 'Serveur & Réseau' | 'Nœuds Wi-Fi' | 'Classe & Sécurité';
  title: string;
  summary: string;
  commands: string;
  note?: string;
}

export const TEACHER_FICHES: TeacherFiche[] = [
  {
    id: 'T1',
    phase: 'Serveur & Réseau',
    title: 'Installation Raspberry Pi OS & Broker Mosquitto',
    summary: 'Préparation du Raspberry Pi 400 enseignant avec Mosquitto MQTT et clients CLI.',
    commands: `sudo apt update && sudo apt install -y mosquitto mosquitto-clients python3-paho-mqtt
sudo systemctl enable mosquitto
sudo systemctl start mosquitto`,
    note: 'Réservé au poste enseignant. Ne jamais exposer le port 1883 en dehors du réseau local.',
  },
  {
    id: 'T2',
    phase: 'Serveur & Réseau',
    title: 'Connexion Client PuTTY & Administration SSH',
    summary: 'Prise en main à distance du broker depuis le PC enseignant Windows 11.',
    commands: `ssh pi@10.42.0.1
# Ou depuis PuTTY : Host Name = 10.42.0.1 | Port = 22 | Connection Type = SSH`,
  },
  {
    id: 'T3',
    phase: 'Serveur & Réseau',
    title: 'Sécurisation Mosquitto (allow_anonymous false)',
    summary: 'Création du fichier d’authentification locale et activation du listener WebSocket optionnel.',
    commands: `sudo mosquitto_passwd -c /etc/mosquitto/passwd atelier_prof
# /etc/mosquitto/conf.d/atelier.conf :
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd

# Option projection tableau (WebSocket port 9001) :
listener 9001
protocol websockets`,
    note: 'Ne jamais diffuser les mots de passe réels dans les fiches ou captures destinées aux élèves.',
  },
  {
    id: 'T3bis',
    phase: 'Serveur & Réseau',
    title: 'Point d’Accès Dédié ReseauAtelier 2,4 GHz (10.42.0.1)',
    summary: 'Création d’un hotspot Wi-Fi isolé 2,4 GHz forcé compatible ESP32/ESP-12F/Pico W.',
    commands: `sudo nmcli connection add type wifi ifname wlan0 con-name ReseauAtelier autoconnect yes ssid ReseauAtelier
sudo nmcli connection modify ReseauAtelier 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared ipv4.addresses 10.42.0.1/24
sudo nmcli connection modify ReseauAtelier wifi-sec.key-mgmt wpa-psk wifi-sec.psk "<MOT_DE_PASSE_SALLE>"
sudo nmcli connection up ReseauAtelier`,
    note: 'La bande 2,4 GHz (band bg) est obligatoire : les ESP32-C3, ESP-12F et Pico W ne supportent pas le 5 GHz.',
  },
  {
    id: 'T4',
    phase: 'Serveur & Réseau',
    title: 'Hébergement Local du Kit Web (Port 8080)',
    summary: 'Distribution hors ligne de cette PWA sur le Raspberry Pi 400 pour toute la classe.',
    commands: `cd /var/www/lunettes-ia/dist
python3 -m http.server 8080 --bind 0.0.0.0
# URL classe : http://10.42.0.1:8080`,
  },
  {
    id: 'T5',
    phase: 'Serveur & Réseau',
    title: 'Convention des Topics MQTT (v2.1 vs v1.0)',
    summary: 'Organisation hiérarchique des sujets d’abonnement et de publication par poste.',
    commands: `# Convention v2.1 (recommandée) :
mosquitto_sub -h 10.42.0.1 -u atelier_prof -P "<PASS>" -t "atelier/poste1/#" -v
# Convention v1.0 (compatibilité) :
mosquitto_sub -h 10.42.0.1 -u atelier_prof -P "<PASS>" -t "atelier/lunettes/#" -v`,
  },
  {
    id: 'T6',
    phase: 'Nœuds Wi-Fi',
    title: 'Préparation Nœud ESP32-C3 SuperMini (Enseignant)',
    summary: 'Flashage MicroPython du nœud ultrason + MQTT avant la séance (boîtier préprogrammé).',
    commands: `# Sous Windows 11 avec esptool (mode BOOT maintenu au branchement USB-C) :
esptool --chip esp32c3 --port COM4 erase_flash
esptool --chip esp32c3 --port COM4 write_flash -z 0x0 ESP32_GENERIC_C3.bin`,
  },
  {
    id: 'T7',
    phase: 'Nœuds Wi-Fi',
    title: 'Préparation Nœud ESP-12F + OLED I2C (Legacy)',
    summary: 'Compatibilité des anciens kits v1.0 (Rappel : ESP8266EX en fin de vie industrielle).',
    commands: `# Brochage I2C standard ESP-12F : SDA = GPIO4 (D2), SCL = GPIO5 (D1)
# Alimentation stricte 3,3 V sur l'afficheur OLED SSD1306.`,
  },
  {
    id: 'T8',
    phase: 'Nœuds Wi-Fi',
    title: 'Préparation Raspberry Pi Pico W avec Thonny IDE',
    summary: 'Téléversement du firmware MicroPython CYW43439 et script client MQTT umqtt.simple.',
    commands: `# Maintenir BOOTSEL au branchement USB -> glisser micropython-pico-w.uf2 sur RPI-RP2
# Dans Thonny : Outils > Interpréteur > MicroPython (Raspberry Pi Pico)`,
  },
  {
    id: 'T9',
    phase: 'Nœuds Wi-Fi',
    title: 'Configuration Caméra ESP32-CAM OV2640',
    summary: 'Paramétrage du flux HTTP MJPEG SVGA (800×600) sur l’atelier Wi-Fi 2,4 GHz.',
    commands: `# Alimentation 5 V stable obligatoire (≥ 500 mA) pour éviter les redémarrages Brownout
# Flux vidéo local : http://10.42.0.12:81/stream`,
  },
  {
    id: 'T10',
    phase: 'Classe & Sécurité',
    title: 'Déploiement mBlock 5 & MakeCode (Cible micro:bit V2)',
    summary: 'Seule la carte micro:bit V2 + Shield Grove est programmée par blocs par les élèves.',
    commands: `# Extension mBlock 5 : Ajouter appareil "micro:bit" + extension "Grove"
# Plan B hors ligne : MakeCode micro:bit Windows / téléchargement .hex sur lecteur MICROBIT`,
  },
  {
    id: 'T11',
    phase: 'Classe & Sécurité',
    title: 'Inspection Endoscope USB-C vs ESP32-CAM',
    summary: 'Mise en garde technique : un port USB-C et un indice IP67 ne garantissent pas la norme UVC.',
    commands: `# Vérifier sous Windows 11 (Gestionnaire de périphériques > Appareils photo)
# que la caméra apparaît en périphérique UVC standard avant la séance de 4e.`,
  },
  {
    id: 'T12',
    phase: 'Classe & Sécurité',
    title: 'Aménagements EBEP & Sécurité Électrique Collège',
    summary: 'Maquette basse tension 5 V USB uniquement, non certifiée EPI, accessibilité Dys/TSA.',
    commands: `# Activer le bouton "Mode EBEP" dans l'en-tête pour agrandir la typographie,
# augmenter les interlignes et couper les signaux sonores du buzzer.`,
  },
  {
    id: 'T13',
    phase: 'Classe & Sécurité',
    title: 'Checklist Pré-Séance Enseignant (T13)',
    summary: 'Points de contrôle rapides 10 minutes avant l’arrivée des élèves.',
    commands: `1. Vérifier ReseauAtelier actif sur 2,4 GHz (10.42.0.1)
2. Vérifier mosquitto actif : systemctl status mosquitto
3. Lancer ia_atelier.py dans un terminal PuTTY dédié
4. Tester 1 nœud ESP32-C3 / Pico W + 1 micro:bit V2 témoin
5. Vérifier l'accès élève à http://10.42.0.1:8080`,
  },
  {
    id: 'T14',
    phase: 'Serveur & Réseau',
    title: 'Script Serveur de Décision Simulée (ia_atelier.py)',
    summary: 'Règle de seuil déterministe côté broker (présentée honnêtement comme décision simulée).',
    commands: `import paho.mqtt.client as mqtt

SEUIL_DISTANCE_CM = 20.0

def on_message(client, userdata, msg):
    if msg.topic == "atelier/poste1/distance":
        try:
            dist = float(msg.payload.decode().strip())
            decision = "ALERTE" if dist < SEUIL_DISTANCE_CM else "RAS"
            client.publish("atelier/poste1/ia", decision)
        except ValueError:
            pass

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set("atelier_prof", "<MOT_DE_PASSE_SALLE>")
client.on_message = on_message
client.connect("10.42.0.1", 1883, 60)
client.subscribe("atelier/poste1/#")
client.loop_forever()`,
    note: 'Important : cette règle conditionnelle simple simule un service décisionnel ; ce n’est pas un réseau de neurones.',
  },
  {
    id: 'T15',
    phase: 'Classe & Sécurité',
    title: 'Protocole de Dépannage Rapide en Séance',
    summary: 'Arbre de diagnostic en 4 étapes lorsque la maquette ou le réseau ne répond pas.',
    commands: `1. Alimentation : LED Power allumée sur Shield Grove ? (Câble USB data/alim OK ?)
2. Connectique : Détrompeur JST bien enclenché sur le bon port (P0/P1/P2) ?
3. Programme : Le fichier .hex micro:bit a-t-il bien fini de copier ?
4. Réseau : La carte Wi-Fi est-elle sur le SSID 2,4 GHz avec la bonne IP broker ?`,
  },
];

export interface WorksheetQuestion {
  id: string;
  code: string;
  title: string;
  prompt: string;
  type: 'textarea' | 'chain';
  placeholder?: string;
  solution: string;
}

export const WORKSHEETS_BY_LEVEL: Record<GradeLevel, WorksheetQuestion[]> = {
  '5e': [
    {
      id: '5e_q1',
      code: '5e · Séance 1',
      title: 'Analyse du besoin — Situation de M. Loyalle',
      prompt:
        'Dans l’usine d’automobiles volantes de M. Loyalle, expliquez pourquoi l’ouvrier a besoin d’un éclairage automatique monté sur ses lunettes plutôt que d’une lampe torche.',
      type: 'textarea',
      placeholder: 'Rédigez votre analyse du besoin (mains libres, sécurité en zone sombre)...',
      solution:
        'L’ouvrier doit garder les deux mains libres pour manipuler les pièces sous le châssis. L’éclairage automatique s’allume dès que la luminosité ambiante passe sous le seuil réglé, garantissant sécurité et confort.',
    },
    {
      id: '5e_q2',
      code: '5e · Séance 2–3',
      title: 'Réglage du seuil de luminosité (50 → 80) en blocs',
      prompt:
        'Après avoir testé le laboratoire (Onglet 2), que se passe-t-il lorsque vous modifiez le seuil de luminosité de 50 à 80 dans le bloc conditionnel SI ? Quelle fonction de la maquette est déclenchée ?',
      type: 'textarea',
      placeholder: 'Décrivez le comportement de la LED blanche et du buzzer...',
      solution:
        'La LED blanche P1 et le buzzer P2 s’activent beaucoup plus tôt (dès que la pièce devient légèrement ombragée, sous 80 lux au lieu de 50 lux). Cela augmente la sensibilité de l’alerte.',
    },
    {
      id: '5e_q3',
      code: '5e · Séance 4',
      title: 'Diagnostic d’une panne simple (Buzzer silencieux)',
      prompt:
        'Observation : La LED s’allume bien en zone sombre mais le buzzer reste muet. Quelles vérifications matérielles et logicielles devez-vous mener dans l’ordre ?',
      type: 'textarea',
      placeholder: '1. Vérifier le câble... 2. Vérifier le port... 3. Tester...',
      solution:
        '1. Vérifier que le connecteur JST du buzzer est bien branché sur le port P2 du Shield Grove (sans inversion 5V/GND). 2. Vérifier que le bloc buzzer cible bien P2. 3. Vérifier que le buzzer n’est pas défectueux en le remplaçant.',
    },
  ],
  '4e': [
    {
      id: '4e_q1',
      code: '4e · Séance 1–2',
      title: 'Chaîne d’information du prototype AR',
      prompt:
        'Complétez les trois fonctions de la chaîne d’information pour l’alerte de proximité sur les lunettes de l’ouvrier :',
      type: 'chain',
      solution:
        'Acquérir : Capteur ultrason (ou luminosité) · Traiter : Microcontrôleur (micro:bit / ESP32-C3 préprogrammé) · Communiquer / Restituer : Afficheur OLED HUD + LED + Buzzer.',
    },
    {
      id: '4e_q2',
      code: '4e · Séance 3',
      title: 'Comparatif caméra ESP32-CAM vs Endoscope USB-C',
      prompt:
        'Expliquez pourquoi un endoscope USB-C étanche IP67 n’est pas toujours compatible directement sur smartphone/PC sans vérifier la norme UVC, et quel avantage offre l’ESP32-CAM dans l’atelier.',
      type: 'textarea',
      placeholder: 'Comparez la liberté de mouvement (Wi-Fi) et la compatibilité UVC...',
      solution:
        'L’indice IP67 garantit uniquement l’étanchéité, et la prise USB-C ne garantit pas le protocole vidéo standard UVC. L’ESP32-CAM transmet sans fil en Wi-Fi 2,4 GHz vers le réseau local de l’atelier, laissant l’ouvrier libre de ses mouvements.',
    },
    {
      id: '4e_q3',
      code: '4e · Séance 4–5',
      title: 'Découverte du protocole MQTT & Dépannage',
      prompt:
        'Quel est le rôle du Broker Mosquitto sur le Raspberry Pi 400 lorsque les lunettes publient une mesure de distance sur le réseau ?',
      type: 'textarea',
      placeholder: 'Expliquez le principe publication / abonnement (Pub/Sub)...',
      solution:
        'Le Broker reçoit les messages publiés sur un topic (ex : atelier/poste1/distance) et les redistribue uniquement aux équipements abonnés à ce topic, évitant des connexions directes complexes entre chaque carte.',
    },
  ],
  '3e': [
    {
      id: '3e_q1',
      code: '3e · Séance 1–2',
      title: 'Architecture A vs B et IHM par blocs',
      prompt:
        'Dans votre IHM à états (VEILLE, FABRICATION, REPARATION, ALERTE/RAS), pourquoi sépare-t-on la programmation par blocs de la micro:bit des nœuds Wi-Fi préprogrammés par l’enseignant ?',
      type: 'textarea',
      placeholder: 'Justifiez le choix technique et l’ergonomie pour l’ouvrier...',
      solution:
        'La micro:bit V2 gère l’IHM locale (boutons A/B, matrice LED, capteurs Grove) programmée simplement par blocs, tandis que les nœuds Wi-Fi dédiés (ESP32-C3 / Pico W) et le serveur Raspberry Pi 400 assurent le transport MQTT fiable vers le service T14.',
    },
    {
      id: '3e_q2',
      code: '3e · Séance 3–4',
      title: 'Analyse des 5 essais du protocole expérimental (Onglet 3)',
      prompt:
        'Relevez la latence moyenne et le taux de réussite obtenus dans votre tableau d’essais (Onglet 3). Le système respecte-t-il le cahier des charges de M. Loyalle (< 0,5 s et ≥ 80 % de réussite) ?',
      type: 'textarea',
      placeholder: 'Latence moyenne = ... s | Taux de réussite = ... % | Conclusion...',
      solution:
        'Avec une latence moyenne autour de 0,12–0,20 s (< 0,5 s) et un taux de réussite de 100 % sur les 5 essais normalisés, le prototype valide les critères de réactivité du cahier des charges.',
    },
    {
      id: '3e_q3',
      code: '3e · Séance 5–6',
      title: 'Esprit critique sur l’IA : Règle simulée, Faux Positifs & Faux Négatifs',
      prompt:
        'Le script serveur T14 (ia_atelier.py) est-il une véritable intelligence artificielle ? Distinguez ensuite un Faux Positif d’un Faux Négatif sur la sécurité de l’ouvrier.',
      type: 'textarea',
      placeholder: 'Expliquez la règle de seuil T14, puis définissez Faux Positif et Faux Négatif...',
      solution:
        'Non : le script T14 applique une simple règle déterministe de seuil (distance < 20 cm). Un Faux Positif déclenche une alerte inutile (gêne l’ouvrier) ; un Faux Négatif ne détecte pas un danger réel (risque d’accident grave).',
    },
  ],
};

export interface GlossaryItem {
  term: string;
  category: 'Architecture' | 'Réseau & MQTT' | 'Pédagogie & IA';
  def: string;
}

export const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: 'OST',
    category: 'Pédagogie & IA',
    def: 'Objet et Système Technique : produit réel étudié dans son environnement d’usage (les lunettes connectées de l’atelier Loyalle).',
  },
  {
    term: 'Chaîne d’information',
    category: 'Architecture',
    def: 'Ensemble des fonctions Acquérir (capteurs), Traiter (microcontrôleur) et Communiquer (OLED, LED, buzzer, Wi-Fi).',
  },
  {
    term: 'Chaîne d’énergie',
    category: 'Architecture',
    def: 'Alimenter (5 V USB), Distribuer, Convertir et Transmettre l’énergie électrique aux actionneurs.',
  },
  {
    term: 'IHM',
    category: 'Architecture',
    def: 'Interface Homme-Machine : boutons A/B, matrice LED 5×5, afficheur OLED AR et avertisseur sonore.',
  },
  {
    term: 'Microcontrôleur',
    category: 'Architecture',
    def: 'Circuit intégré programmable (micro:bit V2, RP2040, ESP32-C3) regroupant processeur, mémoire et broches d’entrées/sorties.',
  },
  {
    term: 'Norme UVC',
    category: 'Architecture',
    def: 'USB Video Class : standard Plug-and-Play pour caméras USB. Une prise USB-C ou un indice IP67 ne garantit pas la compatibilité UVC.',
  },
  {
    term: 'Point d’Accès (AP 2,4 GHz)',
    category: 'Réseau & MQTT',
    def: 'Réseau Wi-Fi local dédié (ReseauAtelier — 10.42.0.1) configuré en 2,4 GHz obligatoire pour connecter les nœuds ESP32 et Pico W.',
  },
  {
    term: 'MQTT',
    category: 'Réseau & MQTT',
    def: 'Message Queuing Telemetry Transport : protocole léger de messagerie Publication/Abonnement sur port local 1883.',
  },
  {
    term: 'Broker Mosquitto',
    category: 'Réseau & MQTT',
    def: 'Serveur central hébergé sur le Raspberry Pi 400 enseignant qui aiguille les messages MQTT entre capteurs et services.',
  },
  {
    term: 'Topic & Jokers (+ / #)',
    category: 'Réseau & MQTT',
    def: 'Canal hiérarchique (ex : atelier/poste1/ia). Le joker + remplace un niveau ; le joker # capture tous les sous-niveaux.',
  },
  {
    term: 'Règle simulée T14',
    category: 'Pédagogie & IA',
    def: 'Condition logique déterministe (if distance < 20) exécutée sur le serveur pour simuler un service décisionnel automatisé.',
  },
  {
    term: 'Faux Positif / Faux Négatif',
    category: 'Pédagogie & IA',
    def: 'Faux Positif : fausse alerte gênante. Faux Négatif : danger réel non signalé (critique pour la sécurité ouvrier).',
  },
  {
    term: 'EBEP',
    category: 'Pédagogie & IA',
    def: 'Élèves à Besoins Éducatifs Particuliers : mode d’accessibilité Dys/TSA (police agrandie, interligne large, audio coupé).',
  },
];

export const MOSQUITTO_CHEATSHEET = [
  {
    cmd: 'mosquitto_sub',
    desc: 'S’abonne à un ou plusieurs topics et affiche les messages reçus en direct.',
    example: 'mosquitto_sub -h 10.42.0.1 -t "atelier/poste1/#" -v',
  },
  {
    cmd: 'mosquitto_pub',
    desc: 'Publie une valeur ou un ordre sur un topic ciblé.',
    example: 'mosquitto_pub -h 10.42.0.1 -t "atelier/poste1/distance" -m "15"',
  },
  {
    cmd: '-h / -p',
    desc: 'Adresse IP du Broker (-h) et port TCP (-p, par défaut 1883).',
    example: '-h 10.42.0.1 -p 1883',
  },
  {
    cmd: '-u / -P',
    desc: 'Identifiant (-u) et mot de passe (-P) lorsque allow_anonymous false est actif.',
    example: '-u atelier_eleve -P "<MOT_DE_PASSE>"',
  },
  {
    cmd: '-t / -m',
    desc: 'Nom du Topic (-t) et message utile / payload (-m).',
    example: '-t "atelier/poste1/ia" -m "ALERTE"',
  },
  {
    cmd: '-v / -r',
    desc: 'Mode verbeux (-v : affiche le topic) et message retenu (-r : retained).',
    example: 'mosquitto_sub -h 10.42.0.1 -t "atelier/#" -v',
  },
  {
    cmd: 'Jokers + et #',
    desc: '+ remplace exactement un niveau ; # remplace toute la fin de l’arborescence.',
    example: 'atelier/+/ia  ou  atelier/poste1/#',
  },
];
