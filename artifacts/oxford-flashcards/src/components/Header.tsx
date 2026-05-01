import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Moon, Sun, LogOut, LayoutDashboard, Shield, ChevronDown, Languages } from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

type NavItem = { labelKey: TranslationKey; href: string };

const NAV: NavItem[] = [
  { labelKey: "nav.courses", href: "/#products" },
  { labelKey: "nav.features", href: "/#features" },
  { labelKey: "nav.freeLessons", href: "/free-lessons" },
  { labelKey: "nav.assessment", href: "/assessment" },
  { labelKey: "nav.affiliate", href: "/affiliate" },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white dark:ring-gray-900">
      {initials}
    </div>
  );
}

function LangToggle({ compact = true, onToggle }: { compact?: boolean; onToggle?: () => void }) {
  const { lang, toggle, t } = useLanguage();
  const target = lang === "ar" ? "en" : "ar";
  const label = lang === "ar" ? t("header.langSwitchToEn") : t("header.langSwitchToAr");
  return (
    <button
      type="button"
      onClick={() => {
        toggle();
        onToggle?.();
      }}
      aria-label={label}
      title={label}
      data-testid="lang-toggle"
      className={`${
        compact ? "h-10 px-3" : "w-full px-4 py-2.5"
      } inline-flex items-center justify-center gap-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-all hover:scale-105 active:scale-95 shadow-sm font-bold text-xs uppercase tracking-wider`}
    >
      <Languages size={14} />
      <span>{target.toUpperCase()}</span>
    </button>
  );
}

export default function Header() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-950/75 border-b border-slate-100/80 dark:border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <img
            src={edulexoLogo}
            alt="Abu Omar EduLexo"
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div className="leading-tight hidden sm:block">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              <span className="text-slate-900 dark:text-white">{t("common.brandPrefix")}</span>
              <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                {t("common.brandSuffix")}
              </span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              {t("common.tagline")}
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <LangToggle />

          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("header.themeLight") : t("header.themeDark")}
            className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-all hover:scale-110 active:scale-95 shadow-sm"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 pe-2 ps-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                aria-label={t("header.accountMenu")}
                aria-expanded={menuOpen}
              >
                <Avatar name={user.name} />
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400 hidden sm:block" />
              </button>
              {menuOpen && (
                <div className="absolute end-0 top-full mt-2 w-60 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-2xl py-2 origin-top-right animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <LayoutDashboard size={16} /> {t("header.dashboard")}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition"
                    >
                      <Shield size={16} /> {t("header.admin")}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                  >
                    <LogOut size={16} /> {t("header.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
              >
                {t("header.login")}
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
              >
                {t("header.signup")}
              </Link>
            </>
          )}

          {/* Hamburger (lg:hidden) */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={t("header.toggleMenu")}
            aria-expanded={mobileOpen}
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-gray-800">
              <LangToggle compact={false} onToggle={() => setMobileOpen(false)} />
            </div>
            {!isAuthenticated && (
              <div className="flex gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-gray-800">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30"
                >
                  {t("header.login")}
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white"
                >
                  {t("header.signup")}
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
