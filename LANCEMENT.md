# Lancer SIO Chat

## Prérequis
Ouvrir un terminal **bash** (Git Bash ou terminal VSCode en mode bash, pas PowerShell).

---

## 1. Installer les dépendances (première fois uniquement)

```bash
cd /c/Users/Admin/Documents/sio-chat-main/sio-chat-main/siochate6
npm run install:all
```

---

## 2. Lancer le serveur Socket.IO

Dans un **premier terminal** :

```bash
cd /c/Users/Admin/Documents/sio-chat-main/sio-chat-main/siochate6
npm run server
```

> Le serveur démarre sur **http://localhost:3001**

---

## 3. Lancer le client Vue

Dans un **deuxième terminal** :

```bash
cd /c/Users/Admin/Documents/sio-chat-main/sio-chat-main/siochate6
npm run client
```

> L'app est accessible sur **http://localhost:5173**

---

## Résumé

| Terminal | Commande | URL |
|----------|----------|-----|
| Terminal 1 | `npm run server` | http://localhost:3001 |
| Terminal 2 | `npm run client` | http://localhost:5173 |

> Les deux doivent tourner en même temps pour que le chat fonctionne.
PROMPT
Tu es un expert en développement et pédagogue.

Je vais te donner un projet (structure de fichiers + code).

Ta mission :
1. Génère un fichier README.md clair et structuré
2. Explique le rôle de CHAQUE fichier en 2-3 lignes max
3. Explique les fonctions principales simplement
4. Explique les flux (qui appelle quoi)
5. Donne un résumé global du projet

Contraintes :
- Langage simple (niveau BTS)
- Pas de phrases longues
- Va à l’essentiel
- Utilise des bullet points
- Explique comme si je devais présenter à l’oral

Bonus :
- Ajoute une section “Questions possibles du jury” avec réponses courtes