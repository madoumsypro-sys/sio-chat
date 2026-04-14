// ============================================================
// SESSION.JS — Gestion du pseudo dans le localStorage
// Ce fichier centralise toutes les opérations sur le pseudo.
// Le pseudo est stocké dans le navigateur (localStorage),
// il persiste même si on ferme et rouvre l'onglet.
// ============================================================


// Clé utilisée pour stocker le pseudo dans le localStorage
// On la définit en constante pour ne pas faire de faute de frappe
// ailleurs dans le code (on importe cette constante si besoin)
export const PSEUDO_KEY = 'siochat_pseudo'


// ============================================================
// getPseudo() — Lire le pseudo depuis le localStorage
// Retourne le pseudo (chaîne de texte) ou une chaîne vide si absent
// ============================================================
export function getPseudo() {
  // localStorage.getItem(clé) → retourne la valeur stockée, ou null si absent
  // || '' → si null, on retourne une chaîne vide plutôt que null
  // .trim() → on enlève les espaces au début et à la fin
  return (localStorage.getItem(PSEUDO_KEY) || '').trim()
}


// ============================================================
// setPseudo(value) — Sauvegarder le pseudo dans le localStorage
// Retourne true si sauvegardé, false si le pseudo est vide/invalide
// ============================================================
export function setPseudo(value) {
  // On convertit en string et on supprime les espaces inutiles
  const t = String(value || '').trim()

  // Si le pseudo est vide après nettoyage, on refuse et on retourne false
  if (!t) return false

  // localStorage.setItem(clé, valeur) → sauvegarde dans le navigateur
  localStorage.setItem(PSEUDO_KEY, t)

  // On retourne true pour indiquer que la sauvegarde a réussi
  return true
}


// ============================================================
// clearPseudo() — Effacer le pseudo du localStorage
// Appelée quand l'utilisateur veut changer de pseudo ou se déconnecter
// ============================================================
export function clearPseudo() {
  // localStorage.removeItem(clé) → supprime complètement la valeur
  localStorage.removeItem(PSEUDO_KEY)
}


// ============================================================
// hasPseudo() — Vérifier si un pseudo valide existe
// Retourne true si un pseudo est stocké, false sinon
// Utilisée par le router pour protéger les routes
// ============================================================
export function hasPseudo() {
  // getPseudo() retourne '' si absent → .length === 0 → false
  // getPseudo() retourne 'Alex' → .length > 0 → true
  return getPseudo().length > 0
}
