"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";

interface UserMenuProps {
  userName: string;
  userImage: string | null;
  userEmail: string;
  /** When true, render inline (for mobile menu) instead of dropdown */
  inline?: boolean;
}

export function UserMenu({ userName, userImage, userEmail, inline }: UserMenuProps) {
  const t = useTranslations("auth");
  const tNav = useTranslations("navigation");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleSignOut() {
    signOut({ callbackUrl: "/" });
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const initials = userName.charAt(0).toUpperCase();

  const avatar = userImage ? (
    <Image
      src={userImage}
      alt={userName}
      width={32}
      height={32}
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
      {initials}
    </span>
  );

  // Mobile inline mode: render items directly without dropdown
  if (inline) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2 py-1">
          {avatar}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <Link
          href="/profile"
          role="menuitem"
          className="block min-h-[44px] rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors leading-[28px]"
        >
          {tNav("myProfile")}
        </Link>
        <Link
          href="/account"
          role="menuitem"
          className="block min-h-[44px] rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors leading-[28px]"
        >
          {tNav("myAccount")}
        </Link>
        <div className="border-t border-border/40" role="separator" />
        <button
          type="button"
          role="menuitem"
          onClick={handleSignOut}
          className="min-h-[44px] rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  // Desktop dropdown mode
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors hover:bg-accent"
        aria-label={userName}
      >
        {avatar}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-background py-1 shadow-lg"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            className="block w-full min-h-[44px] px-4 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors leading-[28px]"
            onClick={() => setOpen(false)}
          >
            {tNav("myProfile")}
          </Link>
          <Link
            href="/account"
            role="menuitem"
            className="block w-full min-h-[44px] px-4 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors leading-[28px]"
            onClick={() => setOpen(false)}
          >
            {tNav("myAccount")}
          </Link>
          <div className="border-t border-border/40" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full min-h-[44px] px-4 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
