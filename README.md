# Lunettes Connectées IA — Kit Pédagogique Cycle 4 (PWA)

Application web pédagogique progressive (**PWA hors ligne**) dédiée à l’enseignement de la **Technologie au Cycle 4 (5e, 4e, 3e)** autour d’un fil rouge industriel : la conception de **lunettes connectées d’assistance à l’opérateur** (*Entreprise Loyalle — TechnoLOY Guadeloupe*, conforme au **BO n° 9 du 29 février 2024**).

Le kit est conçu pour fonctionner **entièrement hors ligne** en salle de classe (poste enseignant, **Raspberry Pi 400** en point d’accès local, ou serveur Web d’établissement) et s’installer comme une application native sur PC, tablettes et Chromebooks.

---

## Sommaire

1. [Fonctionnalités pédagogiques](#fonctionnalités-pédagogiques)
2. [Architecture matérielle & principes Cycle 4](#architecture-matérielle--principes-cycle-4)
3. [Stack technique](#stack-technique)
4. [Installation & développement local](#installation--développement-local)
5. [Déployer l’application en PWA sur son serveur](#déployer-lapplication-en-pwa-sur-son-serveur)
   - [Prérequis PWA (HTTPS & Service Worker)](#prérequis-pwa-https--service-worker)
   - [Option A : Caddy (HTTPS automatique — recommandé)](#option-a--caddy-https-automatique--recommandé)
   - [Option B : Nginx + Certbot (serveur Linux / VPS)](#option-b--nginx--certbot-serveur-linux--vps)
   - [Option C : Raspberry Pi 400 en classe hors ligne (`10.42.0.1`)](#option-c--raspberry-pi-400-en-classe-hors-ligne-104201)
   - [Option D : Conteneur Docker (Nginx)](#option-d--conteneur-docker-nginx)
   - [Vérifier l’installation PWA & les mises à jour](#vérifier-linstallation-pwa--les-mises-à-jour)
6. [Connexion au broker MQTT local (optionnel)](#connexion-au-broker-mqtt-local-optionnel)
7. [Structure du projet](#structure-du-projet)
8. [Sécurité & cadre pédagogique](#sécurité--cadre-pédagogique)

---

## Fonctionnalités pédagogiques

L’interface s’articule autour de **7 onglets progressifs**, d’une **barre latérale de suivi pas à pas** (progression cochable par niveau) et d’un **thème Sombre / Clair** :

| Onglet | Contenu & outils interactifs |
| :--- | :--- |
| **1 · Découverte 3D & CAO** | Modèle **3D PBR interactif** (`Three.js`) à implantation ergonomique réaliste, vues assemblée / éclatée, visualisation des flux énergie/information, mode Vision AR, fiches de **justification du choix des équipements** et planches de **dessin technique ISO E** (cartouche synchronisé NF EN ISO 7200). |
| **2 · Labo Électronique & Blocs** | **Banc de câblage JointJS (`@joint/core`)** à composants déplaçables et routage orthogonal automatique (détection de court-circuit `5V/GND`, erreur de bus I2C, panne fil buzzer 5e S4), **grille batterie/capteur/LED** avec multimètre virtuel, **éditeur de blocs glisser-déposer** avec aperçu MicroPython, **logigramme réactif** (`Cytoscape.js`), défis auto-validés et client/simulateur **MQTT WebSocket**. |
| **3 · Réseau & MQTT** | Topologie réseau interactive (`ReseauAtelier` 2,4 GHz vs LAN), simulateur terminal SSH / `mosquitto_sub` & `pub`, **protocole expérimental 5 essais** (latence & taux de réussite) et labo critique **Règle de seuil T14 vs IA** (faux positifs / faux négatifs). |
| **4 · Fiches & Export PDF** | Questionnaires différenciés **5e / 4e / 3e**, grille d’auto-évaluation, sauvegarde locale automatique, export/import **JSON élève** (dépôt ENT / Pronote) et génération de **Fiche Élève PDF A4** structurée (`jsPDF` avec captures 3D, schéma câblé et blocs). |
| **5 · Comparatifs** | Comparatif **ESP32-CAM OV2640 vs Endoscope USB-C** (alerte norme **UVC**), matrice des **6 cartes** du kit, comparatif des **4 logiciels** (*mBlock 5*, *MakeCode*, *Thonny*, *PuTTY*) et synthèse des choix matériels Cycle 4. |
| **6 · Guide Enseignant** | Fiches techniques **`T1` à `T15`** (installation Raspberry Pi OS, Mosquitto, point d’accès 2,4 GHz, flashage ESP32-C3 / Pico W / ESP32-CAM, script serveur `ia_atelier.py`) et **checklist pré-séance T13**. |
| **7 · Révision & Quiz** | Glossaire filtrable, mémo des commandes `mosquitto_*` et quiz formatif interactif. |

### Accessibilité & confort de classe
- **Mode EBEP (Dys / TSA)** : agrandissement de la typographie, augmentation des interlignes et coupure des signaux sonores du buzzer.
- **Thème Sombre / Clair** : adaptation complète de l’interface, du studio 3D, des graphes Cytoscape et du banc JointJS (impression A4 préservée sur fond blanc).
- **Mode hors ligne PWA** : mise en cache complète des ressources statiques et bannière de mise à jour (`Mettre à jour`) lorsqu’une nouvelle version est déployée.

---

## Architecture matérielle & principes Cycle 4

- **Cible élèves (programmation par blocs uniquement)** : **BBC micro:bit V2** enfichée dans un **Shield Grove** sans soudure (connecteurs détrompés JST 4 broches : Luminosité `P0`, Ultrason `P0`, LED 5 mm `P1`, Buzzer `P2`, OLED `I2C`).
- **Nœuds Wi-Fi 2,4 GHz préprogrammés par l’enseignant** : **ESP32-CAM OV2640** (flux MJPEG), **ESP32-C3 SuperMini** ou **Raspberry Pi Pico W** (télémétrie MQTT).
- **Serveur atelier enseignant** : **Raspberry Pi 400** diffusant un point d’accès isolé **2,4 GHz** (`ReseauAtelier`, `10.42.0.1`), le broker **Mosquitto MQTT**, le service de décision simulée **T14** et cette PWA.

---

## Stack technique

- **Framework UI** : Svelte 5 (Runes) + TypeScript + Vite 8 + Tailwind CSS v4
- **3D & Diagrammes** : Three.js (PBR + `RoomEnvironment`), JointJS (`@joint/core`), Cytoscape.js
- **Éditeur & Export** : `svelte-dnd-action`, `jsPDF`, `lucide-svelte`
- **Réseau & Hors ligne** : `mqtt` (WebSocket), `vite-plugin-pwa` (Workbox)

---

## Installation & développement local

### Prérequis
- **Node.js 20+** (recommandé : Node.js 22 LTS) et **npm** (ou `bun`).

### Commandes

```bash
# 1. Cloner le dépôt
git clone <URL_DU_DEPOT_GITHUB>
cd lunettes-connectees-ia-cycle4

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement (port 3000)
npm run dev

# 4. Vérifier le typage TypeScript
npm run lint

# 5. Compiler le bundle de production + Service Worker PWA (dossier dist/)
npm run build

# 6. Prévisualiser le build de production en local
npm run preview
```

Le build génère un site **100 % statique** dans le dossier `dist/` (contenant `index.html`, `manifest.webmanifest`, `sw.js`, `workbox-*.js`, les icônes PWA et le dossier `assets/`). **Aucun backend Node.js n’est nécessaire en production** : n’importe quel serveur HTTP statique suffit.

---

## Déployer l’application en PWA sur son serveur

### Prérequis PWA (HTTPS & Service Worker)

Pour qu’un navigateur (Chrome, Edge, Firefox, Safari) active le **Service Worker**, la mise en cache hors ligne et le bouton **« Installer l’application »**, deux conditions sont requises :

1. **Origine sécurisée** : le site doit être servi en **HTTPS** (ou sur `http://localhost` en local).
2. **Politique de cache correcte** :
   - `index.html`, `sw.js` et `manifest.webmanifest` **ne doivent jamais être mis en cache de manière agressive** (`Cache-Control: no-cache`), afin que les clients détectent immédiatement les mises à jour.
   - Les fichiers dans `/assets/*` (noms hashés par Vite) peuvent être mis en cache longue durée (`immutable`).

---

### Option A : Caddy (HTTPS automatique — recommandé)

**Caddy** gère automatiquement le certificat TLS (Let’s Encrypt) et sert parfaitement les PWA statiques.

1. Compilez l’application et copiez le contenu de `dist/` sur votre serveur (ex. `/var/www/lunettes-ia`).
2. Configurez `/etc/caddy/Caddyfile` :

```caddyfile
lunettes.votre-domaine.fr {
    root * /var/www/lunettes-ia
    encode zstd gzip

    # Pas de cache navigateur sur le Service Worker, le manifest et l'entrée HTML
    @pwaNoCache {
        path /index.html /sw.js /manifest.webmanifest /registerSW.js
    }
    header @pwaNoCache Cache-Control "no-cache, no-store, must-revalidate"

    # Cache long sur les assets hashés par Vite
    @hashedAssets {
        path /assets/*
    }
    header @hashedAssets Cache-Control "public, max-age=31536000, immutable"

    # Fallback SPA
    try_files {path} /index.html
    file_server
}
```

3. Rechargez Caddy :

```bash
sudo systemctl reload caddy
```

---

### Option B : Nginx + Certbot (serveur Linux / VPS)

1. Copiez le dossier `dist/` vers `/var/www/lunettes-ia`.
2. Créez `/etc/nginx/sites-available/lunettes-ia` :

```nginx
server {
    listen 80;
    server_name lunettes.votre-domaine.fr;

    root /var/www/lunettes-ia;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/manifest+json;

    # Assets hashés (cache 1 an)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Fichiers critiques PWA (toujours revalidés)
    location ~* ^/(sw\.js|registerSW\.js|manifest\.webmanifest|index\.html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
        try_files $uri =404;
    }

    # Routage SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Activez le site puis activez **HTTPS** avec Certbot :

```bash
sudo ln -s /etc/nginx/sites-available/lunettes-ia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lunettes.votre-domaine.fr
```

---

### Option C : Raspberry Pi 400 en classe hors ligne (`10.42.0.1`)

En salle de technologie sur le réseau local isolé `ReseauAtelier` (`10.42.0.1`), deux modes sont possibles :

#### 1. Diffusion HTTP locale rapide (accès immédiat sans certificat)
Idéal pour une séance rapide (l’application fonctionne à 100 % sur le réseau local, sans icône d’installation PWA navigateur) :

```bash
# Copier le dossier dist/ sur le Raspberry Pi 400 dans /var/www/lunettes-ia/dist
cd /var/www/lunettes-ia/dist
python3 -m http.server 8080 --bind 0.0.0.0
# Accès élèves : http://10.42.0.1:8080
```

#### 2. Activer la pleine installabilité PWA en réseau local isolé (HTTPS local)
Les navigateurs exigent **HTTPS** pour activer le Service Worker sur une IP LAN (`10.42.0.1`). Deux solutions :

- **Avec `mkcert` + Nginx / Caddy** *(recommandé sur un parc d’ordinateurs géré)* :
  1. Générez une autorité locale avec `mkcert -install` puis un certificat pour l’IP/nom local :
     ```bash
     mkcert 10.42.0.1 lunettes.atelier.local
     ```
  2. Installez la racine CA (`rootCA.pem`) sur les postes élèves (ou via GPO Windows) et configurez Nginx/Caddy en HTTPS sur le port `443`.
- **Ou avec Caddy `tls internal`** :
  ```caddyfile
  https://10.42.0.1 {
      tls internal
      root * /var/www/lunettes-ia/dist
      try_files {path} /index.html
      file_server
  }
  ```
- **Alternative rapide sur postes Windows/Chromium de salle** *(si aucun certificat local n’est déployé)* : autoriser temporairement l’origine locale dans Chrome/Edge via `chrome://flags/#unsafely-treat-insecure-origin-as-secure` en ajoutant `http://10.42.0.1:8080`.

---

### Option D : Conteneur Docker (Nginx)

Créez un `Dockerfile` à la racine si vous préférez déployer via Docker / Portainer :

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }\n\
  location ~* ^/(sw\\.js|manifest\\.webmanifest|index\\.html)$ { add_header Cache-Control "no-cache"; }\n\
  location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker build -t lunettes-ia-pwa .
docker run -d -p 8080:80 --name lunettes-ia lunettes-ia-pwa
```
*(Placez ensuite un reverse proxy HTTPS comme Caddy, Traefik ou Nginx Proxy Manager devant le port `8080` pour exposer la PWA en HTTPS.)*

---

### Vérifier l’installation PWA & les mises à jour

1. Ouvrez l’URL **HTTPS** dans Chrome ou Edge.
2. Vérifiez l’apparition de l’icône **Installer** dans la barre d’adresse (ou le bouton d’installation dans l’en-tête).
3. Dans **DevTools (`F12`) → Application → Service Workers**, vérifiez que `sw.js` est **activated and is running**, puis cochez **Offline** et rechargez la page : toute l’application (y compris la 3D, JointJS et le PDF) doit se charger sans réseau.
4. Lors d’un nouveau déploiement (`npm run build` puis remplacement de `dist/`), le composant `PwaStatus` détecte automatiquement la nouvelle version et propose le bouton **« Mettre à jour »** aux utilisateurs.

---

## Connexion au broker MQTT local (optionnel)

Par défaut, le labo MQTT de l’Onglet 2 et le terminal de l’Onglet 3 fonctionnent en **simulation autonome hors ligne**. Pour relier directement l’application au vrai broker **Mosquitto** du Raspberry Pi 400 (fiche enseignant **T3**), activez un listener WebSocket dans `/etc/mosquitto/conf.d/atelier.conf` :

```conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd

# Listener WebSocket pour la PWA
listener 9001
protocol websockets
```

> **Note HTTPS / Mixed Content** : si la PWA est servie en `https://`, le navigateur imposera une connexion WebSocket chiffrée **`wss://`** (via reverse proxy Caddy/Nginx vers `localhost:9001`). En `http://` local, `ws://10.42.0.1:9001` fonctionne directement.

---

## Structure du projet

```text
├── public/                 # Icônes PWA (192x192, 512x512, maskable, apple-touch-icon)
├── src/
│   ├── components/
│   │   ├── layout/         # HeaderBar, PedagogicalGuide, PwaStatus, PrintLayout
│   │   ├── tab1/           # Scene3D (Three.js), Tab1Discovery, TechnicalDrawingsSVG
│   │   ├── tab2/           # WiringBenchSVG (JointJS), ElectronicLab, BlockEditor, LogigrammeGraph, MqttWebSocketLab
│   │   ├── tab3/           # NetworkTopologyGraph, AiVsRuleLab, Tab3NetworkMqtt
│   │   ├── tab4/           # Tab4Worksheets (5e/4e/3e + export PDF A4)
│   │   ├── tab5/           # Tab5Comparisons (caméras, 6 cartes, 4 logiciels, justification)
│   │   ├── tab6/           # Tab6TeacherGuide (fiches T1–T15 & checklist T13)
│   │   └── tab7/           # Tab7Revision (glossaire, mémo Mosquitto, quiz)
│   ├── lib/
│   │   ├── data/           # curriculum.ts, pedagogyPlus.ts
│   │   ├── joint/          # WiringBenchJoint.ts (@joint/core)
│   │   ├── stores/         # appState.svelte.ts (état global + persistance localStorage)
│   │   ├── three/          # GlassesScene.ts (modèle 3D PBR procédural)
│   │   └── utils/          # audio.ts, pdfExport.ts (jsPDF)
│   ├── App.svelte
│   ├── app.css
│   └── main.ts
├── index.html
├── vite.config.ts          # Configuration Vite + VitePWA (Workbox & Manifest)
└── package.json
```

---

## Sécurité & cadre pédagogique

- **Alimentation 5 V USB uniquement** : aucune batterie LiPo nue à proximité du visage ; alimentation exclusivement par port USB ou batterie externe USB normée.
- **Maquette non certifiée EPI** : ce prototype pédagogique ne remplace en aucun cas des lunettes de protection normalisées (EN 166).
- **Esprit critique IA** : le script serveur `T14` (`ia_atelier.py`) est explicitement présenté comme une **règle déterministe de seuil** (`distance < 20 cm`) simulant un service décisionnel, et non un réseau de neurones.
- **Confidentialité** : aucune donnée élève n’est envoyée sur un serveur distant ; toute la progression reste stockée localement dans le navigateur (`localStorage`) et s’exporte manuellement en JSON ou PDF A4.
