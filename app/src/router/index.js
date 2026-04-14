// ============================================================
// ROUTER/INDEX.JS — Configuration de la navigation
// Ce fichier définit les routes de l'application :
// quelle URL → quel composant Vue s'affiche.
// Il protège aussi les pages qui nécessitent un pseudo.
// ============================================================


// createRouter      → fonction pour créer le router Vue
// createWebHistory  → utilise l'historique du navigateur (URLs propres sans #)
import { createRouter, createWebHistory } from 'vue-router'

// hasPseudo → vérifie si un pseudo est stocké dans le localStorage
// Utilisée pour protéger la route /chat
import { hasPseudo } from '../session.js'


// ============================================================
// CRÉATION DU ROUTER
// ============================================================

const router = createRouter({

  // createWebHistory → URLs sans le # (ex: /chat au lieu de /#/chat)
  // import.meta.env.BASE_URL → chemin de base défini dans vite.config.js
  history: createWebHistory(import.meta.env.BASE_URL),

  // routes → liste de toutes les pages de l'application
  routes: [

    // --------------------------------------------------------
    // ROUTE "/" — Page d'accueil
    // Redirige automatiquement selon si l'utilisateur a un pseudo ou non
    // --------------------------------------------------------
    {
      path: '/',
      // Si pseudo existe → on va sur /chat, sinon → on va sur /login
      redirect: () => (hasPseudo() ? '/chat' : '/login'),
    },

    // --------------------------------------------------------
    // ROUTE "/login" — Page de connexion (choix du pseudo)
    // --------------------------------------------------------
    {
      path: '/login',
      name: 'login', // Nom utilisé pour naviguer : router.replace({ name: 'login' })

      // Chargement différé (lazy loading) : le fichier n'est chargé que si on va sur /login
      // Optimise les performances : on ne charge pas ce qu'on n'utilise pas
      component: () => import('../views/LoginView.vue'),

      // beforeEnter → garde de navigation : code exécuté AVANT d'afficher la page
      // Si l'utilisateur a déjà un pseudo, inutile d'aller sur /login → on le redirige vers /chat
      beforeEnter(_to, _from, next) {
        if (hasPseudo()) next({ name: 'chat' }) // Redirige vers /chat
        else next()                              // Sinon, on laisse passer vers /login
      },
    },

    // --------------------------------------------------------
    // ROUTE "/chat" — Page de chat (protégée)
    // --------------------------------------------------------
    {
      path: '/chat',
      name: 'chat',

      // Chargement différé : ChatView n'est chargé que si on va sur /chat
      component: () => import('../views/ChatView.vue'),

      // beforeEnter → page protégée : si pas de pseudo, on renvoie vers /login
      // query: { redirect: '/chat' } → mémorise qu'on voulait aller sur /chat
      // Après login, on pourra rediriger automatiquement vers /chat
      beforeEnter(_to, _from, next) {
        if (!hasPseudo()) next({ name: 'login', query: { redirect: '/chat' } })
        else next() // Si pseudo OK, on laisse accéder au chat
      },
    },

    // --------------------------------------------------------
    // ROUTE "catch-all" — Toutes les URLs inconnues
    // Si l'utilisateur tape une URL qui n'existe pas, on le ramène à "/"
    // "/" redirigera ensuite vers /login ou /chat selon le pseudo
    // --------------------------------------------------------
    {
      path: '/:pathMatch(.*)*', // Correspond à n'importe quelle URL non définie
      redirect: '/',
    },

  ],
})


// On exporte le router pour qu'il soit branché dans main.js via .use(router)
export default router
