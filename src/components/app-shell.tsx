"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; count?: number };

/**
 * The signed-in frame. A narrow rail, mono labels, and a count next to any
 * item that has something waiting - the only place in the product where a
 * number appears without the reader asking for it.
 */
export function AppShell({
  nav,
  user,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  user: { full_name: string; college_id: string };
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== nav[0]?.href && pathname.startsWith(`${href}/`));

  const links = (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "group flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-all",
              active
                ? "bg-ink text-white shadow-xs font-medium"
                : "text-mute hover:bg-forest-50/80 hover:text-ink",
            )}
          >
            <span className="truncate">{item.label}</span>
            {item.count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] tabular-nums font-medium",
                  active ? "bg-forest-500/25 text-emerald-300" : "bg-forest-100 text-forest-800",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      {/* Mobile bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-rule bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-forest-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <Link href="/" className="text-[15px] font-semibold tracking-[-0.03em] text-ink">
            Netree
          </Link>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-mute hover:text-ink"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {open ? (
        <div className="border-b border-rule bg-white px-4 py-4 lg:hidden">
          {links}
          <SignOut className="mt-4" />
        </div>
      ) : null}

      {/* Left Navigation Rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-white/70 backdrop-blur-xs px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-3">
          <span className="h-2 w-2 rounded-full bg-forest-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <Link href="/" className="text-[17px] font-semibold tracking-[-0.03em] text-ink">
            Netree
          </Link>
        </div>
        <p className="mt-1 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          {roleLabel}
        </p>

        <div className="mt-8 flex-1">{links}</div>

        <div className="border-t border-rule pt-4">
          <div className="flex items-center gap-3 px-1">
            <Avatar name={user.full_name} className="h-8 w-8" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{user.full_name}</p>
              <p className="truncate font-mono text-[11px] text-faint">{user.college_id}</p>
            </div>
          </div>
          <SignOut className="mt-3" />
        </div>
      </aside>

      {/* Main Center Content */}
      <main className="min-w-0">{children}</main>
    </div>
  );
}

function SignOut({ className }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute transition-colors hover:bg-forest-50/80 hover:text-ink"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </form>
  );
}

/** Consistent page header for every screen inside the shell. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 font-read text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-mute">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
