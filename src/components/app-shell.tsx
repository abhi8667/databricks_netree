"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Compass,
  FileText,
  Flame,
  HelpCircle,
  Inbox,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

import { DEFAULT_NOTIFICATIONS, type NotificationItem } from "@/lib/notifications";

export type NavItem = { href: string; label: string; count?: number };

export function AppShell({
  nav,
  user,
  roleLabel,
  initialNotifications,
  children,
}: {
  nav: NavItem[];
  user: { full_name: string; college_id: string };
  roleLabel: string;
  initialNotifications?: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showHamburger, setShowHamburger] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    initialNotifications ?? DEFAULT_NOTIFICATIONS,
  );

  React.useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications);
    }
  }, [initialNotifications]);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("netree:notifications", { detail: notifications }));
  }, [notifications]);

  const notifRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close notifications or user menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showNotifications || showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications, showUserMenu]);

  // Lock scroll when hamburger drawer is open
  React.useEffect(() => {
    if (showHamburger) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showHamburger]);

  // Split navigation: Essentials for the PillNav, extra features for the Hamburger drawer
  const essentialNav = React.useMemo(() => {
    // Keep 3 primary essentials on top (Dashboard, My Ideas, Events & Hacks)
    return nav.slice(0, 3);
  }, [nav]);

  const secondaryNav = React.useMemo(() => {
    // Remaining features go into the hamburger menu
    return nav.slice(3);
  }, [nav]);

  const activeHref = React.useMemo(() => {
    const matched = nav.find(
      (item) =>
        pathname === item.href ||
        (item.href !== nav[0]?.href && pathname.startsWith(`${item.href}/`)),
    );
    return matched?.href || nav[0]?.href;
  }, [pathname, nav]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const logoNode = (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-forest-600 text-white shadow-glow-sm dark:bg-forest-500">
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-transparent">
      {/* Top Floating Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-rule/60 bg-paper/90 px-4 py-2.5 backdrop-blur-xl transition-colors dark:border-dark-border/60 dark:bg-dark-paper/90 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Left: Hamburger Menu Button + Brand & Role Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHamburger(true)}
              aria-label="Open features navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-rule/80 bg-white/80 text-mute shadow-xs transition-all hover:border-forest-500/50 hover:bg-forest-50 hover:text-forest-800 dark:border-dark-border dark:bg-dark-card/80 dark:text-dark-mute dark:hover:bg-forest-950/60 dark:hover:text-forest-200"
            >
              <Menu className="h-4 w-4" />
            </button>

            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-[-0.03em] text-ink transition-colors hover:text-forest-700 dark:text-dark-ink dark:hover:text-forest-400"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-forest-500 shadow-glow-sm" />
              </span>
              <span>Netree</span>
            </Link>

            <span className="hidden rounded-full border border-forest-500/30 bg-forest-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-forest-700 dark:bg-forest-950/60 dark:text-forest-300 sm:inline-block">
              {roleLabel}
            </span>
          </div>

          {/* Centered Clean & Simple Navigation */}
          <nav className="flex items-center gap-1 rounded-full border border-rule/80 bg-white/80 p-1 shadow-xs backdrop-blur-md dark:border-dark-border/80 dark:bg-dark-card/80">
            {essentialNav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== nav[0]?.href && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-all",
                    active
                      ? "bg-forest-700 text-white font-semibold shadow-xs dark:bg-forest-600"
                      : "text-mute hover:bg-forest-50 hover:text-forest-800 dark:text-dark-mute dark:hover:bg-forest-950/60 dark:hover:text-forest-200",
                  )}
                >
                  <span>{item.label}</span>
                  {item.count ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-forest-100 text-forest-800 dark:bg-forest-950 dark:text-forest-300",
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Notifications + ThemeToggle + Profile + Hamburger Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Notification Menu (Bell) */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((v) => !v)}
                aria-label="Open notifications"
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full border border-rule/80 bg-white/80 text-mute shadow-xs transition-all hover:border-forest-500/50 hover:bg-forest-50 hover:text-forest-800 dark:border-dark-border dark:bg-dark-card/80 dark:text-dark-mute dark:hover:bg-forest-950/60 dark:hover:text-forest-200",
                  showNotifications && "border-forest-500 text-forest-700 dark:text-forest-300",
                )}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 font-mono text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-dark-paper">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-rule/90 bg-white/95 p-4 shadow-xl backdrop-blur-2xl dark:border-dark-border dark:bg-dark-card/95 sm:w-96 animate-rise">
                  <div className="flex items-center justify-between border-b border-rule pb-3 dark:border-dark-border">
                    <div className="flex items-center gap-2">
                      <h3 className="font-read text-base font-semibold text-ink dark:text-dark-ink">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-forest-100 px-2 py-0.5 font-mono text-[10px] font-bold text-forest-800 dark:bg-forest-950 dark:text-forest-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-forest-700 hover:underline dark:text-forest-400"
                      >
                        <CheckCheck className="h-3 w-3" /> Mark read
                      </button>
                    )}
                  </div>

                  <div className="mt-3 divide-y divide-rule/60 overflow-hidden dark:divide-dark-border/60 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-mute dark:text-dark-mute">
                        No notifications right now.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setShowNotifications(false)}
                          className={cn(
                            "group block py-3 transition-colors hover:bg-forest-50/50 dark:hover:bg-forest-950/40 rounded-xl px-2.5",
                            !n.read && "bg-forest-50/30 dark:bg-forest-950/20",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  n.type === "declined"
                                    ? "bg-red-500 shadow-xs"
                                    : n.type === "reply"
                                    ? "bg-emerald-500 shadow-glow-sm"
                                    : n.type === "event"
                                    ? "bg-purple-500"
                                    : "bg-forest-500"
                                )}
                              />
                              <p
                                className={cn(
                                  "truncate text-xs font-semibold",
                                  n.type === "declined"
                                    ? "text-red-700 dark:text-red-400"
                                    : "text-ink group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-300"
                                )}
                              >
                                {n.title}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-faint dark:text-dark-faint">
                              {n.time}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-mute dark:text-dark-mute pl-4">
                            {n.description}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="mt-3 border-t border-rule pt-2.5 text-center dark:border-dark-border">
                    <Link
                      href="/student/requests"
                      onClick={() => setShowNotifications(false)}
                      className="font-mono text-xs text-forest-700 hover:underline dark:text-forest-400"
                    >
                      View all activity →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* Interactive User Profile & Sign Out Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((v) => !v)}
                aria-expanded={showUserMenu}
                aria-label="Open user profile menu"
                className={cn(
                  "flex items-center gap-2 rounded-full border border-rule/80 bg-white/90 py-1 pl-1.5 pr-2.5 shadow-xs transition-all hover:border-forest-500/60 hover:bg-forest-50/60 dark:border-dark-border dark:bg-dark-card/90 dark:hover:border-forest-500/60 dark:hover:bg-forest-950/40 cursor-pointer",
                  showUserMenu && "border-forest-600 ring-2 ring-forest-500/20 dark:border-forest-500"
                )}
              >
                <Avatar name={user.full_name} className="h-6 w-6 text-[10px]" />
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[110px] truncate text-xs font-semibold text-ink dark:text-dark-ink">
                    {user.full_name}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-mute transition-transform duration-200 dark:text-dark-mute",
                    showUserMenu && "rotate-180 text-forest-700 dark:text-forest-400"
                  )}
                />
              </button>

              {/* Profile Dropdown Popover */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-rule/80 bg-white/98 p-3 shadow-xl backdrop-blur-xl dark:border-dark-border dark:bg-dark-card/98 animate-in fade-in zoom-in-95 duration-150 z-50">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 border-b border-rule/70 p-2 pb-3 dark:border-dark-border/70">
                    <Avatar name={user.full_name} className="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink dark:text-dark-ink">
                        {user.full_name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="rounded-md bg-forest-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-forest-800 dark:bg-forest-950 dark:text-forest-300">
                          {roleLabel}
                        </span>
                        <span className="truncate font-mono text-[11px] text-faint dark:text-dark-faint">
                          {user.college_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Links */}
                  <div className="mt-2 space-y-1">
                    <Link
                      href="/onboarding"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-forest-50 hover:text-forest-800 dark:text-dark-ink dark:hover:bg-forest-950/60 dark:hover:text-forest-300"
                    >
                      <User className="h-4 w-4 text-forest-600 dark:text-forest-400" />
                      <div>
                        <p className="font-semibold leading-none">View Profile</p>
                        <p className="mt-0.5 text-[10px] text-mute dark:text-dark-mute">
                          Edit academic details & bio
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/onboarding/confirmed"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-forest-50 hover:text-forest-800 dark:text-dark-ink dark:hover:bg-forest-950/60 dark:hover:text-forest-300"
                    >
                      <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="font-semibold leading-none">Lakehouse Verification</p>
                        <p className="mt-0.5 text-[10px] text-mute dark:text-dark-mute">
                          Verified campus credentials
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* Sign Out Button */}
                  <div className="mt-2 border-t border-rule/70 pt-2 dark:border-dark-border/70">
                    <SignOutButton />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Full-Width Content Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 min-w-0">
        {children}
      </main>

      {/* Slide-out Hamburger Menu Drawer for Extra Features (Left Side) */}
      {showHamburger && (
        <div
          onClick={() => setShowHamburger(false)}
          className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full max-w-sm flex-col justify-between border-r border-rule/80 bg-paper p-6 shadow-2xl dark:border-dark-border dark:bg-dark-paper animate-in slide-in-from-left duration-300"
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-rule pb-4 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <Avatar name={user.full_name} className="h-9 w-9" />
                  <div>
                    <h2 className="text-sm font-semibold text-ink dark:text-dark-ink">
                      {user.full_name}
                    </h2>
                    <p className="font-mono text-[11px] text-mute dark:text-dark-mute">
                      {user.college_id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHamburger(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-forest-50 hover:text-ink dark:hover:bg-forest-950"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Extra Features Directory */}
              <div className="mt-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint dark:text-dark-faint">
                  Secondary Features & Directory
                </p>

                <nav className="mt-3 space-y-1.5">
                  {secondaryNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowHamburger(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3.5 py-2.5 font-mono text-xs uppercase tracking-wider transition-all",
                        pathname === item.href
                          ? "bg-forest-700 text-white font-semibold dark:bg-forest-600"
                          : "text-mute hover:bg-forest-50 hover:text-forest-800 dark:text-dark-mute dark:hover:bg-forest-950/60 dark:hover:text-forest-200",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        {item.label.toLowerCase().includes("request") && <Inbox className="h-4 w-4" />}
                        {item.label.toLowerCase().includes("position") && <Compass className="h-4 w-4" />}
                        {item.label.toLowerCase().includes("mentor") && <MessageCircleQuestion className="h-4 w-4" />}
                        {item.label.toLowerCase().includes("profile") && <User className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </span>
                      {item.count ? (
                        <span className="rounded-full bg-forest-100 px-2 py-0.5 font-mono text-[10px] font-bold text-forest-800 dark:bg-forest-950 dark:text-forest-300">
                          {item.count}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Drawer Footer: Sign out */}
            <div className="border-t border-rule pt-4 dark:border-dark-border">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={signOut} className="w-full">
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rule/80 bg-white/70 py-2.5 font-mono text-xs uppercase tracking-wider text-mute shadow-xs transition-all hover:bg-red-50 hover:text-red-700 dark:border-dark-border dark:bg-dark-card/70 dark:text-dark-mute dark:hover:bg-red-950/40 dark:hover:text-red-300"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
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
    <header className="flex flex-wrap items-end justify-between gap-6 rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 font-read text-3xl leading-tight text-ink dark:text-dark-ink sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-mute dark:text-dark-mute">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
