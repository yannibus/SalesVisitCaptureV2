# CLAUDE.md — VisiteCommerciale

Instructions spécifiques au projet. Complète `~/.claude/CLAUDE.md`.

## Internationalisation (i18n)

**Règle** : toutes les chaînes visibles utilisateur (LWC, Apex, Flows) doivent passer par des **Custom Labels**.

- **Langue par défaut : Anglais** (valeur du label).
- **Bascule automatique en Français** uniquement si la langue de l'utilisateur connecté est FR (`<translations>` via `fr.translation-meta.xml`).
- Aucune détection manuelle de langue dans le code — Salesforce sert la bonne traduction selon `UserInfo.getLanguage()`.
- Convention de nommage labels : `VC_<Composant>_<Clé>` (ex: `VC_Cockpit_Title`, `VC_KpiStrip_MissingReports`).
- Ne jamais hardcoder de texte FR/EN dans un template HTML ou une classe Apex.
- **Checklist obligatoire quand tu crées ou modifies un LWC/Apex** :
  1. Relire le HTML et le JS à la recherche de chaînes en dur (strings FR entre guillemets, `'Erreur'`, titres de card, empty states, placeholders, toasts, alternative-text des icônes).
  2. Si trouvé : créer ou réutiliser un label EN + traduire en FR.
  3. Exposer via `import LABEL from '@salesforce/label/c.VC_...'` + `this.labels = { ... }` + `{labels.xxx}` dans le template.
