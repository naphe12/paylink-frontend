function renderInlineBold(text) {
  const content = String(text || "");
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function RichAssistantText({ text, className = "" }) {
  const lines = String(text || "").split("\n");
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p key={`${line}-${index}`} className={index === 0 ? "" : "mt-2"}>
          {renderInlineBold(line)}
        </p>
      ))}
    </div>
  );
}
