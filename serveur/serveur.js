// ============================================================
// SERVEUR.JS — Serveur Node.js principal
// C'est le "cerveau" côté serveur.
// Il reçoit les messages des clients et les renvoie à tout le monde.
// ============================================================


// ============================================================
// IMPORTS — On importe les librairies nécessaires
// ============================================================

// express → framework qui permet de créer un serveur HTTP facilement
const express = require("express");

// http → module natif Node.js pour créer un serveur HTTP de base
// Socket.IO a besoin de ce serveur HTTP pour fonctionner par-dessus
const http = require("http");

// cors → Cross-Origin Resource Sharing
// Permet au frontend (localhost:5173) d'appeler le backend (localhost:3001)
// Sans cors, le navigateur bloquerait les requêtes entre deux ports différents
const cors = require("cors");

// Server → la classe Socket.IO côté serveur
// Elle gère toutes les connexions WebSocket des clients
const { Server } = require("socket.io");


// ============================================================
// CONFIGURATION DU PORT
// ============================================================

// On lit le port depuis les variables d'environnement (process.env.PORT)
// Si aucune variable n'est définie, on utilise 3001 par défaut
// Number() → on s'assure que c'est bien un nombre
const PORT = Number(process.env.PORT || 3001);


// ============================================================
// CRÉATION DU SERVEUR EXPRESS
// ============================================================

// app → l'application Express (gère les routes HTTP classiques)
const app = express();

// On active CORS pour toutes les origines
// origin: true → accepte n'importe quelle origine (pas sécurisé en prod, ok en dev)
// credentials: true → autorise l'envoi de cookies/headers d'authentification
app.use(cors({ origin: true, credentials: true }));

// On crée le serveur HTTP en lui passant l'app Express
// Ce serveur HTTP va "porter" Socket.IO par-dessus
const server = http.createServer(app);


// ============================================================
// CRÉATION DU SERVEUR SOCKET.IO
// ============================================================

// On crée l'instance Socket.IO en lui donnant le serveur HTTP
// io → objet principal de Socket.IO, permet d'émettre vers TOUS les clients
const io = new Server(server, {
  cors: {
    origin: true,       // Accepte toutes les origines (frontend sur port 5173)
    credentials: true,
  },
});


// ============================================================
// ROUTES HTTP CLASSIQUES (Express)
// Ces routes répondent aux requêtes HTTP normales (pas WebSocket)
// ============================================================

// Route GET "/" → retourne un JSON pour vérifier que le serveur tourne
// Utile pour tester rapidement dans un navigateur : http://localhost:3001/
app.get("/", (_req, res) => {
  res.json({ name: "siochat6", status: "running" });
});

// Route GET "/health" → route de santé (health check)
// Utilisée par des outils de monitoring pour vérifier que le serveur répond
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});


// ============================================================
// GESTION DES CONNEXIONS SOCKET.IO
// io.on("connection") → déclenché à chaque fois qu'un nouveau client se connecte
// socket → objet qui représente UN client spécifique
// ============================================================

io.on("connection", (socket) => {
  // socket.id → identifiant unique généré automatiquement par Socket.IO
  // Chaque client a son propre socket.id (ex: "abc123xyz")
  console.log("Un utilisateur s'est connecté :", socket.id);


  // --------------------------------------------------------
  // ÉVÉNEMENT : déconnexion d'un client
  // Déclenché quand le client ferme l'onglet, coupe le réseau, etc.
  // --------------------------------------------------------
  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté :", socket.id);
  });


  // --------------------------------------------------------
  // ÉVÉNEMENT : réception d'un message de chat
  // Déclenché quand un client émet l'événement "chat message"
  // msg → le texte envoyé par le client (ex: "Alex : Bonjour !")
  // --------------------------------------------------------
  socket.on("chat message", (msg) => {

    // On construit le payload (objet) à diffuser à tous les clients
    const payload = {
      id: socket.id,           // ID de l'expéditeur → permet au frontend de savoir si c'est "moi"
      message: String(msg ?? ""), // Le texte du message (String() évite les erreurs si msg est null)
      ts: Date.now(),           // Timestamp en millisecondes → pour afficher l'heure et trier les messages
    };

    console.log("Message reçu :", payload);

    // io.emit() → envoie l'événement à TOUS les clients connectés (y compris l'expéditeur)
    // Différence avec socket.emit() qui n'enverrait qu'à UN seul client
    io.emit("chat message", payload);
  });

});


// ============================================================
// DÉMARRAGE DU SERVEUR
// server.listen() → le serveur commence à écouter sur le port défini
// ============================================================

server.listen(PORT, () => {
  // Ce message s'affiche dans le terminal quand le serveur est prêt
  console.log(`Serveur Socket.IO démarré sur http://localhost:${PORT}`);
});
