import Link from "next/link";

import { CommandCenterIcon } from "@/components/command-center-icon";

const navigationItems = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "#business-evolution-title", label: "Mi empresa", icon: "company" },
  { href: "/history", label: "Evolución", icon: "growth" },
  { href: "#tablero-semanal", label: "Plan actual", icon: "plan" },
] as const;

export function CommandCenterNavigation({ hasPlan }: { hasPlan: boolean }) {
  const items = navigationItems.filter(({ href }) => hasPlan || !href.startsWith("#"));

  return (
    <nav
      className="command-navigation"
      aria-label="Navegación principal"
    >
      <span aria-hidden="true" className="command-brand">
        <CommandCenterIcon name="sparkle" className="size-5" />
      </span>
      <ul className="command-navigation-items">
        {items.map((item) => {
          const content = <><CommandCenterIcon name={item.icon} className="size-5" />{item.label}</>;
          return (
            <li key={item.href}>
              {item.href.startsWith("#") ? (
                <a href={item.href} className="command-nav-link" aria-haspopup={item.icon === "plan" ? "dialog" : undefined}>{content}</a>
              ) : (
                <Link href={item.href} aria-current={item.href === "/dashboard" ? "page" : undefined} className="command-nav-link">{content}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
