/**
 * HowToPlaySidebar — slim dark panel shown to the left of the game canvas
 * on desktop viewports. Hidden on mobile so it doesn't crowd the game.
 *
 * Usage:
 *   <HowToPlaySidebar rules={['Rule one', 'Rule two', ...]} />
 */

interface HowToPlaySidebarProps {
  rules: string[];
}

export default function HowToPlaySidebar({ rules }: HowToPlaySidebarProps) {
  return (
    // Outer column — matches the navbar's left padding so the card sits directly
    // under the "A AuthorApp Item Bank" brand logo on desktop.
    <aside className="hidden lg:flex flex-col shrink-0 w-64 pt-6 ps-4 pe-3">
      <div className="rounded-xl border border-white/10 bg-[#0a0a1f] px-5 py-5 flex flex-col gap-3">
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
          How to Play
        </p>
        <div className="flex flex-col gap-2.5">
          {rules.map((rule) => (
            <div key={rule} className="flex items-start gap-2.5">
              <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-white/65 text-xs leading-snug">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
