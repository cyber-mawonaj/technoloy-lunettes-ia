import type { GradeLevel } from './curriculum';

export interface QuizQuestion {
  id: string;
  level: GradeLevel;
  competency: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface TroubleshootCase {
  id: string;
  symptom: string;
  checks: string[];
  fix: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q5_1',
    level: '5e',
    competency: 'Chaîne d’énergie & sécurité',
    question: 'Quelle tension alimente exclusivement la maquette pédagogique des lunettes en classe ?',
    choices: ['230 V secteur', '12 V batterie auto', '5 V USB sécurisé (non EPI)', '24 V industriel'],
    correctIndex: 2,
    explanation: 'La maquette fonctionne uniquement en 5 V USB et ne constitue pas un Équipement de Protection Individuelle certifié.',
  },
  {
    id: 'q5_2',
    level: '5e',
    competency: 'Chaîne d’information (Acquérir)',
    question: 'Sur le Shield Grove de la micro:bit V2, quel port reçoit le capteur de luminosité analogique en 5e ?',
    choices: ['Port P0', 'Port I2C', 'Borne GND', 'Prise jack audio'],
    correctIndex: 0,
    explanation: 'Le capteur de luminosité fournit un signal analogique lu sur la broche P0.',
  },
  {
    id: 'q5_3',
    level: '5e',
    competency: 'Dépannage électrique',
    question: 'Que se passe-t-il si le fil +5V touche directement la masse GND ?',
    choices: [
      'La LED brille deux fois plus fort',
      'Un court-circuit se produit et bloque le montage',
      'Le Wi-Fi augmente sa portée',
      'L’écran OLED passe en couleur',
    ],
    correctIndex: 1,
    explanation: 'Relier directement +5V et GND crée un court-circuit dangereux pour l’alimentation.',
  },
  {
    id: 'q4_1',
    level: '4e',
    competency: 'Bus de communication',
    question: 'Pourquoi l’afficheur OLED 0,96" doit-il obligatoirement être câblé sur le port I2C ?',
    choices: [
      'Parce qu’il dialogue avec deux fils de données (SDA et SCL)',
      'Parce qu’il consomme 230 V',
      'Parce que P0 est réservé au buzzer',
      'Pour augmenter la luminosité du capteur',
    ],
    correctIndex: 0,
    explanation: 'Le bus I2C utilise les lignes SDA (données) et SCL (horloge) pour transmettre du texte à l’écran OLED.',
  },
  {
    id: 'q4_2',
    level: '4e',
    competency: 'Choix techniques sans fil',
    question: 'Pourquoi privilégier l’ESP32-CAM OV2640 par rapport à un endoscope USB-C pour les lunettes ?',
    choices: [
      'L’endoscope fonctionne uniquement sous l’eau',
      'L’ESP32-CAM transmet sans fil en Wi-Fi 2,4 GHz sans câble vers le PC',
      'L’ESP32-CAM se programme par blocs mBlock',
      'L’endoscope ne possède pas de lentille',
    ],
    correctIndex: 1,
    explanation: 'Le flux vidéo Wi-Fi évite un câble USB-C rigide et l’incertitude de compatibilité UVC des endoscopes.',
  },
  {
    id: 'q4_3',
    level: '4e',
    competency: 'Algorithmique par blocs',
    question: 'Dans le bloc conditionnel « SI distance < 20 cm », à quel moment l’alerte se déclenche-t-elle ?',
    choices: [
      'Uniquement quand la distance est supérieure à 30 cm',
      'Dès qu’un obstacle est mesuré sous le seuil de 20 cm',
      'Uniquement si la batterie est débranchée',
      'Une fois par heure',
    ],
    correctIndex: 1,
    explanation: 'La condition devient vraie dès que la distance mesurée passe sous 20 cm.',
  },
  {
    id: 'q3_1',
    level: '3e',
    competency: 'Architecture Réseau MQTT',
    question: 'Dans l’architecture v2.1 (Fiche T3bis), quelle machine héberge le broker Mosquitto sur le réseau ReseauAtelier ?',
    choices: [
      'La carte micro:bit V2',
      'Le Raspberry Pi 400 (10.42.0.1)',
      'Le capteur ultrason',
      'La LED blanche',
    ],
    correctIndex: 1,
    explanation: 'Le Raspberry Pi 400 enseignant héberge le point d’accès 2,4 GHz, le broker Mosquitto et le script T14.',
  },
  {
    id: 'q3_2',
    level: '3e',
    competency: 'Esprit critique & IA',
    question: 'Quelle affirmation décrit honnêtement le script serveur T14 (ia_atelier.py) ?',
    choices: [
      'C’est un réseau de neurones profond entraîné sur des millions d’images',
      'C’est une règle de seuil déterministe simulée (ex. distance < 20 cm)',
      'Il fonctionne sans aucune alimentation électrique',
      'Il certifie automatiquement les lunettes comme EPI',
    ],
    correctIndex: 1,
    explanation: 'T14 applique une règle de seuil déterministe programmée pour simuler un service décisionnel en classe.',
  },
  {
    id: 'q3_3',
    level: '3e',
    competency: 'Protocole expérimental',
    question: 'Lors des 5 essais expérimentaux de 3e, que révèle un écart entre « Attendu = ALERTE » et « Observé = RAS » ?',
    choices: [
      'Un faux négatif (risque de non-détection d’obstacle)',
      'Une réussite parfaite du système',
      'Un changement de couleur du Shield Grove',
      'Une augmentation de la tension USB à 12 V',
    ],
    correctIndex: 0,
    explanation: 'Si le système devait alerter mais affiche RAS, c’est un faux négatif qu’il faut analyser (latence, câble ou seuil).',
  },
];

export const TROUBLESHOOT_CASES: TroubleshootCase[] = [
  {
    id: 'ts_led',
    symptom: 'La LED blanche ne s’allume pas lorsque le seuil est franchi',
    checks: [
      'Vérifiez sur le Banc Shield Grove que la LED est bien câblée sur P1.',
      'Contrôlez dans l’éditeur de blocs la présence du bloc « Allumer LED (P1) ».',
      'Vérifiez qu’aucun court-circuit (+5V ↔ GND) n’est présent sur la grille électronique.',
    ],
    fix: 'Câbler la LED sur P1, ajouter le bloc Allumer LED et baisser la mesure sous le seuil.',
  },
  {
    id: 'ts_buzz',
    symptom: 'Le buzzer piézo reste muet même en situation d’alerte',
    checks: [
      'Vérifiez le témoin « Panne Buzzer (5e S4) » : le fil signal P2 est peut-être débranché.',
      'Vérifiez que le mode EBEP n’a pas coupé le retour sonore sur ce poste.',
      'Assurez-vous que le bloc « Activer Buzzer piézo (P2) » est présent dans la boucle.',
    ],
    fix: 'Rebrancher le fil jaune sur P2 et vérifier l’alimentation 5 V.',
  },
  {
    id: 'ts_short',
    symptom: 'Alerte rouge COURT-CIRCUIT sur la grille électrique',
    checks: [
      'Repérez les lignes rouges pointillées reliant directement ou indirectement +5V et GND.',
      'Vérifiez que la cathode (-) de la LED ne touche pas la borne +5V.',
    ],
    fix: 'Cliquez sur le fil rouge critique pour le supprimer, puis rétablissez le circuit Batterie → Capteur → LED → GND.',
  },
  {
    id: 'ts_mqtt',
    symptom: 'Aucun message JSON n’apparaît dans le moniteur MQTT WebSocket',
    checks: [
      'Vérifiez que vous avez cliqué sur « Connecter WS » (Simulateur Local ou Broker :9001).',
      'Contrôlez le topic saisi (ex. atelier/poste1/telemetrie) et la coche de publication automatique.',
      'Sur un vrai Raspberry Pi 400, vérifiez que Mosquitto écoute sur le port WebSocket 9001.',
    ],
    fix: 'Activer le mode Simulateur Local pour tester hors ligne ou cliquer sur Émettre.',
  },
];

export interface GuideStep {
  id: string;
  level: GradeLevel;
  order: string;
  tab: number;
  tabLabel: string;
  title: string;
  instruction: string;
  checkHint: string;
}

export const PEDAGOGICAL_GUIDE_STEPS: Record<GradeLevel, GuideStep[]> = {
  '5e': [
    {
      id: 'g5_1',
      level: '5e',
      order: '01',
      tab: 1,
      tabLabel: 'Onglet 1 · 3D',
      title: 'Analyser le besoin & la sécurité 5 V',
      instruction:
        'Observez les lunettes 3D en mode Assemblage et identifiez pourquoi l’ouvrier doit garder les mains libres en 5 V USB non EPI.',
      checkHint: 'Vue 3D explorée et besoin compris',
    },
    {
      id: 'g5_2',
      level: '5e',
      order: '02',
      tab: 1,
      tabLabel: 'Onglet 1 · 3D',
      title: 'Repérer les composants en vue éclatée',
      instruction:
        'Activez la vue éclatée puis le mode Électronique pour localiser la micro:bit V2, le Shield Grove, le capteur de luminosité, la LED et le buzzer.',
      checkHint: 'Sous-ensembles identifiés',
    },
    {
      id: 'g5_3',
      level: '5e',
      order: '03',
      tab: 2,
      tabLabel: 'Onglet 2 · Labo',
      title: 'Réaliser le câblage sans court-circuit',
      instruction:
        'Sur le banc Shield Grove et la grille électrique, reliez le capteur (P0), la LED (P1) avec la résistance 220 Ω active et le buzzer (P2).',
      checkHint: 'Continuité conforme au multimètre',
    },
    {
      id: 'g5_4',
      level: '5e',
      order: '04',
      tab: 2,
      tabLabel: 'Onglet 2 · Blocs',
      title: 'Programmer la détection de zone sombre',
      instruction:
        'Assemblez les blocs SI luminosité < 80 lux → Allumer LED P1 + Buzzer P2, puis vérifiez l’exécution en mode Pas à pas.',
      checkHint: 'LED P1 et buzzer actifs sous le seuil',
    },
    {
      id: 'g5_5',
      level: '5e',
      order: '05',
      tab: 2,
      tabLabel: 'Onglet 2 · Labo',
      title: 'Diagnostiquer la panne simple (Séance 4)',
      instruction:
        'Simulez une coupure du buzzer sur P2, lisez le diagnostic électrique puis rétablissez le câble signal.',
      checkHint: 'Panne identifiée puis corrigée',
    },
    {
      id: 'g5_6',
      level: '5e',
      order: '06',
      tab: 4,
      tabLabel: 'Onglet 4 · Fiches',
      title: 'Compléter la fiche & exporter le PDF A4',
      instruction:
        'Rédigez vos réponses aux 3 questions de 5e, passez le quiz de révision (Onglet 7) puis générez votre Fiche Élève PDF.',
      checkHint: 'Fiche complétée et exportée',
    },
  ],
  '4e': [
    {
      id: 'g4_1',
      level: '4e',
      order: '01',
      tab: 1,
      tabLabel: 'Onglet 1 · 3D',
      title: 'Explorer le HUD AR & la chaîne d’information',
      instruction:
        'Activez la vue opérateur AR sur le modèle 3D et identifiez les fonctions Acquérir, Traiter et Communiquer.',
      checkHint: 'Chaîne d’information repérée',
    },
    {
      id: 'g4_2',
      level: '4e',
      order: '02',
      tab: 5,
      tabLabel: 'Onglet 5 · Comparatifs',
      title: 'Comparer ESP32-CAM et endoscope USB-C',
      instruction:
        'Analysez pourquoi un port USB-C IP67 ne garantit pas la norme UVC et justifiez l’usage du Wi-Fi 2,4 GHz sur l’atelier.',
      checkHint: 'Critères UVC et sans-fil compris',
    },
    {
      id: 'g4_3',
      level: '4e',
      order: '03',
      tab: 2,
      tabLabel: 'Onglet 2 · Labo',
      title: 'Câbler Ultrason P0, OLED I2C et Buzzer P2',
      instruction:
        'Vérifiez que l’afficheur OLED est bien relié au bus I2C (SDA/SCL) et que la résistance 220 Ω protège le montage.',
      checkHint: 'Bus I2C et grille validés sans erreur',
    },
    {
      id: 'g4_4',
      level: '4e',
      order: '04',
      tab: 2,
      tabLabel: 'Onglet 2 · Blocs',
      title: 'Programmer l’alerte obstacle (< 20 cm)',
      instruction:
        'Réglez le seuil à 20 cm, affichez « ALERTE OBSTACLE » sur l’OLED et observez le logigramme en mode Pas à pas.',
      checkHint: 'Alerte OLED et buzzer validée',
    },
    {
      id: 'g4_5',
      level: '4e',
      order: '05',
      tab: 3,
      tabLabel: 'Onglet 3 · MQTT',
      title: 'Découvrir le broker Mosquitto (Pub/Sub)',
      instruction:
        'Observez le graphe réseau local et exécutez une commande mosquitto_pub / mosquitto_sub dans le terminal simulé.',
      checkHint: 'Principe Pub/Sub testé',
    },
    {
      id: 'g4_6',
      level: '4e',
      order: '06',
      tab: 4,
      tabLabel: 'Onglet 4 · Fiches',
      title: 'Finaliser la fiche 4e & le quiz Cycle 4',
      instruction:
        'Complétez le schéma de chaîne d’information (Onglet 4), réalisez le quiz 4e (Onglet 7) et exportez votre dossier.',
      checkHint: 'Activités et quiz 4e complétés',
    },
  ],
  '3e': [
    {
      id: 'g3_1',
      level: '3e',
      order: '01',
      tab: 5,
      tabLabel: 'Onglet 5 · Architecture',
      title: 'Distinguer blocs élèves & nœuds Wi-Fi prof',
      instruction:
        'Identifiez le rôle de la carte micro:bit V2 (programmable par blocs) face aux nœuds ESP32-C3 / Pico W et au Raspberry Pi 400.',
      checkHint: 'Séparation matérielle maîtrisée',
    },
    {
      id: 'g3_2',
      level: '3e',
      order: '02',
      tab: 2,
      tabLabel: 'Onglet 2 · Labo',
      title: 'Valider le câblage complet et les flux 3D',
      instruction:
        'Activez les flux d’énergie/information en 3D puis vérifiez le câblage simultané Ultrason P0, LED P1, Buzzer P2 et OLED I2C.',
      checkHint: 'Montage complet sans court-circuit',
    },
    {
      id: 'g3_3',
      level: '3e',
      order: '03',
      tab: 2,
      tabLabel: 'Onglet 2 · Blocs',
      title: 'Construire l’IHM à états (Boutons A/B & Sinon)',
      instruction:
        'Utilisez les blocs Si Bouton A, Si Bouton B et Sinon, testez en mode Pas à pas puis enregistrez une variante de programme.',
      checkHint: 'IHM multi-états et brouillon sauvés',
    },
    {
      id: 'g3_4',
      level: '3e',
      order: '04',
      tab: 2,
      tabLabel: 'Onglet 2 · WebSocket',
      title: 'Émettre la télémesure JSON sur MQTT WS',
      instruction:
        'Connectez le simulateur WebSocket local, émettez au moins une trame JSON et observez l’impact de la latence / perte QoS 0.',
      checkHint: 'Trames JSON émises et analysées',
    },
    {
      id: 'g3_5',
      level: '3e',
      order: '05',
      tab: 3,
      tabLabel: 'Onglet 3 · Protocole',
      title: 'Valider les 5 essais & critiquer la règle T14',
      instruction:
        'Contrôlez la latence (< 0,5 s) sur les 5 essais et comparez la règle de seuil T14 face à l’atelier vision simulée (FP / FN).',
      checkHint: 'Esprit critique T14 et essais validés',
    },
    {
      id: 'g3_6',
      level: '3e',
      order: '06',
      tab: 4,
      tabLabel: 'Onglet 4 · Fiches',
      title: 'Exporter le bilan final 3e (PDF A4 & JSON)',
      instruction:
        'Rédigez les réponses de 3e, validez le quiz final (Onglet 7) et exportez votre Fiche Élève A4 et le fichier JSON pour l’ENT.',
      checkHint: 'Dossier complet prêt pour remise',
    },
  ],
};
