export default function RichText({ content = '', className = '' }) {
  if (!content) return null;

  const blocks = String(content)
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={`space-y-5 leading-relaxed text-brand-muted ${className}`}>
      {blocks.map((block, idx) => {
        if (block.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-lg sm:text-xl text-brand-ink tracking-[0.12em] uppercase pt-4 first:pt-0"
            >
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-2xl sm:text-3xl text-brand-ink tracking-[0.14em] uppercase pt-2"
            >
              {block.slice(2)}
            </h1>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-line text-[15px] sm:text-base">
            {block}
          </p>
        );
      })}
    </div>
  );
}
