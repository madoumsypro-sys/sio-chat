// ============================================================
// MAIN.JS — Point d'entrée de l'application Vue
// C'est le premier fichier exécuté quand l'application démarre.
// Il crée l'appli Vue, branche le router et l'affiche dans la page.
// ============================================================


// createApp → fonction Vue qui crée l'application
import { createApp } from 'vue'

// On importe les styles CSS globaux (variables de couleurs, reset, etc.)
import './style.css'

// App.vue → le composant racine, "conteneur" de toute l'appli
import App from './App.vue'

// router → la configuration des routes (qui va sur quelle page)
import router from './router'


// ============================================================
// DÉMARRAGE DE L'APPLICATION
// Ces 3 étapes sont chaînées sur une seule ligne :
// ============================================================

createApp(App)   // 1. Crée l'application Vue avec App.vue comme composant racine
  .use(router)   // 2. Branche le système de navigation (Vue Router)
  .mount('#app') // 3. Injecte l'application dans la balise <div id="app"> de index.html
