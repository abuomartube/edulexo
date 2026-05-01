import { Link } from "wouter";
import { useLanguage, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages, LogOut, User2 } from "lucide-react";
import type { PublicUser } from "@/lib/api";

export function Header({
  user,
  onLogout,
}: {
  user: PublicUser | null;
  onLogout: () => void;
}) {
  const { toggle, lang } = useLanguage();
  const t = useT();
  return (
    <header className="border-b border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            L
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight">{t("brand")}</div>
            <div className="text-[11px] opacity-70">{t("brandTag")}</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggle}
            className="text-sidebar-foreground gap-2"
            data-testid="button-lang"
            title={lang === "ar" ? "Switch to English" : "تبديل إلى العربية"}
          >
            <Languages className="h-4 w-4" />
            {t("langToggle")}
          </Button>
          {user ? (
            <>
              <span className="hidden sm:flex items-center gap-2 text-sm opacity-90 px-2">
                <User2 className="h-4 w-4" />
                {user.name || user.email}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={onLogout}
                className="gap-2"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                {t("nav_logout")}
              </Button>
            </>
          ) : (
            <a href="/login">
              <Button size="sm" variant="secondary" data-testid="button-signin">
                {t("nav_signIn")}
              </Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
