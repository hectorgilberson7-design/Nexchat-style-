import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Bot, Code2, Image, Send, ShieldAlert, Users, type LucideIcon } from 'lucide-react';
import { ASSISTANT_ACTIONS, RULES, type AssistantAction } from '@/data/nexchat';

type AssistantMessage =
  | { id: string; from: 'me'; text: string }
  | { id: string; from: 'bot'; kind: 'text'; text: string }
  | { id: string; from: 'bot'; kind: 'rules' };

const ACTION_ICONS: Record<AssistantAction['id'], LucideIcon> = {
  kotlin: Code2,
  python: Code2,
  image: Image,
  rules: BookOpen,
  restricted: ShieldAlert,
  group: Users,
};

const PENDING_REPLY =
  "Le moteur IA n'est pas encore connecté à NexChat. Votre demande a bien été notée : la réponse apparaîtra ici dès que l'assistant sera activé.";

export default function AssistantView() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      from: 'bot',
      kind: 'text',
      text: "Bonjour, je suis NexChat AI. Je peux vous aider à coder, générer des illustrations, comprendre les règles de la communauté ou gérer un groupe. Choisissez une action ou écrivez-moi directement.",
    },
  ]);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const ask = (text: string, actionId?: AssistantAction['id']) => {
    const stamp = Date.now().toString(36);
    const reply: AssistantMessage =
      actionId === 'rules'
        ? { id: `${stamp}-bot`, from: 'bot', kind: 'rules' }
        : { id: `${stamp}-bot`, from: 'bot', kind: 'text', text: PENDING_REPLY };
    setMessages((current) => [...current, { id: `${stamp}-me`, from: 'me', text }, reply]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    ask(text);
    setDraft('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-fade-up">
      <div className="chat-bg flex-1 space-y-3 overflow-y-auto px-3 pb-4 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-nc-raised bg-nc-surface p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-nc-cyan/15 text-nc-cyan shadow-neon">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-bold tracking-wider text-nc-cyan">NEXCHAT AI</p>
            <p className="text-xs text-nc-muted">Assistant intelligent de la communauté</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ASSISTANT_ACTIONS.map((action) => {
            const Icon = ACTION_ICONS[action.id];
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => ask(action.prompt, action.id)}
                className="flex items-center gap-2.5 rounded-xl border border-nc-raised bg-nc-surface px-3 py-3 text-left text-sm font-medium text-nc-text transition-all duration-200 hover:-translate-y-0.5 hover:border-nc-cyan/60 hover:shadow-neon"
              >
                <Icon className="h-4 w-4 shrink-0 text-nc-cyan" />
                <span className="leading-snug">{action.label}</span>
              </button>
            );
          })}
        </div>

        {messages.map((message) => {
          if (message.from === 'me') {
            return (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[80%] rounded-lg rounded-tr-none bg-nc-out px-3 py-2 text-[15px] leading-snug text-nc-text shadow-sm">
                  {message.text}
                </p>
              </div>
            );
          }
          if (message.kind === 'rules') {
            return (
              <div key={message.id} className="rounded-2xl border border-nc-cyan/30 bg-nc-surface p-4">
                <p className="mb-3 font-semibold text-nc-cyan">Les 14 règles NexChat</p>
                <ol className="space-y-2.5">
                  {RULES.map((rule, index) => (
                    <li key={rule.title} className="flex gap-3 text-sm leading-relaxed">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nc-cyan/15 text-xs font-bold text-nc-cyan">
                        {index + 1}
                      </span>
                      <span>
                        <span className="font-semibold text-nc-text">{rule.title} : </span>
                        <span className="text-nc-muted">{rule.description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          }
          return (
            <div key={message.id} className="flex justify-start">
              <p className="max-w-[85%] rounded-lg rounded-tl-none bg-nc-in px-3 py-2 text-[15px] leading-snug text-nc-text shadow-sm">
                {message.text}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-nc-chat px-2 py-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Posez une question à NexChat AI"
          className="min-w-0 flex-1 rounded-full bg-nc-surface px-4 py-3 text-[15px] text-nc-text placeholder:text-nc-muted focus:outline-none focus:ring-2 focus:ring-nc-cyan/40"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Envoyer"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nc-cyan text-nc-bg transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
