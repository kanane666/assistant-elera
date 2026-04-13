# Assistant IA Awa — Boutique ELERA

Assistant virtuel pour la boutique de vêtements ELERA à Dakar, construit avec Node.js, Express et Groq API. Awa répond en français et en wolof, conseille les clients sur la mode et redirige vers la boutique pour les détails précis.

## Démo en ligne
- Interface : https://assistant-elera.netlify.app
- Serveur : https://assistant-elera.onrender.com

---

## Architecture complète

```
Utilisateur (navigateur)
    │
    ├─ 1. charge la page ──────────────► Netlify (index.html)
    │                                         │
    │◄─────────────── reçoit le HTML ─────────┘
    │
    ├─ 2. envoie message + historique ──► Render (server.js)
    │                                         │
    │                                         ├─ injecte le system prompt
    │                                         ├─ appelle Groq API (clé cachée)
    │                                         │
    │                                         ▼
    │                                    Groq (llama-3.3-70b)
    │                                         │
    │                                         ├─ génère la réponse
    │                                         │
    │◄─────────── 3. reçoit la réponse ───────┘
    │
    └─ 4. affiche + sauvegarde dans localStorage
```

**Pourquoi deux hébergeurs ?**
- Netlify sert les fichiers statiques (HTML, CSS, JS) — gratuit et instantané
- Render fait tourner le serveur Node.js — nécessaire pour cacher la clé API

**Pourquoi un serveur intermédiaire ?**
Si `index.html` appelait Groq directement depuis le navigateur, la clé API serait visible dans le code source — n'importe qui pourrait la voler. Le serveur `server.js` fait l'appel à Groq côté serveur, la clé ne sort jamais vers le navigateur.

---

## Structure des fichiers

```
assistant-elera/
├── server.js        → serveur Express, lien entre navigateur et Groq
├── index.html       → interface de chat complète (HTML + CSS + JS)
├── assistant.js     → test initial en terminal avec Ollama (apprentissage)
├── package.json     → liste des dépendances npm
├── .env             → clé API Groq (jamais partagée, dans .gitignore)
└── .gitignore       → exclut .env et node_modules de GitHub
```

---

## Explication de server.js

### Les imports

```javascript
import express from "express";
import cors from "cors";
import "dotenv/config";
import Groq from "groq-sdk";
```

`import` en JavaScript fonctionne exactement comme en Python. Chaque module a un rôle précis :

- **express** — crée le serveur web. Sans lui impossible d'écrire `app.post("/chat", ...)` ou de recevoir des requêtes. C'est le cœur du serveur.
- **cors** — Cross Origin Resource Sharing. Par défaut le navigateur interdit qu'une page sur `netlify.app` appelle un serveur sur `onrender.com` car ce sont deux domaines différents. `cors()` lève cette restriction et autorise la communication.
- **dotenv/config** — lit le fichier `.env` et expose son contenu dans `process.env`. Grâce à lui `process.env.GROQ_API_KEY` retourne la vraie clé sans jamais l'écrire dans le code.
- **groq-sdk** — module officiel Groq qui simplifie les appels API. Sans lui il faudrait écrire un `fetch` manuel avec tous les headers.

### La configuration Express

```javascript
const app = express();        // créer le serveur
app.use(cors());              // autoriser Netlify à communiquer avec Render
app.use(express.json());      // décoder automatiquement le JSON reçu dans les requêtes
app.use(express.static(".")); // servir les fichiers HTML/CSS/JS du dossier courant
```

- `express.json()` — sans ça quand `index.html` envoie `{ historique: [...] }`, Express verrait du texte brut illisible
- `express.static(".")` — le `.` signifie "dossier courant". C'est grâce à lui que `localhost:3000/index.html` fonctionne

### La route /chat

```javascript
app.post("/chat", async (req, res) => {
  const { historique } = req.body;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...historique,
    ],
  });

  const reponse = completion.choices[0].message.content;
  res.json({ reponse });
});
```

**`async` / `await`** — Groq prend 1-2 secondes pour répondre. Sans `async`, le serveur bloquerait et ne pourrait rien faire pendant ce temps. Avec `async`, il reste disponible pour d'autres requêtes. `await` dit "attends la réponse avant de continuer" sans bloquer tout le serveur. C'est l'équivalent de `async/await` en Python.

**`req` et `res`** — `req` (request) contient tout ce que le navigateur a envoyé. `res` (response) est l'objet avec lequel on répond. `req.body` contient le JSON reçu.

**`const { historique } = req.body`** — déstructuration JavaScript. Équivalent de `historique = req.body["historique"]`. Raccourci pour extraire une clé d'un objet.

**`...historique`** — le spread operator. Déverse le contenu du tableau à plat. Sans lui Groq recevrait un tableau dans un tableau et ne comprendrait pas. Équivalent du `*historique` en Python.

**`completion.choices[0].message.content`** — Groq renvoie un objet volumineux avec des métadonnées. Le texte de la réponse se trouve précisément ici. Le `[0]` parce que Groq peut théoriquement générer plusieurs réponses — on prend la première.

---

## Explication du JavaScript dans index.html

### Chargement de l'historique

```javascript
const historique = JSON.parse(
  localStorage.getItem("awa_historique") || "[]"
);
```

**`localStorage`** — espace de stockage du navigateur qui persiste après fermeture. Comme un tiroir que le site peut ouvrir pour y mettre des données et les retrouver plus tard.

**Problème** — localStorage ne stocke que du texte. L'historique est un tableau d'objets JavaScript. On ne peut pas mettre un tableau dans un tiroir texte directement.

**Solution** — `JSON.stringify` convertit tableau → texte pour stocker. `JSON.parse` convertit texte → tableau pour utiliser. Ils font l'inverse l'un de l'autre. Équivalent de `json.dumps()` et `json.loads()` en Python.

**`|| "[]"`** — si localStorage est vide (première visite), on prend `"[]"` à la place. `"[]"` c'est un tableau vide en texte — après `JSON.parse` ça devient `[]`. Sans ça le code planterait à la première visite.

### Réaffichage au chargement

```javascript
window.onload = () => {
  const messages = document.getElementById("messages");
  historique.forEach((msg) => {
    if (msg.role === "user") {
      messages.innerHTML += `<div class="message user">${msg.content}</div>`;
    } else if (msg.role === "assistant") {
      messages.innerHTML += `<div class="message awa">${msg.content}</div>`;
    }
  });
  messages.scrollTop = messages.scrollHeight;
};
```

**`window.onload`** — s'exécute une seule fois quand la page finit de charger. Nécessaire car si le code cherche un élément HTML avant que la page soit chargée, il ne trouvera rien.

**`document.getElementById("messages")`** — trouve la balise HTML qui a l'id `"messages"`. C'est le pont entre JavaScript et le HTML. Tu peux ensuite modifier son contenu depuis JavaScript.

**`historique.forEach((msg) => {...})`** — parcourt chaque élément du tableau. Équivalent du `for msg in historique:` en Python.

**`if/else if`** — la différence entre les deux branches c'est la classe CSS. `"message user"` affiche le message à droite en bleu. `"message awa"` affiche le message à gauche en gris. Le même objet `{ role, content }` qui va à Groq sert aussi à réafficher la conversation.

**Les backticks** `` `<div>${msg.content}</div>` `` — template literal. Permet d'insérer des variables dans du texte avec `${}`. Équivalent des f-strings Python : `f"<div>{msg.content}</div>"`.

**`messages.scrollTop = messages.scrollHeight`** — fait défiler automatiquement vers le bas. Sans ça si la conversation est longue, l'utilisateur resterait bloqué en haut.

### La fonction envoyer()

```javascript
async function envoyer() {
  const texte = input.value.trim();
  if (!texte) return;

  messages.innerHTML += `<div class="message user">${texte}</div>`;
  historique.push({ role: "user", content: texte });
  input.value = "";

  messages.innerHTML += `<div class="typing" id="typing">Awa écrit...</div>`;

  const res = await fetch("https://assistant-elera.onrender.com/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ historique }),
  });

  const data = await res.json();
  document.getElementById("typing").remove();
  messages.innerHTML += `<div class="message awa">${data.reponse}</div>`;
  historique.push({ role: "assistant", content: data.reponse });

  localStorage.setItem("awa_historique", JSON.stringify(historique));
  messages.scrollTop = messages.scrollHeight;
}
```

**`.trim()`** — supprime les espaces vides au début et à la fin. Sans ça un appui sur espace + Entrée enverrait un message vide.

**`if (!texte) return`** — garde de sécurité. Si le champ est vide la fonction s'arrête immédiatement. Équivalent de `if not texte: return` en Python.

**`historique.push({...})`** — `.push()` ajoute un élément à la fin d'un tableau. Équivalent de `.append()` en Python. Sans ça Groq ne saurait pas ce que l'utilisateur vient de dire.

**`input.value = ""`** — vide le champ de saisie après envoi.

**`id="typing"` puis `.remove()`** — on donne un id unique à "Awa écrit..." pour pouvoir le retrouver et le supprimer précisément quand la vraie réponse arrive.

**`fetch()`** — appel réseau vers le serveur. Équivalent de `requests.post()` en Python. `method: "POST"` car on envoie des données. `headers` prévient le serveur que le contenu est du JSON. `body: JSON.stringify({historique})` convertit le tableau en texte pour l'envoi.

**`await res.json()`** — `res` est la réponse brute. `.json()` la convertit en objet JavaScript utilisable. Après cette ligne `data` contient `{ reponse: "Bonjour !..." }`.

**`localStorage.setItem(..., JSON.stringify(historique))`** — sauvegarde permanente de l'historique mis à jour. Convertit le tableau en texte avant de stocker.

### Le flux complet résumé

```
Utilisateur tape + clique Envoyer
        ↓
Afficher message utilisateur (bleu, droite)
Ajouter à historique[] en mémoire
Vider le champ de saisie
        ↓
Afficher "Awa écrit..."
        ↓
fetch() → envoyer historique à Render (await)
        ↓
Render injecte system prompt + appelle Groq (await)
        ↓
Groq génère la réponse
        ↓
Render renvoie { reponse: "..." }
        ↓
Supprimer "Awa écrit..."
Afficher réponse Awa (gris, gauche)
Ajouter réponse à historique[] en mémoire
Sauvegarder historique dans localStorage
Scroll vers le bas
```

---

## Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/kanane666/assistant-elera.git
cd assistant-elera

# 2. Installer les dépendances
npm install

# 3. Créer le fichier .env
echo "GROQ_API_KEY=ta_clé_groq_ici" > .env

# 4. Lancer le serveur
node server.js

# 5. Ouvrir dans le navigateur
# http://localhost:3000/index.html
```

---

## Technologies utilisées

| Technologie | Rôle |
|---|---|
| Node.js | Environnement d'exécution JavaScript côté serveur |
| Express | Framework web pour créer le serveur et les routes |
| Groq API | LLM llama-3.3-70b-versatile pour générer les réponses |
| Ollama | LLM local pour le développement sans coût |
| Netlify | Hébergement du frontend (index.html) |
| Render | Hébergement du backend (server.js) |
| localStorage | Sauvegarde de l'historique dans le navigateur |
| dotenv | Gestion sécurisée des variables d'environnement |

---

## Concepts clés appris

- **System prompt** — instructions données au LLM avant la conversation, définit la personnalité et les règles
- **Historique** — tableau de messages envoyé à chaque appel API pour que le LLM se souvienne du contexte
- **Hallucination** — quand le LLM invente des informations par manque de données. Se contrôle via le system prompt
- **Async/Await** — permet d'attendre une réponse réseau sans bloquer le serveur
- **CORS** — mécanisme de sécurité du navigateur, nécessite une configuration explicite pour autoriser des domaines croisés
- **Variables d'environnement** — façon sécurisée de stocker des clés secrètes hors du code source