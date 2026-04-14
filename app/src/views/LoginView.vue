<script setup>
// ============================================================
// LOGINVIEW.VUE — Page de connexion (choix du pseudo)
// L'utilisateur entre son pseudo ici avant d'accéder au chat.
// Le pseudo est validé puis sauvegardé dans le localStorage.
// ============================================================


// ref        → crée une variable réactive (mise à jour automatique de l'écran)
// onMounted  → code exécuté quand la page s'affiche
import { ref, onMounted } from 'vue'

// useRoute  → accès aux paramètres de l'URL actuelle (ex: ?redirect=/chat)
// useRouter → permet de naviguer vers une autre page
import { useRoute, useRouter } from 'vue-router'

// hasPseudo → vérifie si un pseudo existe déjà dans localStorage
// setPseudo → sauvegarde le pseudo dans localStorage
import { hasPseudo, setPseudo } from '../session.js'


// ============================================================
// ROUTER ET ROUTE
// ============================================================

// route  → informations sur l'URL actuelle (paramètres, query...)
const route = useRoute()

// router → permet de changer de page
const router = useRouter()


// ============================================================
// VARIABLES RÉACTIVES
// ============================================================

// pseudo → texte que l'utilisateur est en train de taper dans le champ
// ref('') → chaîne vide au départ
const pseudo = ref('')

// error → message d'erreur affiché sous le champ si validation échoue
// ref('') → pas d'erreur au départ
const error = ref('')


// ============================================================
// CYCLE DE VIE : onMounted
// Exécuté dès que la page s'affiche à l'écran
// ============================================================

onMounted(() => {
  // Si l'utilisateur a déjà un pseudo valide, inutile d'être ici
  // On le redirige directement vers le chat
  if (hasPseudo()) {
    router.replace({ name: 'chat' })
  }
})


// ============================================================
// FONCTION submit() — Validation et soumission du formulaire
// Appelée quand l'utilisateur clique "Entrer dans le chat"
// ou appuie sur Entrée
// ============================================================

function submit() {
  // On efface l'erreur précédente avant de revalider
  error.value = ''

  // On nettoie le pseudo (supprime les espaces au début et à la fin)
  const p = pseudo.value.trim()

  // Validation 1 : pseudo vide
  if (!p) {
    error.value = 'Entrez un pseudo pour continuer.'
    return // On arrête ici, on n'enregistre pas
  }

  // Validation 2 : pseudo trop long (max 32 caractères)
  if (p.length > 32) {
    error.value = '32 caractères maximum.'
    return
  }

  // On sauvegarde le pseudo dans le localStorage via session.js
  // setPseudo() retourne false si le pseudo est invalide (double sécurité)
  if (!setPseudo(p)) {
    error.value = 'Pseudo invalide.'
    return
  }

  // --------------------------------------------------------
  // REDIRECTION APRÈS CONNEXION
  // Si l'URL contenait ?redirect=/chat, on y va
  // Sinon, on va sur /chat par défaut
  // Sécurité : on vérifie que redirect commence par "/" mais pas "//"
  // (évite les redirections vers des sites externes)
  // --------------------------------------------------------
  const redirect = route.query.redirect
  const path =
    typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect   // Redirection vers l'URL mémorisée (ex: /chat)
      : '/chat'    // Redirection par défaut

  router.replace(path)
}
</script>


<template>
  <!-- Conteneur plein écran centré verticalement et horizontalement -->
  <div class="login">

    <!-- Carte blanche au centre de l'écran -->
    <div class="login__card">

      <!-- Titre de l'application -->
      <h1 class="login__title">SIOCHAT</h1>

      <!-- Description courte -->
      <p class="login__lead">Choisissez un pseudo pour accéder au salon.</p>

      <!-- Formulaire de saisie du pseudo -->
      <!-- @submit.prevent → empêche le rechargement de la page à la soumission -->
      <!-- submit() → notre fonction de validation est appelée -->
      <form class="login__form" @submit.prevent="submit">

        <!-- Label du champ, associé à l'input via for="pseudo" / id="pseudo" -->
        <label class="label" for="pseudo">Pseudo</label>

        <!-- Champ de saisie -->
        <!-- v-model="pseudo"     → lie le champ à la variable pseudo (synchronisé en temps réel) -->
        <!-- maxlength="32"       → limite côté navigateur (double sécurité avec la validation JS) -->
        <!-- autocomplete="username" → aide le navigateur à proposer des pseudos déjà utilisés -->
        <!-- autofocus            → place automatiquement le curseur dans ce champ à l'ouverture -->
        <input
          id="pseudo"
          v-model="pseudo"
          class="input"
          type="text"
          maxlength="32"
          placeholder="Ex. Alex"
          autocomplete="username"
          autofocus
        />

        <!-- Message d'erreur : affiché uniquement si error n'est pas vide -->
        <!-- v-if="error" → si error = '' (faux), ce paragraphe n'existe pas dans le DOM -->
        <!-- role="alert" → accessibilité : annonce l'erreur aux lecteurs d'écran -->
        <p v-if="error" class="login__error" role="alert">{{ error }}</p>

        <!-- Bouton de soumission du formulaire -->
        <!-- type="submit" → déclenche @submit.prevent sur le formulaire parent -->
        <button type="submit" class="btn btn--primary">Entrer dans le chat</button>

      </form>
    </div>
  </div>
</template>


<style scoped>
/*
  "scoped" = ces styles ne s'appliquent QU'à ce composant.
  Les autres composants ne sont pas affectés.
*/

/* Conteneur plein écran, centrage vertical et horizontal avec flexbox */
.login {
  min-height: 100svh;          /* 100% de la hauteur de l'écran */
  display: flex;
  align-items: center;         /* Centre verticalement */
  justify-content: center;     /* Centre horizontalement */
  padding: 1.25rem;
  box-sizing: border-box;
}

/* Carte blanche au centre → contient le formulaire */
/* var(--border) → variable CSS définie dans style.css (s'adapte au mode sombre) */
.login__card {
  width: 100%;
  max-width: 400px;            /* Largeur max de la carte */
  padding: 1.5rem 1.35rem;
  border: 1px solid var(--border, #e5e4e7);  /* Bordure grise */
  border-radius: 16px;
  background: var(--bg, #fff);               /* Fond blanc (ou sombre en dark mode) */
  box-shadow: var(--shadow, 0 8px 24px rgba(0, 0, 0, 0.08)); /* Ombre douce */
  text-align: left;
}

/* Titre "SIOCHAT" */
.login__title {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-h, #08060d); /* Couleur du texte (variable CSS) */
}

/* Texte descriptif sous le titre */
.login__lead {
  margin: 0 0 1.25rem;
  font-size: 0.95rem;
  color: var(--text, #6b6375);   /* Couleur grise */
  line-height: 1.45;
}

/* Formulaire en colonne : label → input → erreur → bouton */
.login__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;                   /* Espace entre chaque élément */
}

/* Message d'erreur en rouge */
.login__error {
  margin: 0;
  font-size: 0.88rem;
  color: #b91c1c;                /* Rouge d'alerte */
}

/* Label du champ */
.label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-h, #08060d);
}

/* Champ de saisie texte */
.input {
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font: inherit;
  color: var(--text-h, #08060d);
  background: var(--bg, #fff);
  width: 100%;
  box-sizing: border-box;
}

/* Contour violet quand le champ est sélectionné */
.input:focus-visible {
  outline: 2px solid var(--accent, #aa3bff);
  outline-offset: 2px;
}

/* Style commun à tous les boutons */
.btn {
  cursor: pointer;
  border-radius: 8px;
  padding: 0.65rem 1rem;
  font: inherit;
  font-weight: 500;
  border: 2px solid transparent;
  margin-top: 0.35rem;
  transition: border-color 0.2s; /* Animation douce au survol */
}

/* Bouton principal : fond violet semi-transparent */
.btn--primary {
  background: var(--accent-bg, rgba(170, 59, 255, 0.1));
  color: var(--accent, #aa3bff);
  border-color: var(--accent-border, rgba(170, 59, 255, 0.5));
}

/* Au survol : bordure plus visible */
.btn--primary:hover {
  border-color: var(--accent, #aa3bff);
}

/* Adaptation au mode sombre : titre en blanc */
@media (prefers-color-scheme: dark) {
  .login__title {
    color: var(--text-h, #f3f4f6);
  }
}
</style>
