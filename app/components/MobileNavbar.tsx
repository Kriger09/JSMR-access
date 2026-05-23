

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Inicio",
    icon: "⌂",
  },
  {
    href: "/caseta",
    label: "Caseta",
    icon: "▣",
  },
  {
    href: "/residente",
    label: "Residente",
    icon: "◉",
  },
  {
    href: "/admin",
    label: "Admin",
    icon: "⚙",
  },
];

export default function MobileNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9998] md:hidden px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 pointer-events-none">
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-white/10 bg-neutral-950/85 backdrop-blur-2xl shadow-2xl shadow-black/60 pointer-events-auto">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-xs font-black transition-all active:scale-95 ${
                  isActive
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="mt-1 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}