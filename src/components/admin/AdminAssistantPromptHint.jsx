export default function AdminAssistantPromptHint() {
  return (
    <p className="mt-2 text-xs text-slate-500">
      Astuce: la selection client reste disponible, mais vous pouvez aussi ecrire{" "}
      <span className="font-mono text-slate-700">email:client@example.com</span>,{" "}
      <span className="font-mono text-slate-700">phone:+25761234567</span>,{" "}
      <span className="font-mono text-slate-700">paytag:olivier</span> ou{" "}
      <span className="font-mono text-slate-700">user:uuid</span> directement dans le prompt.
    </p>
  );
}
