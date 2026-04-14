<script setup>
// ============================================================
// IMPORTS
// On importe les outils dont on a besoin depuis Vue et les
// fichiers du projet.
// ============================================================

// ref        → crée une variable réactive (si elle change, Vue met à jour l'écran)
// computed   → crée une valeur calculée automatiquement à partir d'autres variables
// onMounted  → code exécuté quand le composant s'affiche à l'écran
// onUnmounted→ code exécuté quand le composant est retiré de l'écran
import { ref, computed, onMounted, onUnmounted } from 'vue'

// useRouter → permet de naviguer entre les pages (ex: aller vers /login)
import { useRouter } from 'vue-router'

// socket → l'instance unique de connexion Socket.IO (définie dans socketconnect.js)
import { socket } from '../socket/socketconnect.js'

// getPseudo   → lit le pseudo depuis le localStorage
// clearPseudo → efface le pseudo du localStorage
import { getPseudo, clearPseudo } from '../session.js'


// ============================================================
// ROUTER
// ============================================================

// On récupère le router pour pouvoir rediriger l'utilisateur
const router = useRouter()


// ============================================================
// VARIABLES RÉACTIVES (état de l'application)
// Quand une de ces variables change, Vue met à jour l'écran
// automatiquement.
// ============================================================

// pseudo : lit le pseudo depuis localStorage à chaque fois qu'on en a besoin
// computed → recalculé si getPseudo() change
const pseudo = computed(() => getPseudo())

// draft : contient le texte que l'utilisateur est en train de taper
// ref('') → chaîne vide au départ
const draft = ref('')

// ============================================================
// [MODIFICATION ÉPREUVE] - Limite de caractères + compteur
// Ajout d'une limite à 200 caractères avec affichage en temps réel
// ============================================================

// MAX : constante qui définit la limite de caractères autorisés
// On utilise une constante pour pouvoir la changer facilement en un seul endroit
const MAX = 200

// remaining : calcule automatiquement combien de caractères il reste
// computed → se recalcule à chaque frappe de l'utilisateur dans l'input
// Exemple : si draft = "Bonjour" (7 car.) → remaining = 200 - 7 = 193
const remaining = computed(() => MAX - draft.value.length)

// ============================================================
// [FIN MODIFICATION ÉPREUVE]
// ============================================================

// messages : tableau qui stocke tous les messages reçus
// Chaque message est un objet : { id, message, ts }
const messages = ref([])

// connected : true si la connexion WebSocket est active, false sinon
const connected = ref(false)

// socketId : identifiant unique du client attribué par le serveur
// Permet de savoir quels messages viennent de "moi"
const socketId = ref('')

// error : message d'erreur à afficher en cas de problème de connexion
const error = ref('')


// ============================================================
// MESSAGES TRIÉS
// On trie les messages par timestamp (ts) pour les afficher
// dans l'ordre chronologique, même si certains arrivent en retard.
// ============================================================

// sortedMessages : version triée du tableau messages
// [...messages.value] → copie du tableau pour ne pas modifier l'original
// .sort((a, b) => a.ts - b.ts) → tri du plus ancien au plus récent
const sortedMessages = computed(() =>
  [...messages.value].sort((a, b) => a.ts - b.ts),
)


// ============================================================
// FONCTIONS DE CONNEXION / DÉCONNEXION
// ============================================================

// connect() : ouvre la connexion WebSocket vers le serveur
function connect() {
  error.value = ''            // On efface les erreurs précédentes
  if (socket.connected) return // Si déjà connecté, on ne fait rien
  socket.connect()            // On lance la connexion
}

// disconnect() : ferme la connexion WebSocket
function disconnect() {
  socket.disconnect()
}

// leaveChat() : quitter le chat complètement
// → déconnecte, efface le pseudo, redirige vers la page de login
function leaveChat() {
  disconnect()                              // Ferme la connexion WebSocket
  clearPseudo()                             // Efface le pseudo du localStorage
  router.replace({ name: 'login' })         // Redirige vers /login
}


// ============================================================
// ENVOI DE MESSAGE
// ============================================================

// sendMessage() : envoie le message tapé par l'utilisateur au serveur
function sendMessage() {
  const text = draft.value.trim()           // On enlève les espaces inutiles
  if (!text || !socket.connected) return    // On annule si vide ou pas connecté

  const nick = pseudo.value                 // On récupère le pseudo
  // On formate le message : "pseudo : texte"
  // Si pas de pseudo, on envoie juste le texte
  const payload = nick ? `${nick} : ${text}` : text

  socket.emit('chat message', payload)      // On envoie l'événement au serveur
  draft.value = ''                          // On vide le champ de saisie
}


// ============================================================
// RÉCEPTION DES ÉVÉNEMENTS SOCKET.IO
// Ces fonctions sont appelées automatiquement par Socket.IO
// quand un événement arrive depuis le serveur.
// ============================================================

// onChatMessage() : appelée quand le serveur diffuse un message
// payload = { id: string, message: string, ts: number }
function onChatMessage(payload) {
  // Sécurité : on vérifie que le payload est bien un objet
  if (!payload || typeof payload !== 'object') return

  // On ajoute le message reçu dans le tableau
  messages.value.push({
    id: payload.id,                           // ID de l'expéditeur (socket.id)
    message: String(payload.message ?? ''),   // Le texte du message
    ts: Number(payload.ts) || Date.now(),     // Timestamp (heure d'envoi)
  })
}

// onConnect() : appelée quand la connexion est établie avec succès
function onConnect() {
  connected.value = true                  // On passe l'état à "connecté"
  socketId.value = socket.id || ''        // On sauvegarde notre ID unique
}

// onDisconnect() : appelée quand la connexion est perdue ou fermée
function onDisconnect() {
  connected.value = false                 // On passe l'état à "déconnecté"
  socketId.value = ''                     // On efface l'ID
}

// onConnectError() : appelée si la connexion échoue (ex: serveur éteint)
function onConnectError(err) {
  // On affiche le message d'erreur, ou un message par défaut
  error.value = err?.message || 'Connexion impossible (vérifiez le serveur).'
}


// ============================================================
// CYCLE DE VIE DU COMPOSANT
// ============================================================

// onMounted : exécuté quand le composant apparaît à l'écran
// → On branche tous les écouteurs d'événements Socket.IO
onMounted(() => {
  socket.on('connect', onConnect)           // Écoute la connexion réussie
  socket.on('disconnect', onDisconnect)     // Écoute la déconnexion
  socket.on('connect_error', onConnectError) // Écoute les erreurs de connexion
  socket.on('chat message', onChatMessage)  // Écoute les messages entrants

  // Si la socket est déjà connectée (ex: retour sur la page),
  // on appelle manuellement onConnect() pour mettre à jour l'état
  if (socket.connected) onConnect()
})

// onUnmounted : exécuté quand le composant est retiré de l'écran
// → IMPORTANT : on débranche tous les écouteurs pour éviter les fuites mémoire
// Sans ça, les fonctions s'accumulent et sont appelées plusieurs fois
onUnmounted(() => {
  socket.off('connect', onConnect)           // On supprime l'écouteur
  socket.off('disconnect', onDisconnect)     // On supprime l'écouteur
  socket.off('connect_error', onConnectError) // On supprime l'écouteur
  socket.off('chat message', onChatMessage)  // On supprime l'écouteur
  socket.disconnect()                        // On ferme la connexion proprement
})
</script>


<template>
  <!-- Conteneur principal de toute la page de chat -->
  <div class="siochat">

    <!-- ======================================================
         EN-TÊTE : titre, pseudo connecté, bouton changer pseudo
         ====================================================== -->
    <header class="siochat__header">
      <div class="siochat__headline">
        <!-- Titre de l'application -->
        <h1 class="siochat__title">SIO chat</h1>
           <p class="siochat__made">made by MD</p>

        <!-- Affiche le pseudo de l'utilisateur connecté -->
        <!-- {{ pseudo }} → valeur lue depuis le localStorage -->
        <p class="siochat__subtitle">
          Connecté en tant que <strong class="mono">{{ pseudo }}</strong>
          — Vue 3 + Socket.IO
        </p>
      </div>

      <!-- Bouton pour changer de pseudo : appelle leaveChat() -->
      <!-- leaveChat() déconnecte, efface le pseudo et redirige vers /login -->
      <button type="button" class="btn btn--ghost btn--small" @click="leaveChat">
        Changer de pseudo
      </button>
    </header>


    <!-- ======================================================
         PANNEAU DE CONNEXION : boutons connecter/déconnecter,
         affichage de l'ID socket et des erreurs
         ====================================================== -->
    <section class="panel">
      <div class="panel__actions">

        <!-- v-if="!connected" → affiche ce bouton UNIQUEMENT si pas connecté -->
        <button
          v-if="!connected"
          type="button"
          class="btn btn--primary"
          @click="connect"
        >
          Se connecter au serveur
        </button>

        <!-- v-else → affiche ce bouton UNIQUEMENT si connecté -->
        <button
          v-else
          type="button"
          class="btn btn--ghost"
          @click="disconnect"
        >
          Se déconnecter
        </button>

      </div>

      <!-- Affichage conditionnel : erreur OU status OU conseil -->
      <!-- v-if / v-else-if / v-else → un seul s'affiche à la fois -->

      <!-- Si une erreur existe, on l'affiche en rouge -->
      <p v-if="error" class="panel__error" role="alert">{{ error }}</p>

      <!-- Si connecté, on affiche le socket.id (identifiant unique du client) -->
      <p v-else-if="connected" class="panel__status">
        <span class="mono">socket.id</span> =
        <code class="mono">{{ socketId }}</code>
      </p>

      <!-- Si ni erreur ni connecté : on affiche les instructions de démarrage -->
      <p v-else class="panel__hint">
        Démarrez le serveur (<code class="mono">npm run server</code> à la racine du
        projet), puis connectez-vous.
      </p>
    </section>


    <!-- ======================================================
         ZONE DE CHAT : liste des messages + formulaire d'envoi
         ====================================================== -->
    <section class="chat">

      <!-- Liste des messages -->
      <!-- aria-live="polite" → accessibilité : annonce les nouveaux messages -->
      <ul class="chat__messages" aria-live="polite">

        <!-- v-for → on boucle sur chaque message trié par date -->
        <!-- :key → identifiant unique pour chaque élément de la liste (obligatoire en Vue) -->
        <li
          v-for="(m, i) in sortedMessages"
          :key="`${m.ts}-${m.id}-${i}`"
          class="bubble"
          :class="{ 'bubble--me': m.id === socketId }"
        >
          <!-- bubble--me → classe CSS ajoutée si le message vient de MOI -->
          <!-- On compare m.id (expéditeur) avec socketId (mon ID) -->

          <!-- Affiche les 8 premiers caractères de l'ID de l'expéditeur -->
          <span class="bubble__meta mono">{{ m.id.slice(0, 8) }}…</span>

          <!-- Texte du message -->
          <span class="bubble__text">{{ m.message }}</span>

          <!-- Heure d'envoi formatée en heure locale (ex: 14:32:05) -->
          <!-- :datetime → format ISO pour l'accessibilité -->
          <time class="bubble__time mono" :datetime="new Date(m.ts).toISOString()">
            {{ new Date(m.ts).toLocaleTimeString() }}
          </time>
        </li>

      </ul>


      <!-- ====================================================
           [MODIFICATION ÉPREUVE] - Formulaire d'envoi avec
           limite 200 caractères et compteur en temps réel
           ==================================================== -->

      <!-- @submit.prevent → empêche le rechargement de la page à l'envoi du formulaire -->
      <!-- sendMessage() → appelée quand on clique "Envoyer" ou appuie sur Entrée -->
      <form class="composer" @submit.prevent="sendMessage">

        <!-- composer__field : enveloppe l'input ET le compteur dans une colonne -->
        <!-- [MODIFIÉ] : avant, l'input était directement dans le form sans ce wrapper -->
        <div class="composer__field">

          <!-- Champ de saisie du message -->
          <!-- v-model="draft"     → lie le champ à la variable draft (synchronisé en temps réel) -->
          <!-- :disabled="!connected" → bloque le champ si pas connecté -->
          <!-- :maxlength="MAX"    → [MODIFIÉ] limite à 200 car. (était 2000 avant) -->
          <input
            v-model="draft"
            class="input input--grow"
            type="text"
            placeholder="Votre message…"
            :disabled="!connected"
            :maxlength="MAX"
            autocomplete="off"
          />

          <!-- Compteur de caractères restants -->
          <!-- [AJOUTÉ] : affiche "193 / 200" en temps réel -->
          <!-- remaining est un computed : il se recalcule automatiquement à chaque frappe -->
          <!-- :class → ajoute la classe "danger" (rouge) quand il reste 20 car. ou moins -->
          <span
            class="composer__counter"
            :class="{ 'composer__counter--danger': remaining <= 20 }"
          >
            {{ remaining }} / {{ MAX }}
          </span>

        </div>

        <!-- Bouton Envoyer -->
        <!-- :disabled → bloqué si : pas connecté OU message vide OU dépassement de limite -->
        <!-- [MODIFIÉ] : ajout de "|| remaining < 0" pour sécuriser si dépassement -->
        <button
          type="submit"
          class="btn btn--primary"
          :disabled="!connected || !draft.trim() || remaining < 0"
        >
          Envoyer
        </button>

      </form>

      <!-- [FIN MODIFICATION ÉPREUVE] -->

    </section>
  </div>
</template>


<style scoped>
/*
  "scoped" = ces styles ne s'appliquent QU'à ce composant.
  Ils n'affectent pas les autres composants Vue.
*/

/* ============================================================
   [MODIFICATION ÉPREUVE] - Styles du compteur de caractères
   ============================================================ */

/* Wrapper colonne qui contient l'input + le compteur */
/* flex-direction: column → input au-dessus, compteur en dessous */
.composer__field {
  display: flex;
  flex-direction: column;
  flex: 1;       /* Prend tout l'espace disponible dans le formulaire */
  gap: 0.2rem;   /* Petit espace entre l'input et le compteur */
}

/* Compteur de caractères restants (état normal) */
.composer__counter {
  font-size: 0.78rem;    /* Texte petit */
  color: #7c3aed;        /* Violet discret */
  text-align: right;     /* Aligné à droite sous l'input */
}

/* Compteur en état "danger" : s'active quand il reste ≤ 20 caractères */
/* Appliqué via :class="{ 'composer__counter--danger': remaining <= 20 }" */
.composer__counter--danger {
  color: #f87171;        /* Rouge d'alerte */
  font-weight: bold;     /* Texte en gras pour attirer l'attention */
}

/* [FIN MODIFICATION ÉPREUVE] */


/* ============================================================
   STYLES GÉNÉRAUX
   ============================================================ */

/* Police monospace pour les codes techniques (socket.id, timestamps) */
.mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.85em;
}

/* Conteneur principal de la page : centré, fond violet foncé */
.siochat {
  max-width: 720px;           /* Largeur maximale */
  margin: 0 auto;             /* Centré horizontalement */
  padding: 1.25rem 1rem 2rem;
  min-height: 100svh;         /* Hauteur minimale = plein écran */
  box-sizing: border-box;
  text-align: left;
  background: #12002a;        /* Fond violet très foncé */
  color: #e9d5ff;             /* Texte violet clair */
}

/* En-tête : titre à gauche, bouton à droite */
.siochat__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.siochat__headline {
  flex: 1;
  min-width: 200px;
}

/* Titre "SIO chat" en grand violet */
.siochat__title {
  margin: 0 0 0.1rem;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #c084fc;
}

/* Sous-titre "made by MD" en petit */
.siochat__made {
  margin: 0 0 0.3rem;
  font-size: 0.75rem;
  color: #7c3aed;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Ligne "Connecté en tant que pseudo" */
.siochat__subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: #a78bfa;
  line-height: 1.45;
}

/* Panneau de connexion : fond légèrement plus clair, bordure violette */
.panel {
  padding: 1rem 1.1rem;
  border: 1px solid #4c1d95;
  border-radius: 12px;
  background: #1e0040;
  box-shadow: 0 4px 18px rgba(109, 40, 217, 0.25);
  margin-bottom: 1.25rem;
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Message d'erreur en rouge */
.panel__error {
  margin: 0.75rem 0 0;
  color: #f87171;
  font-size: 0.9rem;
}

/* Statut de connexion (socket.id) */
.panel__status {
  margin: 0.75rem 0 0;
  font-size: 0.9rem;
  color: #a78bfa;
}

/* Conseil quand pas connecté */
.panel__hint {
  margin: 0.75rem 0 0;
  font-size: 0.88rem;
  color: #7c3aed;
}

/* Style commun à tous les boutons */
.btn {
  cursor: pointer;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font: inherit;
  font-weight: 500;
  border: 2px solid transparent;
  transition: border-color 0.2s, background 0.2s;  /* Animation au survol */
}

/* Bouton désactivé : semi-transparent et curseur interdit */
.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Petit bouton (ex: "Changer de pseudo") */
.btn--small {
  padding: 0.4rem 0.75rem;
  font-size: 0.88rem;
}

/* Bouton principal : fond violet semi-transparent */
.btn--primary {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
  border-color: #7c3aed;
}

.btn--primary:not(:disabled):hover {
  background: rgba(192, 132, 252, 0.28);
  border-color: #c084fc;
}

/* Bouton secondaire : fond transparent, bordure fine */
.btn--ghost {
  background: transparent;
  color: #a78bfa;
  border-color: #4c1d95;
}

.btn--ghost:hover {
  border-color: #c084fc;
  color: #c084fc;
}

/* Champ de saisie texte */
.input {
  border: 1px solid #4c1d95;
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  font: inherit;
  color: #e9d5ff;
  background: #12002a;
  width: 100%;
  box-sizing: border-box;
}

/* Texte grisé quand le champ est vide */
.input::placeholder {
  color: #6d28d9;
}

/* Contour violet quand le champ est sélectionné */
.input:focus-visible {
  outline: 2px solid #c084fc;
  outline-offset: 2px;
}

/* Input qui occupe tout l'espace dispo dans le formulaire */
.input--grow {
  flex: 1;
  min-width: 0;
}

/* Zone de chat : colonne flex avec hauteur minimale */
.chat {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 320px;
}

/* Liste des bulles de messages : scrollable si trop de messages */
.chat__messages {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  border: 1px solid #4c1d95;
  border-radius: 12px;
  background: #0d001f;     /* Fond encore plus sombre */
  flex: 1;
  max-height: 50svh;       /* 50% de la hauteur de l'écran max */
  overflow-y: auto;        /* Scroll vertical si nécessaire */
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

/* Bulle de message (état par défaut = message des autres, aligné à gauche) */
.bubble {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: #1e0040;
  border: 1px solid #4c1d95;
  max-width: 95%;
}

/* Bulle "moi" : alignée à droite, bordure et fond violet différents */
/* S'active via :class="{ 'bubble--me': m.id === socketId }" */
.bubble--me {
  align-self: flex-end;
  align-items: flex-end;
  border-color: #c084fc;
  background: rgba(192, 132, 252, 0.12);
}

/* ID de l'expéditeur (petit, violet discret) */
.bubble__meta {
  font-size: 0.72rem;
  color: #7c3aed;
}

/* Texte du message */
.bubble__text {
  color: #e9d5ff;
  word-break: break-word;   /* Coupe les mots trop longs */
  white-space: pre-wrap;    /* Respecte les retours à la ligne */
}

/* Heure d'envoi (tout petit, violet très discret) */
.bubble__time {
  font-size: 0.7rem;
  color: #6d28d9;
}

/* Formulaire d'envoi : input + bouton côte à côte */
.composer {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;     /* Les deux éléments ont la même hauteur */
}
</style>
