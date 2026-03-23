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
    <aside className="hidden lg:flex flex-col gap-3 w-56 shrink-0 rounded-xl border border-white/10 bg-[#0a0a1f] px-5 py-5 self-start">
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
    </aside>
  );
}
