<script setup>
// ============================================================
// APP.VUE — Composant racine de l'application
// C'est le composant "parent" de toute l'appli.
// Il ne fait qu'une chose : afficher la vue active selon l'URL.
// ============================================================

// RouterView → composant fourni par Vue Router
// Il affiche automatiquement le bon composant selon l'URL :
//   → si URL = /login  : affiche LoginView.vue
//   → si URL = /chat   : affiche ChatView.vue
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- RouterView est un "emplacement" dynamique -->
  <!-- Vue Router le remplace par la vue correspondant à l'URL actuelle -->
  <!-- Ex: /login → <LoginView />, /chat → <ChatView /> -->
  <RouterView />
</template>
