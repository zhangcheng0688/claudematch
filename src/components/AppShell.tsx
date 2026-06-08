// src/components/AppShell.tsx
// Shared layout for all authenticated pages:
// - Sticky top header with brand + back link + language toggle + account menu
// - Right-side account menu (avatar with email initial, dropdown nav + signout)
//
// Pages just wrap their content in <AppShell back={...}>...</AppShell> and get
// a consistent navigation + signout experience for free.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, ChevronDown, Settings as SettingsIcon, Sparkles, User as UserIcon, MessageCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export type AppShellBack = { to: string; labelEn: string; labelZh: string };

export function AppShell({
  children,
  back,
}: {
  children: ReactNode;
  back?: AppShellBack;
}) {
  const { lang, setLang } = useLang();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const [email, setEmail] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    if (typeof window !== "undefined") window.location.href = "/";
  };

  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {back && (
              <Link
                to={back.to}
                className="px-2 py-1 transition-colors hover:text-foreground"
              >
                ← {lang === "zh" ? back.labelZh : back.labelEn}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setLang(lang === "zh" ? "en" : "zh")}
              aria-label="Toggle language"
              className="inline-flex h-8 items-center rounded-sm border border-border bg-background/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {lang === "zh" ? "EN" : "中文"}
            </button>

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex h-9 items-center gap-1.5 rounded-full pl-1 pr-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground ring-1 ring-primary/30">
                  {initial}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-sm border border-border bg-background/95 shadow-xl backdrop-blur-xl"
                >
                  <div className="border-b border-border/60 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {email || t("Signed in", "已登录")}
                  </div>
                  <MenuItem to="/start" icon={<Sparkles className="h-3.5 w-3.5" />}>
                    {t("Start matching", "开始匹配")}
                  </MenuItem>
                  <MenuItem to="/match" icon={<MessageCircle className="h-3.5 w-3.5" />}>
                    {t("My matches", "我的匹配")}
                  </MenuItem>
                  <MenuItem to="/settings" icon={<SettingsIcon className="h-3.5 w-3.5" />}>
                    {t("Settings", "设置")}
                  </MenuItem>
                  <MenuItem to="/profile" icon={<UserIcon className="h-3.5 w-3.5" />}>
                    {t("Profile", "个人中心")}
                  </MenuItem>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("Sign out", "退出登录")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

function MenuItem({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  );
}
