# Assistant IA Awa — Boutique ELERA

Assistant virtuel pour la boutique de vêtements ELERA à Dakar, construit avec Node.js, Express et Groq API.

## Démo en ligne
- Interface : https://assistant-elera.netlify.app
- Serveur : https://assistant-elera.onrender.com

## Architecture
Utilisateur (navigateur)
↓ charge la page
Netlify — index.html
↓ envoie message + historique
Render — server.js (Express)
↓ appel API sécurisé
Groq — LLM llama-3.3-70b
↓ réponse
Render → Navigateur → affichage

## Fichiers

- `server.js` — serveur Express, fait le lien entre le navigateur et Groq API
- `index.html` — interface de chat, gère l'affichage et l'historique localStorage
- `assistant.js` — test initial en terminal avec Ollama (apprentissage)
- `.env` — clé API Groq (jamais partagée, dans .gitignore)

## Ce que font les imports de server.js

- `express` — crée le serveur web, écoute les requêtes
- `cors` — autorise Netlify à communiquer avec Render (deux domaines différents)
- `dotenv/config` — lit le fichier .env et expose les variables dans process.env
- `groq-sdk` — simplifie les appels à l'API Groq

## Configuration Express

- `app.use(cors())` — autorise toutes les origines à appeler le serveur
- `app.use(express.json())` — décode automatiquement le JSON reçu dans les requêtes
- `app.use(express.static("."))` — sert les fichiers HTML/CSS/JS du dossier courant

## Installation locale

1. Cloner le dépôt
2. Créer un fichier `.env` avec `GROQ_API_KEY=ta_clé`
3. `npm install`
4. `node server.js`
5. Ouvrir `http://localhost:3000/index.html`

## Technos utilisées

- Node.js + Express
- Groq API (llama-3.3-70b-versatile)
- Ollama (développement local)
- Netlify (hébergement frontend)
- Render (hébergement backend)