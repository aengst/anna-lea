import { BookOpen } from 'lucide-react';
import manualRaw from '../../../docs/ADMIN_MANUAL.md?raw';

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Säker inline-parser utan dangerouslySetInnerHTML (**fet**, *kursiv*, `kod`)
function renderInline(text) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-medium text-stone-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*')) {
      parts.push(
        <em key={key++} className="italic text-stone-700">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-stone-800 text-[12px] font-mono rounded"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function parseMarkdownBlocks(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  const toc = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === '---') {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3);
      const id = slugifyHeading(text);
      toc.push({ id, text });
      blocks.push({ type: 'h2', id, text });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    // Numrerad lista (inkl. ev. indragna underpunkter)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const cur = lines[i];
        const curTrim = cur.trim();
        if (/^\d+\.\s+/.test(curTrim)) {
          items.push({ text: curTrim.replace(/^\d+\.\s+/, ''), sub: [] });
          i += 1;
        } else if (/^\s+-\s+/.test(cur) && items.length > 0) {
          items[items.length - 1].sub.push(curTrim.replace(/^-\s+/, ''));
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Punktlista (inkl. ev. indragna underpunkter)
    if (/^-\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const cur = lines[i];
        const curTrim = cur.trim();
        if (/^-\s+/.test(cur)) {
          items.push({ text: curTrim.replace(/^-\s+/, ''), sub: [] });
          i += 1;
        } else if (/^\s+-\s+/.test(cur) && items.length > 0) {
          items[items.length - 1].sub.push(curTrim.replace(/^-\s+/, ''));
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Vanligt stycke
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('> ') &&
      lines[i].trim() !== '---' &&
      !/^(\d+\.|-)\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') });
  }

  return { blocks, toc };
}

export default function ManualTab() {
  const { blocks, toc } = parseMarkdownBlocks(manualRaw);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Snabb innehållsförteckning */}
      <div className="bg-white border border-stone-200 p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-stone-800">
          <BookOpen className="w-4 h-4" strokeWidth={1.6} />
          <h2 className="text-xs uppercase tracking-[0.2em]">Snabbhopp i manualen</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {toc.map((entry) => (
            <a
              key={entry.id}
              href={`#manual-${entry.id}`}
              className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-colors"
            >
              {entry.text}
            </a>
          ))}
        </div>
      </div>

      {/* Renderad manual */}
      <article className="bg-white border border-stone-200 p-6 sm:p-10 space-y-4 text-sm text-stone-700 leading-relaxed">
        {blocks.map((block, idx) => {
          if (block.type === 'h1') {
            return (
              <h1
                key={idx}
                className="text-xl sm:text-2xl uppercase tracking-[0.16em] text-stone-900 pb-2"
              >
                {block.text}
              </h1>
            );
          }
          if (block.type === 'h2') {
            return (
              <h2
                key={idx}
                id={`manual-${block.id}`}
                className="text-base sm:text-lg uppercase tracking-[0.14em] text-stone-900 pt-4 scroll-mt-32"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === 'h3') {
            return (
              <h3 key={idx} className="text-sm font-medium text-stone-900 pt-2">
                {block.text}
              </h3>
            );
          }
          if (block.type === 'hr') {
            return <hr key={idx} className="border-stone-200 my-4" />;
          }
          if (block.type === 'quote') {
            return (
              <div
                key={idx}
                className="border-l-2 border-stone-900 bg-stone-50 px-4 py-3 text-xs sm:text-sm text-stone-700"
              >
                {renderInline(block.text)}
              </div>
            );
          }
          if (block.type === 'ol') {
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-2">
                {block.items.map((item, i) => (
                  <li key={i} className="space-y-1.5">
                    <span>{renderInline(item.text)}</span>
                    {item.sub.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1 text-stone-600">
                        {item.sub.map((s, si) => (
                          <li key={si}>{renderInline(s)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            );
          }
          if (block.type === 'ul') {
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5">
                {block.items.map((item, i) => (
                  <li key={i} className="space-y-1">
                    <span>{renderInline(item.text)}</span>
                    {item.sub.length > 0 && (
                      <ul className="list-circle pl-5 space-y-1 text-stone-600">
                        {item.sub.map((s, si) => (
                          <li key={si}>{renderInline(s)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            );
          }
          return <p key={idx}>{renderInline(block.text)}</p>;
        })}
      </article>
    </div>
  );
}
