export type AssistantAction = {
  id: 'kotlin' | 'python' | 'image' | 'rules' | 'restricted' | 'group';
  label: string;
  prompt: string;
};

export type Rule = {
  title: string;
  description: string;
};

export const ASSISTANT_ACTIONS: AssistantAction[] = [
  { id: 'kotlin', label: 'Coder en Kotlin', prompt: 'Aide-moi à écrire du code Kotlin avec Jetpack Compose.' },
  { id: 'python', label: 'Coder en Python', prompt: 'Aide-moi à écrire un script Python FastAPI.' },
  { id: 'image', label: 'Image cyber', prompt: 'Génère une illustration cyberpunk avec des néons cyan et bleu, ultra détaillée, HD.' },
  { id: 'rules', label: 'Les 14 règles', prompt: 'Explique-moi les 14 règles de NexChat.' },
  { id: 'restricted', label: 'Compte restreint', prompt: 'Mon compte est restreint, explique-moi pourquoi et comment faire un recours.' },
  { id: 'group', label: 'Gérer un groupe', prompt: 'Donne-moi des conseils pour gérer et modérer mon groupe ou ma chaîne.' },
];

export const RULES: Rule[] = [
  { title: 'Respect', description: 'Aucune insulte, harcèlement ou discrimination.' },
  { title: 'Anti-haine', description: 'Pas de contenu haineux, violent ou extrémiste.' },
  { title: 'Contenu sensible', description: 'Pas de contenu sexuel explicite ni impliquant des mineurs.' },
  { title: 'Intégrité', description: 'Pas d\'arnaques, de fraudes ni d\'usurpation d\'identité.' },
  { title: 'Anti-spam', description: 'Pas de spam ni de messages en masse non sollicités.' },
  { title: 'Désinformation', description: 'Pas de fausses informations dangereuses.' },
  { title: 'Produits interdits', description: 'Pas de vente de produits illégaux (drogues, armes).' },
  { title: 'Vie privée', description: 'Ne pas partager les données personnelles d\'autrui.' },
  { title: 'Sécurité', description: 'Pas de menaces ni d\'incitation à la violence.' },
  { title: 'Propriété intellectuelle', description: 'Respect des droits d\'auteur.' },
  { title: 'Compte unique', description: 'Un seul compte par numéro de téléphone.' },
  { title: 'Anti-bot', description: 'Pas de bots ni d\'automatisation abusive.' },
  { title: 'Responsabilité', description: 'Les admins de groupes et chaînes sont responsables de leur contenu.' },
  { title: 'Sanctions', description: 'Avertissement, puis suspension 24 h, suspension 7 jours, puis bannissement définitif.' },
];
