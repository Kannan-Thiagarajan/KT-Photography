'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, X, Send, Sparkles, ArrowUpRight } from 'lucide-react';
import { money, whatsappLink } from '@/config/brand';
import type { Package } from '@/types/models';
function answer(question: string, packages: Package[]) {
  const text = question.toLowerCase();
  const describe = (slug: string) => {
    const p = packages.find((p) => p.slug === slug);
    return p ? `${p.title} (${money(p.price)}, ${p.included_hours} hours included)` : null;
  };
  const names = (slugs: string[]) => slugs.map(describe).filter(Boolean).join(' or ');
  if (/second|2nd|another photographer/.test(text))
    return 'A second photographer is RM199/hour, or RM499 for up to 4 hours. Four hourly hours cost RM796, so the flat option saves RM297. Add your choice in the coverage calculator.';
  if (/extra|hours?|rate|cost|price/.test(text))
    return 'Additional coverage is RM100/hour across all collections. Select a collection, choose the hours and any second photographer to see the exact estimate. Your base collection rate is shown separately.';
  if (/album|frame|size|suitcase/.test(text))
    return (
      packages
        .filter((p) => p.slug !== 'signature')
        .map((p) => `${p.title}: ${p.features.join(', ')}.`)
        .join('\n\n') || 'Ask Kannan about available album and frame collections.'
    );
  if (/rom|marriage/.test(text))
    return `For ROM ceremonies, consider ${names(['classic', 'elegance']) || 'an album collection'}. Use the quick finder to match your duration and whether you want printed keepsakes.`;
  if (/graduat|convocation|portrait|model/.test(text))
    return `${names(['signature', 'classic']) || 'Our photography collections'} are options for portrait and graduation sessions. Signature provides digital softcopies; album collections add printed keepsakes.`;
  if (/baby|cradling|seemantham/.test(text))
    return `For baby showers and cradling ceremonies, explore ${names(['classic', 'elegance']) || 'the active collections'}. The finder helps choose based on your desired coverage and album preference.`;
  if (/wedding|reception|sangeet/.test(text))
    return `For wedding celebrations, explore ${names(['grand', 'elite']) || 'the active collections'}. Compare their individual album sizes and customise additional coverage in the calculator.`;
  if (/book|date|avail|confirm/.test(text))
    return 'Generate your quotation estimate, then choose Confirm via WhatsApp to discuss it directly with Kannan. An estimate does not reserve a slot; Kannan confirms the date and final details.';
  return 'I can help with collections, extra hours, albums and second-photographer rates. Try the 3-step finder for a recommendation, or generate a quotation to discuss your event with Kannan.';
}
export function PackageGuide({ packages }: { packages: Package[] }) {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(''),
    [messages, setMessages] = useState([
      {
        sender: 'guide',
        text: 'Hello! Let’s find a collection for your story. Ask about weddings, portraits, albums or photography rates.',
      },
    ]);
  const feed = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages]);
  function send(question: string) {
    const text = question.trim().slice(0, 400);
    if (!text) return;
    setMessages((history) => [
      ...history.slice(-18),
      { sender: 'you', text },
      { sender: 'guide', text: answer(text, packages) },
    ]);
    setInput('');
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div className="package-guide">
      <button
        className="guide-trigger"
        aria-label="KT assistant"
        ref={trigger}
        aria-expanded={open}
        aria-controls="package-guide-panel"
        onClick={() => setOpen(!open)}
      >
        <MessageCircle size={19} />
        <span>KT assistant</span>
      </button>
      {open && (
        <section
          id="package-guide-panel"
          className="guide-panel"
          role="dialog"
          aria-label="KT package guide"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
        >
          <header>
            <div>
              <Sparkles size={19} />
              <div>
                <h3>KT package guide</h3>
                <p>Instant collection help</p>
              </div>
            </div>
            <button className="icon-button" onClick={close} aria-label="Close package guide">
              <X size={18} />
            </button>
          </header>
          <div
            className="guide-messages"
            ref={feed}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((m, i) => (
              <div className={`guide-message ${m.sender === 'you' ? 'from-you' : ''}`} key={i}>
                <span>{m.sender === 'you' ? 'You' : 'KT guide'}</span>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <div className="guide-suggestions">
            {['Wedding collections', 'Second photographer', 'Album sizes'].map((q) => (
              <button key={q} type="button" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              ref={field}
              aria-label="Ask about photography packages"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={400}
              placeholder="Ask about packages, ROM, albums…"
            />
            <button type="submit" aria-label="Send question" disabled={!input.trim()}>
              <Send size={17} />
            </button>
          </form>
          <footer>
            <span>Answers from the KT collection guide.</span>
            <a href={whatsappLink()} target="_blank" rel="noreferrer">
              Ask Kannan
              <ArrowUpRight size={12} />
            </a>
          </footer>
        </section>
      )}
    </div>
  );
}
