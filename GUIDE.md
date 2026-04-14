# Guide du projet SIO Chat — Mode d'emploi complet

> Ce document explique comment fonctionne chaque partie du projet, comment le modifier sans casser l'ensemble, et quels sont les pièges à éviter.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Comment lancer le projet](#3-comment-lancer-le-projet)
4. [Architecture — Vue 3 + Socket.IO](#4-architecture--vue-3--socketio)
5. [Le serveur — `serveur/serveur.js`](#5-le-serveur--serveurserveurjs)
6. [La connexion Socket.IO — `src/socket/socketconnect.js`](#6-la-connexion-socketio--srcsocketsocketconnectjs)
7. [La session — `src/session.js`](#7-la-session--srcsessionjs)
8. [Le routeur — `src/router/index.js`](#8-le-routeur--srcrouterindexjs)
9. [Le point d'entrée — `src/main.js`](#9-le-point-dentrée--srcmainjs)
10. [La vue Login — `src/views/LoginView.vue`](#10-la-vue-login--srcviewsloginviewvue)
11. [La vue Chat — `src/views/ChatView.vue`](#11-la-vue-chat--srcviewschatviewvue)
12. [Le style global — `src/style.css`](#12-le-style-global--srcstylesscss)
13. [Le flux de données complet — de bout en bout](#13-le-flux-de-données-complet--de-bout-en-bout)
14. [Comment modifier le projet](#14-comment-modifier-le-projet)
15. [Pièges fréquents à éviter](#15-pièges-fréquents-à-éviter)
16. [Lexique des concepts utilisés](#16-lexique-des-concepts-utilisés)

---

## 1. Vue d'ensemble

Ce projet est une **application de chat en temps réel** utilisant les WebSockets. Plusieurs utilisateurs peuvent se connecter depuis différents navigateurs et échanger des messages instantanément.

**Ce que fait l'application :**
- Demande un pseudo à l'utilisateur avant l'accès au chat
- Stocke le pseudo dans le navigateur (localStorage) pour ne pas le redemander
- Connecte le navigateur au serveur via WebSocket (Socket.IO)
- Envoie et reçoit des messages en temps réel entre tous les utilisateurs connectés
- Distingue visuellement les messages envoyés par soi-même des messages des autres

**Ce que le projet utilise :**
- **Vue 3** — framework JavaScript pour construire l'interface (réactivité automatique)
- **Vue Router** — gestion de la navigation entre la page login et la page chat
- **Socket.IO** — bibliothèque WebSocket (communication temps réel bidirectionnelle)
- **Vite** — outil de développement qui sert les fichiers et recharge la page automatiquement
- **Express** — serveur HTTP minimal pour le backend
- **Node.js** — environnement d'exécution du serveur

**Ce que le projet n'utilise pas :**
- Aucune base de données (les messages ne sont pas persistés, ils disparaissent si le serveur redémarre)
- Aucune authentification réelle (le pseudo n'est pas vérifié côté serveur)

---

## 2. Structure des fichiers

```
siochate6/
│
├── package.json        → Scripts npm pour lancer serveur + client
│
├── serveur/            → Code du serveur (backend Node.js)
│   ├── package.json    → Dépendances serveur (express, socket.io, cors)
│   └── serveur.js      → Serveur HTTP + WebSocket (Socket.IO)
│
└── app/                → Code du client (frontend Vue 3)
    ├── package.json    → Dépendances client (vue, vue-router, socket.io-client)
    ├── vite.config.js  → Configuration Vite (port 5173, plugin Vue)
    ├── index.html      → Page HTML unique (point d'entrée du navigateur)
    │
    └── src/
        ├── main.js             → Point d'entrée JS (instancie Vue, monte l'app)
        ├── App.vue             → Composant racine (affiche la vue courante)
        ├── style.css           → Styles globaux (variables CSS, reset)
        │
        ├── socket/
        │   └── socketconnect.js → Instance Socket.IO partagée (singleton)
        │
        ├── session.js          → Gestion du pseudo (localStorage)
        │
        ├── router/
        │   └── index.js        → Routes + gardes de navigation
        │
        └── views/
            ├── LoginView.vue   → Page de choix du pseudo
            └── ChatView.vue    → Page de chat (messages + envoi)
```

**Règle d'or :** chaque fichier a **une seule responsabilité**. Si tu veux modifier l'affichage du chat, tu touches `ChatView.vue`. Si tu veux changer comment le pseudo est stocké, tu touches `session.js`. Si tu veux ajouter une route, tu touches `router/index.js`.

---

## 3. Comment lancer le projet

Il faut **deux terminaux** ouverts en même temps (bash, pas PowerShell).

### Première utilisation — installer les dépendances

```bash
cd /c/Users/Admin/Documents/sio-chat-main/sio-chat-main/siochate6
npm run install:all
```

### Terminal 1 — lancer le serveur Socket.IO

```bash
cd /c/Users/Admin/Documents/sio-chat-main/sio-chat-main/siochate6
npm run server
```

> Le serveur démarre sur **http://localhost:3001**
> Tu dois voir : `Serveur Socket.IO démarré sur http://localhost:3001`

### Terminal 2 — lancer le client Vue

```bash
cd /c/Users/Admin/Documents/sio-chat-main/sio-chat-main/siochate6
npm run client
```

> L'application est accessible sur **http://localhost:5173**

### Pourquoi deux terminaux ?

Le **serveur** (port 3001) gère les WebSockets et la communication entre utilisateurs. Le **client** (port 5173) est l'interface affichée dans le navigateur. Ce sont deux processus Node.js distincts qui doivent tourner simultanément. Si le serveur est arrêté, le client affiche "websocket error".

### Résumé

| Terminal | Dossier | Commande | URL |
|----------|---------|----------|-----|
| Terminal 1 | `siochate6/` | `npm run server` | http://localhost:3001 |
| Terminal 2 | `siochate6/` | `npm run client` | http://localhost:5173 |

---

## 4. Architecture — Vue 3 + Socket.IO

Le projet suit une organisation en **couches** inspirée du principe de séparation des responsabilités :

```
┌──────────────────────────────────────────────────┐
│                  NAVIGATEUR                       │
│                                                   │
│  LoginView.vue  ──(pseudo)──▶  session.js         │
│                                                   │
│  ChatView.vue  ◀──(messages)── socketconnect.js   │
│       │                              │            │
│       └────────(envoi)───────────────┘            │
└────────────────────────────────────────────────── ┘
                          │ WebSocket
┌─────────────────────────┼────────────────────────┐
│         SERVEUR         │                         │
│                         ▼                         │
│              serveur.js (Socket.IO)               │
│         io.emit() ──▶ TOUS les clients            │
└──────────────────────────────────────────────────┘
```

| Fichier | Rôle |
|---------|------|
| `session.js` | Stocke et lit le pseudo (localStorage). Ne sait pas que Vue existe. |
| `socketconnect.js` | Crée et exporte la connexion WebSocket. Partagée par toute l'app. |
| `router/index.js` | Décide quelle vue afficher selon l'URL et si un pseudo existe. |
| `LoginView.vue` | Demande le pseudo. Ne connaît pas Socket.IO. |
| `ChatView.vue` | Écoute les messages, permet d'en envoyer. |
| `serveur.js` | Reçoit les messages d'un client, les redistribue à tous. |

**Flux d'un message :**
```
ChatView → socket.emit("chat message", texte)
         → serveur.js reçoit l'événement
         → io.emit("chat message", payload) vers TOUS les clients connectés
         → ChatView.onChatMessage() reçoit et ajoute à la liste
```

---

## 5. Le serveur — `serveur/serveur.js`

### Ce qu'il fait

C'est le **cœur temps réel** de l'application. Il reçoit les messages de chaque client et les redistribue à tous les autres simultanément.

### Les dépendances

```js
const express = require("express");   // Serveur HTTP
const http = require("http");         // Module Node.js pour créer le serveur HTTP brut
const cors = require("cors");         // Autorise les requêtes cross-origin
const { Server } = require("socket.io"); // Moteur WebSocket
```

### Pourquoi `http.createServer(app)` et pas juste `app.listen()` ?

Socket.IO a besoin d'accéder au serveur HTTP brut pour y **greffer** le protocole WebSocket. `express()` seul ne suffit pas. On crée donc le serveur HTTP manuellement et on le passe à Socket.IO :

```js
const app = express();
const server = http.createServer(app);   // Serveur HTTP brut
const io = new Server(server, { ... }); // Socket.IO se branche dessus
server.listen(PORT);                    // On écoute sur ce serveur HTTP
```

### Le CORS

```js
app.use(cors({ origin: true, credentials: true }));

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});
```

`origin: true` signifie "accepter toutes les origines". En production, il faudrait restreindre à l'URL du client (ex: `origin: "https://mon-site.fr"`). Ici c'est permissif car c'est un projet de dev local.

### Les événements Socket.IO

```js
io.on("connection", (socket) => {
  // Un nouveau client vient de se connecter
  // socket = objet représentant CE client spécifique
  console.log("Un utilisateur s'est connecté :", socket.id);

  socket.on("disconnect", () => {
    // CE client vient de se déconnecter
  });

  socket.on("chat message", (msg) => {
    // CE client a envoyé un message
    const payload = {
      id: socket.id,        // Identifiant unique du client émetteur
      message: String(msg ?? ""),
      ts: Date.now(),       // Timestamp serveur (millisecondes)
    };
    io.emit("chat message", payload); // Envoyer à TOUS (y compris l'émetteur)
  });
});
```

**Différence entre `socket.emit` et `io.emit` :**
- `socket.emit(...)` → envoie **seulement** au client concerné
- `io.emit(...)` → envoie à **tous** les clients connectés
- `socket.broadcast.emit(...)` → envoie à **tous sauf** le client concerné

### Les routes HTTP classiques

```js
app.get("/", (_req, res) => res.json({ name: "siochat6", status: "running" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
```

Ces routes permettent de vérifier que le serveur tourne (utile pour le débogage : ouvrir http://localhost:3001 dans le navigateur).

### Changer le port du serveur

```js
const PORT = Number(process.env.PORT || 3001);
// Changer 3001 par le port souhaité, ex :
const PORT = Number(process.env.PORT || 4000);
```

**Attention :** si tu changes le port serveur, il faut aussi le changer dans `socketconnect.js` côté client.

---

## 6. La connexion Socket.IO — `src/socket/socketconnect.js`

### Ce qu'il fait

Ce fichier crée **une seule instance** de la connexion Socket.IO et l'exporte pour que toute l'application puisse l'utiliser. C'est un **singleton**.

```js
import { io } from 'socket.io-client'

const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export const socket = io(url, {
  transports: ['websocket', 'polling'],
  autoConnect: false,
})
```

### Pourquoi `autoConnect: false` ?

Par défaut, Socket.IO se connecte dès que l'objet est créé. Ici on désactive ce comportement pour que la connexion ne se fasse **que quand l'utilisateur clique sur "Se connecter au serveur"** dans le chat. Cela évite une connexion WebSocket inutile si l'utilisateur est encore sur la page login.

La connexion est déclenchée manuellement dans `ChatView.vue` :
```js
socket.connect()    // Connexion explicite
socket.disconnect() // Déconnexion explicite
```

### Pourquoi `['websocket', 'polling']` ?

Socket.IO essaie d'abord le **WebSocket** (connexion persistante, idéale). Si le réseau ou le navigateur ne le supporte pas, il bascule sur le **polling HTTP** (requêtes répétées toutes les X secondes). C'est un fallback automatique.

### `import.meta.env.VITE_SOCKET_URL`

Pour changer l'URL du serveur sans modifier le code, créer un fichier `.env` dans `app/` :
```
VITE_SOCKET_URL=http://192.168.1.42:3001
```

Toutes les variables Vite doivent commencer par `VITE_` pour être accessibles dans le code frontend.

### Pourquoi un singleton ?

Si `socketconnect.js` créait une nouvelle instance à chaque `import`, chaque composant aurait sa propre connexion WebSocket — ce qui doublerait les connexions et causerait des messages dupliqués. Le module ES est mis en cache : un seul objet `socket` est créé et partagé.

---

## 7. La session — `src/session.js`

### Ce qu'il fait

Gère le **pseudo de l'utilisateur** en le persistant dans le `localStorage` du navigateur. C'est le seul système d'"authentification" du projet.

```js
export const PSEUDO_KEY = 'siochat_pseudo'

export function getPseudo()   // Lit le pseudo ('' si absent)
export function setPseudo(v)  // Enregistre le pseudo, retourne false si vide
export function clearPseudo() // Supprime le pseudo (déconnexion)
export function hasPseudo()   // true si un pseudo valide est stocké
```

### Le localStorage

Le `localStorage` est un espace de stockage dans le navigateur qui **persiste entre les rechargements de page**. Contrairement aux cookies, il n'est pas envoyé au serveur.

```
localStorage["siochat_pseudo"] = "LordMd"
```

Si tu fermes et réouvres le navigateur, le pseudo est toujours là — c'est pourquoi l'app redirige directement vers `/chat` si un pseudo existe déjà.

### Pour vider la session manuellement (console F12)

```js
localStorage.removeItem("siochat_pseudo")
// Puis recharger la page
```

### Ajouter une nouvelle donnée en session

Exemple : mémoriser le thème choisi par l'utilisateur :
```js
export const THEME_KEY = 'siochat_theme'

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark'
}
export function setTheme(value) {
  localStorage.setItem(THEME_KEY, value)
}
```

---

## 8. Le routeur — `src/router/index.js`

### Ce qu'il fait

Le routeur Vue Router gère la **navigation** entre les pages sans recharger le navigateur (SPA — Single Page Application). Il définit quelles URLs affichent quelle vue, et protège certaines routes.

### Les routes définies

| URL | Vue affichée | Condition |
|-----|-------------|-----------|
| `/` | (redirige) | → `/chat` si pseudo, → `/login` sinon |
| `/login` | `LoginView.vue` | Redirige vers `/chat` si pseudo déjà présent |
| `/chat` | `ChatView.vue` | Redirige vers `/login` si pas de pseudo |
| `/*` (toute autre URL) | (redirige vers `/`) | Catch-all |

### Les gardes de navigation (`beforeEnter`)

Ce sont des fonctions exécutées **avant** d'afficher une vue. Elles vérifient une condition et décident si la navigation est autorisée :

```js
{
  path: '/chat',
  beforeEnter(_to, _from, next) {
    if (!hasPseudo()) next({ name: 'login', query: { redirect: '/chat' } })
    else next()  // OK, continuer
  },
}
```

Si tu essaies d'aller sur `/chat` sans pseudo, le routeur t'envoie automatiquement sur `/login`. C'est la protection de la route.

### Le paramètre `redirect`

Quand la garde de `/chat` redirige vers login, elle passe `?redirect=/chat` dans l'URL. LoginView.vue récupère ce paramètre et, après validation du pseudo, redirige directement vers `/chat` au lieu de la page d'accueil.

```js
// Dans LoginView.vue :
const redirect = route.query.redirect
const path = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
  ? redirect
  : '/chat'
router.replace(path)
```

La vérification `startsWith('/')` et `!startsWith('//')` protège contre les **open redirects** (attaque où un lien malveillant redirige vers un site externe).

### `createWebHistory`

```js
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  ...
})
```

`createWebHistory` utilise l'API History du navigateur pour avoir de "vraies" URLs (`/chat`) au lieu de URLs avec `#` (`/#/chat`). En dev avec Vite, c'est géré automatiquement.

---

## 9. Le point d'entrée — `src/main.js`

C'est le **premier fichier JavaScript** exécuté par le navigateur (référencé dans `index.html`). Il démarre toute l'application Vue.

```js
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

**Étape par étape :**
1. `createApp(App)` — crée l'application Vue avec `App.vue` comme composant racine
2. `.use(router)` — branche le routeur Vue Router sur l'application
3. `.mount('#app')` — insère l'application dans le `<div id="app">` de `index.html`

L'ordre compte : le routeur doit être branché **avant** le montage, sinon les composants qui utilisent `useRouter()` ne fonctionneront pas.

### `App.vue` — le composant racine

```vue
<template>
  <RouterView />
</template>
```

`App.vue` est volontairement minimal. `<RouterView />` est un composant Vue Router qui affiche **la vue correspondant à l'URL courante** (`LoginView` ou `ChatView`). Quand l'URL change, Vue Router remplace automatiquement le contenu de `<RouterView />`.

---

## 10. La vue Login — `src/views/LoginView.vue`

### Ce qu'elle fait

Affiche un formulaire pour choisir un pseudo. Valide le pseudo et redirige vers le chat si tout est correct.

### Les variables réactives

```js
const pseudo = ref('')   // Valeur de l'input (liée avec v-model)
const error = ref('')    // Message d'erreur affiché sous le champ
```

`ref('')` crée une **variable réactive** Vue. Quand sa valeur change, Vue met à jour automatiquement l'interface (l'input et le message d'erreur).

### La validation du pseudo

```js
function submit() {
  error.value = ''
  const p = pseudo.value.trim()

  if (!p) {
    error.value = 'Entrez un pseudo pour continuer.'
    return
  }
  if (p.length > 32) {
    error.value = '32 caractères maximum.'
    return
  }
  if (!setPseudo(p)) {
    error.value = 'Pseudo invalide.'
    return
  }
  // Tout bon → rediriger
  router.replace(path)
}
```

Les vérifications se font **en cascade** : dès qu'une condition échoue, on affiche l'erreur et on sort (`return`). Ce pattern s'appelle les **early returns** — il évite les `if/else` imbriqués.

### `onMounted`

```js
onMounted(() => {
  if (hasPseudo()) router.replace({ name: 'chat' })
})
```

Si l'utilisateur a déjà un pseudo (ex: il revient après avoir fermé l'onglet), on le redirige immédiatement. `onMounted` est appelé par Vue une fois que le composant est affiché dans la page.

### La directive `v-model`

```html
<input v-model="pseudo" ... />
```

`v-model` synchronise **dans les deux sens** la valeur de l'input avec la variable `pseudo`. Si l'utilisateur tape du texte, `pseudo.value` est mis à jour. Si le code modifie `pseudo.value`, l'input est mis à jour.

---

## 11. La vue Chat — `src/views/ChatView.vue`

### Ce qu'elle fait

C'est le cœur de l'application. Elle gère la connexion WebSocket, l'affichage des messages, et l'envoi de nouveaux messages.

### Les variables réactives

```js
const pseudo = computed(() => getPseudo())  // Pseudo lu depuis session.js
const draft = ref('')                        // Texte en cours de saisie
const messages = ref([])                    // Liste de tous les messages reçus
const connected = ref(false)                // État de la connexion Socket.IO
const socketId = ref('')                    // ID unique attribué par le serveur
const error = ref('')                       // Message d'erreur de connexion
```

`computed` est différent de `ref` : c'est une valeur **calculée** qui se met à jour automatiquement quand ses dépendances changent. `getPseudo()` lit le localStorage — si le pseudo change, `pseudo` sera recalculé.

### La liste triée des messages

```js
const sortedMessages = computed(() =>
  [...messages.value].sort((a, b) => a.ts - b.ts),
)
```

On trie par timestamp (`ts`) croissant pour garantir l'ordre chronologique. Le `[...messages.value]` crée une **copie** du tableau avant de trier — sans ça, `.sort()` modifierait le tableau original et pourrait créer des bugs d'affichage.

### Gestion des événements Socket.IO

```js
onMounted(() => {
  socket.on('connect', onConnect)
  socket.on('disconnect', onDisconnect)
  socket.on('connect_error', onConnectError)
  socket.on('chat message', onChatMessage)
  if (socket.connected) onConnect()  // Déjà connecté au montage ?
})

onUnmounted(() => {
  socket.off('connect', onConnect)
  socket.off('disconnect', onDisconnect)
  socket.off('connect_error', onConnectError)
  socket.off('chat message', onChatMessage)
  socket.disconnect()
})
```

**Pourquoi `onUnmounted` est crucial ?**
Si on ne supprime pas les écouteurs quand le composant disparaît, ils continuent de s'accumuler à chaque re-montage. Si l'utilisateur navigue login → chat → login → chat plusieurs fois, il aurait des dizaines d'écouteurs actifs et chaque message serait reçu plusieurs fois.

### Envoyer un message

```js
function sendMessage() {
  const text = draft.value.trim()
  if (!text || !socket.connected) return
  const nick = pseudo.value
  const payload = nick ? `${nick} : ${text}` : text
  socket.emit('chat message', payload)
  draft.value = ''  // Vider le champ après envoi
}
```

Le message envoyé au serveur est une simple chaîne : `"LordMd : Bonjour"`. C'est le serveur qui ajoute l'`id`, le `ts`, et redistribue à tous.

### Identifier ses propres messages

```js
:class="{ 'bubble--me': m.id === socketId }"
```

Chaque message reçu contient l'`id` du socket qui l'a envoyé. Si cet id correspond au `socketId` de l'utilisateur courant, la bulle reçoit la classe `bubble--me` (style différent, alignée à droite).

### `leaveChat`

```js
function leaveChat() {
  disconnect()
  clearPseudo()
  router.replace({ name: 'login' })
}
```

Quitter le chat ferme la connexion WebSocket, supprime le pseudo du localStorage, et navigue vers le login.

### Les directives Vue dans le template

| Directive | Exemple | Ce qu'elle fait |
|-----------|---------|-----------------|
| `v-if` | `v-if="!connected"` | Affiche l'élément seulement si la condition est vraie |
| `v-else` | `v-else` | Affiche si la condition du `v-if` précédent est fausse |
| `v-else-if` | `v-else-if="connected"` | Condition intermédiaire |
| `v-for` | `v-for="(m, i) in sortedMessages"` | Répète l'élément pour chaque item |
| `v-model` | `v-model="draft"` | Synchronise input ↔ variable |
| `:class` | `:class="{ 'bubble--me': ... }"` | Classe conditionnelle |
| `:disabled` | `:disabled="!connected"` | Attribut dynamique |
| `@click` | `@click="connect"` | Écoute un événement (clic) |
| `@submit.prevent` | `@submit.prevent="sendMessage"` | Soumet le formulaire sans recharger la page |

---

## 12. Le style global — `src/style.css`

### Les variables CSS (`:root`)

```css
:root {
  --text: #6b6375;             /* Texte principal (gris chaud) */
  --text-h: #08060d;           /* Titres (quasi-noir) */
  --bg: #fff;                  /* Fond (blanc en mode clair) */
  --border: #e5e4e7;           /* Bordures */
  --accent: #aa3bff;           /* Violet (couleur d'accentuation) */
  --accent-bg: rgba(...);      /* Fond des éléments violets */
  --accent-border: rgba(...);  /* Bordure des éléments violets */
  --shadow: rgba(...);         /* Ombre des cartes */
}
```

Ces variables sont utilisées dans `LoginView.vue` via `var(--accent)`. En mode sombre (détecté automatiquement), elles prennent d'autres valeurs.

### Le mode sombre automatique

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #16171d;
    --text: #9ca3af;
    ...
  }
}
```

Si le système de l'utilisateur est en mode sombre, le CSS change automatiquement les variables. Pas de JavaScript nécessaire.

### Pourquoi `ChatView.vue` n'utilise pas ces variables ?

`ChatView.vue` utilise des couleurs codées en dur (`#12002a`, `#c084fc`...) dans son bloc `<style scoped>`. C'est une palette violette indépendante des variables globales. Ce design assumé permet d'avoir le thème sombre du chat sans dépendre du mode système de l'utilisateur.

### `<style scoped>`

Chaque `.vue` peut avoir un bloc `<style scoped>`. Le mot-clé `scoped` fait que les styles **ne s'appliquent qu'à ce composant**. Vue ajoute automatiquement un attribut unique (`data-v-xxxxxxxx`) aux éléments pour isoler les styles.

### Les classes CSS importantes du chat

| Classe | Usage |
|--------|-------|
| `.siochat` | Conteneur principal centré (max-width 720px) |
| `.panel` | Zone de connexion (fond violet foncé, bordure) |
| `.panel__error` | Message d'erreur (rouge) |
| `.panel__hint` | Indice quand déconnecté (violet) |
| `.chat__messages` | Zone de défilement des messages |
| `.bubble` | Bulle de message (fond violet) |
| `.bubble--me` | Ma bulle (alignée à droite, couleur différente) |
| `.bubble__meta` | Identifiant du socket (petit, discret) |
| `.bubble__time` | Horodatage du message |
| `.composer` | Formulaire d'envoi (input + bouton) |
| `.btn--primary` | Bouton principal (violet contour) |
| `.btn--ghost` | Bouton discret (transparent) |

---

## 13. Le flux de données complet — de bout en bout

### Première ouverture (pas de pseudo)

```
1. Navigateur charge http://localhost:5173
   └── index.html charge src/main.js

2. main.js crée l'app Vue :
   createApp(App).use(router).mount('#app')

3. Le routeur évalue "/" :
   hasPseudo() → false (rien dans localStorage)
   └── redirect vers /login

4. LoginView.vue s'affiche :
   - onMounted vérifie → hasPseudo() = false → reste sur login

5. L'utilisateur tape "LordMd" et clique "Entrer dans le chat" :
   submit()
   ├── setPseudo("LordMd") → localStorage["siochat_pseudo"] = "LordMd"
   └── router.replace("/chat")

6. Le routeur active /chat :
   beforeEnter → hasPseudo() = true → OK
   └── ChatView.vue s'affiche
```

### Connexion et envoi d'un message

```
7. ChatView.vue est monté (onMounted) :
   socket.on("connect", onConnect)
   socket.on("chat message", onChatMessage)
   → Socket.IO n'est PAS encore connecté (autoConnect: false)

8. L'utilisateur clique "Se connecter au serveur" :
   connect() → socket.connect()
   └── Négociation WebSocket avec localhost:3001

9. Le serveur reçoit la connexion :
   io.on("connection", socket => ...)
   console.log("Un utilisateur s'est connecté :", socket.id)

10. Côté client, l'événement "connect" se déclenche :
    onConnect() :
    ├── connected.value = true   → le bouton change ("Se déconnecter")
    └── socketId.value = socket.id

11. L'utilisateur tape "Bonjour" et appuie Entrée :
    sendMessage()
    ├── payload = "LordMd : Bonjour"
    ├── socket.emit("chat message", "LordMd : Bonjour")
    └── draft.value = ''   → champ vidé

12. Le serveur reçoit l'événement "chat message" :
    socket.on("chat message", msg => {
      payload = { id: "abc12345", message: "LordMd : Bonjour", ts: 1712345678901 }
      io.emit("chat message", payload)  → envoyé à TOUS les clients
    })

13. Tous les clients reçoivent l'événement "chat message" :
    onChatMessage(payload) :
    messages.value.push({ id, message, ts })
    └── Vue re-render la liste automatiquement

14. L'affichage :
    sortedMessages (computed) retrie par ts
    <li class="bubble" :class="{ 'bubble--me': m.id === socketId }">
    Si m.id = mon socketId → classe "bubble--me" (ma bulle, à droite)
    Sinon → bulle normale (à gauche)
```

---

## 14. Comment modifier le projet

### Changer le port du serveur (ex: 3001 → 4000)

**Fichiers à toucher :** `serveur/serveur.js` et `app/src/socket/socketconnect.js`

1. `serveur.js` :
```js
const PORT = Number(process.env.PORT || 4000); // Changer 3001 → 4000
```

2. `socketconnect.js` :
```js
const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'
```

### Ajouter une validation du pseudo côté serveur

**Fichier à toucher :** `serveur/serveur.js`

```js
socket.on("chat message", (msg) => {
  if (typeof msg !== 'string' || msg.trim().length === 0) return; // Ignorer vides
  if (msg.length > 2000) return; // Ignorer trop longs
  const payload = { id: socket.id, message: String(msg), ts: Date.now() };
  io.emit("chat message", payload);
});
```

### Afficher le nombre d'utilisateurs connectés

**Fichiers à toucher :** `serveur/serveur.js` et `ChatView.vue`

1. `serveur.js` — émettre le nombre de connectés :
```js
io.on("connection", (socket) => {
  io.emit("user count", io.engine.clientsCount); // À la connexion

  socket.on("disconnect", () => {
    io.emit("user count", io.engine.clientsCount); // À la déconnexion
  });
});
```

2. `ChatView.vue` — écouter l'événement :
```js
const userCount = ref(0)

// Dans onMounted :
socket.on("user count", (n) => { userCount.value = n })

// Dans onUnmounted :
socket.off("user count")
```

3. `ChatView.vue` — afficher dans le template :
```html
<p class="panel__status">{{ userCount }} utilisateur(s) connecté(s)</p>
```

### Changer la longueur maximale du pseudo

**Fichiers à toucher :** `LoginView.vue`

```html
<!-- Dans le template -->
<input maxlength="20" ... />  <!-- Changer 32 → 20 dans le HTML -->
```

```js
// Dans la fonction submit()
if (p.length > 20) {  // Changer 32 → 20 dans la validation JS
  error.value = '20 caractères maximum.'
  return
}
```

### Ajouter une nouvelle page (ex: page "À propos")

**Fichiers à toucher :** `router/index.js` et créer `src/views/AboutView.vue`

1. Créer `src/views/AboutView.vue`
2. Ajouter la route dans `router/index.js` :
```js
{
  path: '/about',
  name: 'about',
  component: () => import('../views/AboutView.vue'),
}
```

### Changer les couleurs du chat

**Fichier à toucher :** `src/views/ChatView.vue` — section `<style scoped>`

Les couleurs principales sont :
```css
/* Fond principal du chat */
.siochat { background: #12002a; }

/* Ma bulle de message */
.bubble--me { border-color: #c084fc; background: rgba(192, 132, 252, 0.12); }

/* Titre "SIO chat" */
.siochat__title { color: #c084fc; }
```

Changer `#c084fc` (violet clair) et `#12002a` (violet très foncé) pour modifier la palette.

---

## 15. Pièges fréquents à éviter

### 1. Lancer un seul terminal au lieu de deux

```
// MAUVAIS : lancer seulement le client
npm run client   → http://localhost:5173 (mais websocket error !)

// BON : les deux en même temps
Terminal 1 : npm run server   → localhost:3001
Terminal 2 : npm run client   → localhost:5173
```

### 2. Oublier de supprimer les écouteurs dans `onUnmounted`

```js
// MAUVAIS : l'écouteur reste actif après que le composant disparaît
onMounted(() => {
  socket.on('chat message', onChatMessage)
})
// Pas de onUnmounted → accumulation d'écouteurs, messages reçus plusieurs fois

// BON : toujours nettoyer
onUnmounted(() => {
  socket.off('chat message', onChatMessage)
  socket.disconnect()
})
```

### 3. Modifier `messages.value` directement lors du tri

```js
// MAUVAIS : .sort() modifie le tableau original → bugs d'affichage possibles
const sortedMessages = computed(() =>
  messages.value.sort((a, b) => a.ts - b.ts)
)

// BON : copier avant de trier avec le spread operator [...]
const sortedMessages = computed(() =>
  [...messages.value].sort((a, b) => a.ts - b.ts)
)
```

### 4. Utiliser `socket.emit` au lieu de `io.emit` côté serveur

```js
// MAUVAIS : le message n'est envoyé qu'à l'émetteur, pas aux autres
socket.on("chat message", (msg) => {
  socket.emit("chat message", payload); // Seulement moi
})

// BON : envoyer à tous les clients
socket.on("chat message", (msg) => {
  io.emit("chat message", payload); // Tout le monde
})
```

### 5. Ne pas vérifier `socket.connected` avant d'envoyer

```js
// MAUVAIS : plante si le socket est déconnecté
function sendMessage() {
  socket.emit('chat message', draft.value)
}

// BON : vérifier d'abord
function sendMessage() {
  if (!draft.value.trim() || !socket.connected) return
  socket.emit('chat message', draft.value)
}
```

### 6. Confondre `router.push` et `router.replace`

```js
// push → ajoute dans l'historique (l'utilisateur peut faire "Précédent")
router.push({ name: 'chat' })

// replace → remplace dans l'historique (pas de retour possible)
router.replace({ name: 'chat' }) // Utilisé pour login → chat (voulu)
```

Après login, on utilise `replace` pour que le bouton "Précédent" du navigateur ne revienne pas sur le formulaire de login avec le pseudo déjà saisi.

### 7. Oublier `.trim()` sur les entrées utilisateur

```js
// MAUVAIS : " " (espaces) passe la validation
if (!pseudo.value) return // " " est truthy !

// BON : toujours trim() avant de valider
const p = pseudo.value.trim()
if (!p) return
```

---

## 16. Lexique des concepts utilisés

| Terme | Explication |
|-------|-------------|
| **WebSocket** | Protocole de communication bidirectionnel et persistant entre navigateur et serveur. Contrairement à HTTP, la connexion reste ouverte : le serveur peut envoyer des données sans que le client ne les demande. |
| **Socket.IO** | Bibliothèque qui facilite l'utilisation des WebSockets. Ajoute un système d'événements nommés, et un fallback vers HTTP polling si WebSocket n'est pas disponible. |
| **`socket.id`** | Identifiant unique attribué par Socket.IO à chaque client connecté. Change à chaque nouvelle connexion. |
| **`io.emit` vs `socket.emit`** | `io.emit` = envoyer à TOUS les clients. `socket.emit` = envoyer à UN seul client (l'expéditeur). |
| **Vue 3** | Framework JavaScript pour construire des interfaces. Gère la **réactivité** : quand une variable change, l'interface se met à jour automatiquement. |
| **`ref()`** | Crée une variable réactive Vue. Sa valeur se lit et se modifie via `.value`. |
| **`computed()`** | Valeur dérivée d'autres réactives. Se recalcule automatiquement quand ses dépendances changent. |
| **`onMounted`** | Lifecycle hook Vue : la fonction est appelée une fois que le composant est affiché dans la page. |
| **`onUnmounted`** | Lifecycle hook Vue : la fonction est appelée quand le composant est retiré de la page. Utilisé pour nettoyer les écouteurs d'événements. |
| **`<style scoped>`** | Styles CSS qui ne s'appliquent qu'au composant courant. Vue les isole automatiquement. |
| **SPA** | Single Page Application : l'application charge une seule page HTML, la navigation est simulée par JavaScript (pas de rechargement complet). |
| **Vue Router** | Bibliothèque officielle pour gérer la navigation dans une SPA Vue. |
| **Garde de navigation** | Fonction exécutée avant d'afficher une route. Peut bloquer ou rediriger la navigation (`beforeEnter`). |
| **`localStorage`** | Stockage clé/valeur dans le navigateur. Persiste entre les rechargements. Accessible uniquement depuis JavaScript (pas envoyé au serveur). |
| **Singleton** | Patron de conception : une seule instance d'un objet est créée et partagée. `socketconnect.js` exporte un singleton pour éviter les connexions doubles. |
| **`autoConnect: false`** | Option Socket.IO qui empêche la connexion automatique à la création. La connexion doit être déclenchée explicitement via `socket.connect()`. |
| **CORS** | Cross-Origin Resource Sharing : mécanisme de sécurité du navigateur qui bloque les requêtes vers un autre domaine/port. `cors()` dans Express autorise ces requêtes. |
| **`v-model`** | Directive Vue de liaison bidirectionnelle entre un champ de formulaire et une variable réactive. |
| **`v-for`** | Directive Vue pour répéter un élément HTML pour chaque item d'une liste. |
| **`v-if` / `v-else`** | Directives Vue pour afficher conditionnellement des éléments. |
| **ESM** | ECMAScript Modules : système `import`/`export` moderne. Utilisé par Vite et le code frontend. |
| **Vite** | Outil de développement frontend. Sert les fichiers via HTTP, recharge automatiquement la page lors des modifications (HMR). |
| **HMR** | Hot Module Replacement : Vite remplace les modules modifiés sans recharger toute la page. |
| **CommonJS (`require`)** | Ancien système de modules Node.js. Utilisé dans `serveur.js` (backend). Différent des `import` du frontend. |
| **`import.meta.env`** | Variables d'environnement Vite. Celles qui commencent par `VITE_` sont accessibles dans le code frontend. |
| **Open redirect** | Faille de sécurité : un lien malveillant redirige vers un site externe. Contré dans `LoginView.vue` par la vérification `startsWith('/')`. |
| **Polling HTTP** | Fallback de Socket.IO : si WebSocket échoue, le client envoie des requêtes HTTP répétées pour simuler une connexion en temps réel. Plus lent que WebSocket. |
| **Timestamp (`ts`)** | Nombre de millisecondes depuis le 1er janvier 1970 (Unix epoch). Utilisé pour horodater et trier les messages. |
| **Early return** | Pattern : sortir d'une fonction tôt avec `return` dès qu'une condition invalide est détectée. Évite les `if/else` imbriqués. |
