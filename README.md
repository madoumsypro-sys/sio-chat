# SIO Chat — Documentation du projet

## Résumé global

Application de **chat en temps réel** entre plusieurs utilisateurs connectés dans un navigateur.

- L'utilisateur choisit un pseudo, puis envoie des messages visibles par tous
- La communication se fait via **WebSocket** (Socket.IO) : pas besoin de recharger la page
- Pas de base de données : le pseudo est stocké dans le navigateur (localStorage)

**Stack technique :**
- Backend : Node.js + Express + Socket.IO
- Frontend : Vue 3 + Vue Router + Vite
- Communication : WebSocket (avec fallback HTTP polling)

---

## Architecture générale

```
Navigateur (port 5173)          Serveur (port 3001)
┌─────────────────────┐         ┌──────────────────┐
│  Vue 3 (SPA)        │◄───────►│  Node.js         │
│  LoginView          │  WS/    │  Express         │
│  ChatView           │  HTTP   │  Socket.IO       │
│  localStorage       │         │  Broadcast msgs  │
└─────────────────────┘         └──────────────────┘
```

---

## Structure des fichiers

```
siochate6/
├── package.json          ← Scripts pour lancer tout le projet
├── serveur/              ← Tout ce qui tourne côté serveur
│   └── serveur.js        ← Le serveur Node.js
└── app/                  ← Tout ce qui tourne dans le navigateur
    ├── index.html        ← Page HTML de base
    └── src/
        ├── main.js           ← Point d'entrée de l'appli Vue
        ├── App.vue           ← Composant racine
        ├── style.css         ← Styles globaux (couleurs, polices)
        ├── session.js        ← Gestion du pseudo (localStorage)
        ├── socket/
        │   └── socketconnect.js  ← Instance Socket.IO partagée
        ├── router/
        │   └── index.js      ← Navigation et protection des pages
        └── views/
            ├── LoginView.vue ← Page de connexion (choix du pseudo)
            └── ChatView.vue  ← Page de chat (messages en temps réel)
```

---

## Rôle de chaque fichier

### Côté serveur

**`serveur/serveur.js`**
- Crée un serveur HTTP avec Express
- Ajoute Socket.IO pour les WebSockets
- Reçoit les messages des clients et les rediffuse à **tous** les connectés
- Ecoute sur le port 3001

### Côté client (frontend)

**`src/main.js`**
- Démarre l'application Vue
- Branche le router et monte l'appli dans `index.html`

**`src/App.vue`**
- Composant principal, ne fait qu'afficher la vue active via `<RouterView />`
- C'est le "conteneur" de toute l'appli

**`src/style.css`**
- Définit les variables CSS globales (couleurs, ombres)
- Supporte automatiquement le mode sombre (dark mode)

**`src/session.js`**
- Toutes les fonctions pour gérer le pseudo dans `localStorage`
- Fonctions : `getPseudo`, `setPseudo`, `clearPseudo`, `hasPseudo`

**`src/socket/socketconnect.js`**
- Crée **une seule** instance Socket.IO partagée dans toute l'appli (singleton)
- La connexion n'est pas automatique : elle se lance manuellement

**`src/router/index.js`**
- Définit les routes : `/login` et `/chat`
- Protège la page `/chat` : redirige vers `/login` si pas de pseudo
- Redirige vers `/chat` si on va sur `/login` alors qu'un pseudo existe déjà

**`src/views/LoginView.vue`**
- Formulaire pour entrer un pseudo
- Vérifie que le pseudo n'est pas vide (max 32 caractères)
- Sauvegarde le pseudo dans `localStorage` puis redirige vers `/chat`

**`src/views/ChatView.vue`**
- Page principale du chat
- Gère la connexion/déconnexion Socket.IO
- Envoie et reçoit les messages en temps réel
- Affiche ses propres messages différemment (à droite, fond violet)

---

## Fonctions principales

### `serveur.js`

| Evénement | Ce que ça fait |
|-----------|----------------|
| `connection` | Log quand un client se connecte |
| `chat message` | Reçoit un message, l'enrichit (id, timestamp), le renvoie à tous |
| `disconnect` | Log quand un client se déconnecte |

### `session.js`

| Fonction | Ce que ça fait |
|----------|----------------|
| `getPseudo()` | Lit le pseudo dans localStorage |
| `setPseudo(val)` | Sauvegarde le pseudo, retourne `false` si vide |
| `clearPseudo()` | Efface le pseudo |
| `hasPseudo()` | Retourne `true` si un pseudo valide existe |

### `ChatView.vue`

| Fonction | Ce que ça fait |
|----------|----------------|
| `connect()` | Lance la connexion WebSocket |
| `disconnect()` | Ferme la connexion |
| `sendMessage()` | Envoie le message tapé au serveur |
| `leaveChat()` | Déconnecte, efface le pseudo, redirige vers login |
| `onChatMessage(payload)` | Reçoit un message et l'ajoute à la liste |

---

## Flux : qui appelle quoi ?

### Connexion d'un utilisateur

```
1. Utilisateur ouvre l'app
2. Router vérifie → pas de pseudo → redirige vers /login
3. LoginView : l'utilisateur tape son pseudo → clic "Valider"
4. session.js : setPseudo() → sauvegarde dans localStorage
5. Router redirige vers /chat
6. ChatView monte → appelle connect()
7. socketconnect.js ouvre une connexion WebSocket vers le serveur
8. serveur.js : événement "connection" → log du nouveau client
```

### Envoi d'un message

```
1. Utilisateur tape un message → clic "Envoyer"
2. ChatView : sendMessage() → socket.emit("chat message", texte)
3. serveur.js reçoit "chat message"
4. serveur.js enrichit le message : { id, message, ts }
5. serveur.js : io.emit() → envoie à TOUS les clients connectés
6. ChatView de chaque client : onChatMessage() → ajout dans messages[]
7. Vue re-render automatiquement la liste des messages
```

### Déconnexion

```
1. Clic "Changer de pseudo" dans ChatView
2. leaveChat() → socket.disconnect()
3. session.js : clearPseudo() → efface localStorage
4. Router redirige vers /login
5. serveur.js : événement "disconnect" → log
```

---

## Concepts clés à connaître

**WebSocket vs HTTP**
- HTTP : le client demande, le serveur répond (sens unique)
- WebSocket : connexion permanente, communication dans les deux sens en temps réel

**Socket.IO**
- Librairie qui simplifie les WebSockets
- Utilise des "événements" nommés (`"chat message"`, `"connect"`, etc.)
- Fallback automatique vers HTTP polling si WebSocket indisponible

**Singleton (socketconnect.js)**
- Une seule instance de socket dans toute l'appli
- Evite d'ouvrir plusieurs connexions en parallèle

**localStorage**
- Stockage côté navigateur, persiste même après fermeture de l'onglet
- Ici : stocke le pseudo de l'utilisateur

**SPA (Single Page Application)**
- Vue Router change la vue sans recharger la page
- L'URL change mais le HTML ne se recharge pas

---

Ta mission :
Propose une solution SIMPLE et rapide à implémenter
Montre uniquement les parties du code à modifier
Explique chaque modification ligne par ligne

IMPORTANT :
Explication ULTRA SIMPLE
1 ligne = 1 explication courte
Pas de blabla
Pas de théorie inutile

Format attendu :

MODIFICATION :
(code)

EXPLICATION :
Ligne X : ...
Ligne Y : ...

COMPRÉHENSION RAPIDE :
Pourquoi on fait ça : ...
Ce que ça change : ...

RISQUE SI JURY :
Questions possibles : ...
Réponses simples : ...

Objectif :
Je dois pouvoir comprendre en moins de 5 minutes et expliquer à l’oral.
## Questions possibles du jury

**Q : Pourquoi utiliser Socket.IO plutôt que du HTTP classique ?**
> Parce que le chat nécessite de recevoir des messages **sans que l'utilisateur ait à recharger la page**. Socket.IO maintient une connexion permanente : dès qu'un message arrive sur le serveur, il est immédiatement envoyé à tous les clients.

**Q : Où sont stockées les données des utilisateurs ?**
> Il n'y a pas de base de données. Le pseudo est stocké dans le `localStorage` du navigateur. Si l'utilisateur ferme et rouvre son navigateur, le pseudo est toujours là.

**Q : Comment le serveur envoie-t-il le message à tout le monde ?**
> Via `io.emit("chat message", data)`. La méthode `io.emit` envoie l'événement à **tous** les clients connectés, contrairement à `socket.emit` qui n'enverrait qu'à un seul client.

**Q : Qu'est-ce qu'un singleton et pourquoi l'utiliser ici ?**
> Un singleton, c'est un objet dont on ne crée qu'une seule instance. Pour le socket, c'est important : si on créait une nouvelle connexion à chaque fois qu'on importe le fichier, on se retrouverait avec plusieurs connexions ouvertes en même temps, ce qui causerait des bugs.

**Q : Comment fonctionne la protection des routes ?**
> Le router vérifie avant chaque navigation si l'utilisateur a un pseudo (`hasPseudo()`). Si non et qu'il essaie d'aller sur `/chat`, il est redirigé vers `/login`. C'est ce qu'on appelle un **navigation guard**.

**Q : Quelle est la différence entre `socket.emit` et `io.emit` ?**
> `socket.emit` : envoie à **un seul client** (celui qui a envoyé le message)
> `io.emit` : envoie à **tous les clients** connectés

**Q : Pourquoi Vue 3 et pas du JavaScript pur ?**
> Vue 3 gère automatiquement la mise à jour de l'interface quand les données changent (réactivité). Sans Vue, il faudrait manuellement modifier le DOM à chaque nouveau message reçu.

**Q : Que se passe-t-il si le WebSocket n'est pas disponible ?**
> Socket.IO a un fallback automatique vers le **HTTP long-polling** : le client envoie des requêtes HTTP en boucle pour simuler une connexion permanente. Moins efficace, mais ça fonctionne.

**Q : Comment lancer le projet ?**
> Deux terminaux : dans le premier `npm run server` (lance le backend sur le port 3001), dans le second `npm run client` (lance le frontend sur le port 5173). Avant ça, `npm run install:all` pour installer les dépendances.

**Q : Pourquoi deux `package.json` différents ?**
> Le serveur et le client sont deux projets Node.js distincts avec leurs propres dépendances. Le `package.json` à la racine contient juste des scripts pratiques pour lancer les deux en même temps.
