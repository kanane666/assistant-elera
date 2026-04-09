import * as readline from "readline";

// ===== TON SYSTEM PROMPT =====
const systemPrompt = `Tu es Awa, une assistante virtuelle pour une boutique de vêtements à Dakar.

INFORMATIONS RÉELLES DE LA BOUTIQUE :
- Tailles disponibles : 38, 40, 42, 44, 46
- Horaires : Lundi-Samedi 9h-19h
- Localisation : Plateau, Dakar
- Contact : 77 000 00 00

RÈGLES STRICTES :
1. Tu réponds UNIQUEMENT avec les informations ci-dessus
2. Si tu ne sais pas quelque chose, dis "contactez-nous au 77 000 00 00"
3. Tu ne parles pas d'autres sujets que les vêtements`;

// Mémoire de la conversation
const historique = [];

async function envoyerMessage(messageUtilisateur) {
  historique.push({
    role: "user",
    content: messageUtilisateur,
  });

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      messages: [
        { role: "system", content: systemPrompt },
        ...historique,
      ],
      stream: false,
    }),
  });

  const data = await response.json();
  const reponse = data.message.content;

  historique.push({
    role: "assistant",
    content: reponse,
  });

  return reponse;
}

// Interface terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("=== Assistant Awa — Boutique Dakar ===");
console.log('Tapez "exit" pour quitter\n');

function poserQuestion() {
  rl.question("Vous : ", async (message) => {
    if (message === "exit") {
      console.log("Au revoir !");
      rl.close();
      return;
    }

    const reponse = await envoyerMessage(message);
    console.log(`\nAwa : ${reponse}\n`);

    poserQuestion();
  });
}

poserQuestion();