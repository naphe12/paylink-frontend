import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, Bot, CheckCircle2, ShieldAlert, UserCog, Users } from "lucide-react";

const ASSISTANTS = [
  {
    name: "Assistant transfert",
    scope: "Client",
    availableFor: ["client"],
    description: "Prepare une demande de transfert externe a partir d'un message naturel.",
    examples: [
      "envoie 40 eur Jean Baptiste Lumicash Burundi",
      "transfert 250 usd a Clarisse au Rwanda via Ecocash au 0788123456",
    ],
  },
  {
    name: "Support transfert",
    scope: "Client",
    availableFor: ["client"],
    description: "Explique le statut d'une demande et la prochaine etape.",
    examples: [
      "pourquoi mon transfert est pending",
      "suis la reference EXT-1234ABCD",
    ],
  },
  {
    name: "Assistant cash",
    scope: "Client",
    availableFor: ["client"],
    description: "Aide pour depot, retrait et capacite cash.",
    examples: ["depot 25000 bif", "retrait 100 usd via ecocash au +250788123456"],
  },
  {
    name: "Assistant credit",
    scope: "Client",
    availableFor: ["client"],
    description: "Explique la capacite wallet + credit et simule si un montant peut passer.",
    examples: ["combien me reste en credit", "si j'envoie 200 usd est-ce que ca passe"],
  },
  {
    name: "Assistant KYC",
    scope: "Client",
    availableFor: ["client"],
    description: "Explique le statut KYC, les limites et les documents manquants.",
    examples: ["quel est mon niveau kyc", "quels documents il me manque"],
  },
  {
    name: "Assistant wallet",
    scope: "Client",
    availableFor: ["client"],
    description: "Resume solde, limites et derniers mouvements.",
    examples: ["quel est mon solde", "montre mon dernier mouvement"],
  },
  {
    name: "Support wallet",
    scope: "Client",
    availableFor: ["client"],
    description: "Diagnostique depot manquant, retrait bloque ou baisse de solde.",
    examples: ["je ne vois pas mon depot", "pourquoi mon retrait est bloque"],
  },
  {
    name: "Assistant escrow",
    scope: "Client",
    availableFor: ["client"],
    description: "Suit une commande escrow et explique le statut ou la prochaine etape.",
    examples: ["quel est le statut de mon dernier escrow", "pourquoi mon escrow est en attente"],
  },
  {
    name: "Assistant P2P",
    scope: "Client",
    availableFor: ["client"],
    description: "Suit un trade P2P et resume les offres actives.",
    examples: ["quel est le statut de mon dernier trade p2p", "resume mes offres p2p"],
  },
  {
    name: "Assistant onboarding agent",
    scope: "Agent",
    availableFor: ["agent", "admin"],
    description: "Guide procedurale pour cash-in, cash-out, scan QR et cas terrain.",
    examples: ["comment faire un cash-out", "client sans kyc", "cash-out bloque"],
  },
];

function currentRoleFromPath(pathname = "") {
  if (pathname.startsWith("/dashboard/admin")) return "admin";
  if (pathname.startsWith("/dashboard/agent")) return "agent";
  return "client";
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "agent") return "Agent";
  return "Client";
}

function availabilityTone(isAvailable) {
  return isAvailable
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-slate-200 bg-slate-50 text-slate-600";
}

export default function AssistantsGuidePage() {
  const location = useLocation();
  const currentRole = currentRoleFromPath(location.pathname);

  const sections = useMemo(() => {
    const clientAssistants = ASSISTANTS.filter((item) => item.scope === "Client");
    const agentAssistants = ASSISTANTS.filter((item) => item.scope === "Agent");
    return { clientAssistants, agentAssistants };
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#fde68a,_#ffffff_45%,_#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg">
              <BookOpen size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Guide assistants</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Reference rapide pour savoir quel assistant utiliser, comment lui parler et sur quels roles il est disponible.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Users size={16} />
              Role courant
            </div>
            <p className="mt-1 text-xs text-slate-500">{roleLabel(currentRole)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 size={16} />
            Comment les utiliser
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Ecris une phrase simple et directe.</p>
            <p>Pour creer une demande, donne montant, devise et informations metier utiles.</p>
            <p>Pour comprendre un blocage, commence par `pourquoi`, `statut` ou `prochaine etape`.</p>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot size={16} />
            Disponibilite admin
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Actuellement, les assistants conversationnels sont exposes surtout pour `client` et `agent terrain`.</p>
            <p>Cote `admin`, seul le guide est expose pour l'instant. Il n'y a pas encore de routes admin dediees pour parler aux assistants metier.</p>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldAlert size={16} />
            Bon usage
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Utilise la reference si tu veux suivre une demande precise.</p>
            <p>Verifie les champs reconnus avant de confirmer une operation.</p>
            <p>Si le bouton de confirmation est grise, il manque encore des informations.</p>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          <Users size={16} />
          Assistants Client
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.clientAssistants.map((assistant) => {
            const isAvailable = assistant.availableFor.includes(currentRole);
            return (
              <article key={assistant.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{assistant.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{assistant.description}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${availabilityTone(isAvailable)}`}>
                    {isAvailable ? "Disponible ici" : "Non expose sur ce role"}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exemples</p>
                  <div className="mt-2 space-y-2">
                    {assistant.examples.map((example) => (
                      <div key={example} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          <UserCog size={16} />
          Assistants Agent
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.agentAssistants.map((assistant) => {
            const isAvailable = assistant.availableFor.includes(currentRole);
            return (
              <article key={assistant.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{assistant.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{assistant.description}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${availabilityTone(isAvailable)}`}>
                    {isAvailable ? "Disponible ici" : "Non expose sur ce role"}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exemples</p>
                  <div className="mt-2 space-y-2">
                    {assistant.examples.map((example) => (
                      <div key={example} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
