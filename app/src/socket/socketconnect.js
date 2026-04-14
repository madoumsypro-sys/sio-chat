// ============================================================
// SOCKETCONNECT.JS — Instance unique de Socket.IO (Singleton)
// Ce fichier crée UNE SEULE connexion Socket.IO partagée
// dans toute l'application.
//
// Pourquoi un singleton ?
// Si on créait une nouvelle connexion à chaque import,
// on se retrouverait avec plusieurs connexions ouvertes
// en même temps → bugs et messages en double.
// ============================================================


// io → fonction de Socket.IO côté client
// Elle crée et gère la connexion WebSocket vers le serveur
import { io } from 'socket.io-client'


// ============================================================
// URL DU SERVEUR
// ============================================================

// On lit l'URL depuis les variables d'environnement Vite (fichier .env)
// Si la variable VITE_SOCKET_URL n'existe pas, on utilise localhost:3001
// Cela permet de changer l'URL facilement sans modifier le code
const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'


// ============================================================
// CRÉATION DE LA SOCKET
// ============================================================

// On exporte socket pour que tous les composants Vue puissent l'utiliser
export const socket = io(url, {

  // transports → ordre de priorité des méthodes de connexion
  // 'websocket' → connexion temps réel (prioritaire, plus rapide)
  // 'polling'   → fallback HTTP si WebSocket non disponible (moins efficace)
  transports: ['websocket', 'polling'],

  // autoConnect: false → la connexion NE s'ouvre PAS automatiquement
  // Elle s'ouvre uniquement quand on appelle socket.connect() manuellement
  // Cela permet à l'utilisateur de choisir quand se connecter
  autoConnect: false,
})
