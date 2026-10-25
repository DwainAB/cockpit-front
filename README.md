# Cockpit — Interface

Interface React (Vite, Mantine) du cockpit, et page publique du questionnaire envoyé aux restaurateurs.

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5173, /api relayé vers http://localhost:4000
npm run dev:mock   # sans backend : données de démonstration dans le navigateur
```

## Production

```bash
npm run build                 # cockpit → dist/
npm run build:questionnaire   # questionnaire → dist-questionnaire/ (site statique)
```

`src/core/` contient les types et la logique métier. Une copie existe dans le dépôt du backend : toute modification doit être reportée des deux côtés.
