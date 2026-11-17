import type { MetadataRoute } from "next";

// Les robots qui collectent des textes pour entraîner ou nourrir des IA : la silsila et les biographies
// ne leur sont pas ouvertes. Les moteurs de recherche et les aperçus de liens (WhatsApp, X, Facebook) restent permis.
// Une consigne, pas un verrou : seuls les robots respectueux la suivent.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "Google-Extended",
  "GoogleOther",
  "Applebot-Extended",
  "CCBot",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FacebookBot",
  "Amazonbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "MistralAI-User",
  "DeepSeekBot",
  "YouBot",
  "Diffbot",
  "Omgilibot",
  "Timpibot",
  "ImagesiftBot",
  "AI2Bot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      // Les pages de compte et d'administration n'ont rien à faire dans un moteur de recherche.
      { userAgent: "*", allow: "/", disallow: ["/admin", "/mon-compte", "/connexion", "/auth", "/appairage"] },
    ],
  };
}
