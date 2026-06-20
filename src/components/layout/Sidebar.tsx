"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  BarChart3,
  Tags,
  CreditCard,
  Menu,
  X,
  LogOut,
  Settings,
  Moon,
  Sun,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import EditProfileModal from "@/components/auth/EditProfileModal";

const navItems = [
  { href: "/",             label: "Dashboard",  icon: LayoutDashboard },
  { href: "/wallets",      label: "Dompet",     icon: Wallet },
  { href: "/transactions", label: "Transaksi",  icon: ArrowLeftRight },
  { href: "/paylater",     label: "PayLater",   icon: CreditCard },
  { href: "/sources",      label: "Sumber",     icon: Tags },
  { href: "/investments",  label: "Investasi",  icon: TrendingUp },
  { href: "/reports",      label: "Report",     icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [toggleAnim, setToggleAnim] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleThemeToggle = () => {
    setToggleAnim(true);
    toggleTheme();
    setTimeout(() => setToggleAnim(false), 400);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden"
        id="sidebar-toggle"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "fixed top-0 left-0 z-[70] h-full flex flex-col transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          width: 256,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))",
              }}
            >
              <Wallet size={19} color="var(--on-accent)" />
            </div>
            <div>
              <h1
                className="text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Catatan
              </h1>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Keuangan Pribadi
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--divider)", margin: "0 16px" }} />

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("sidebar-link", isActive && "active")}
                onClick={() => setIsOpen(false)}
                id={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight
                    size={13}
                    style={{ marginLeft: "auto", opacity: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        {user && (
          <div
            className="p-4 flex flex-col gap-3"
            style={{ borderTop: "1px solid var(--divider)" }}
          >
            {/* Theme toggle row */}
            <div className="flex items-center justify-between px-1">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {theme === "dark" ? "Mode Gelap" : "Mode Terang"}
              </span>
              <button
                onClick={handleThemeToggle}
                className="theme-toggle"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
                id="theme-toggle-btn"
              >
                {theme === "dark" ? (
                  <Sun size={15} className={toggleAnim ? "animate-theme-swap" : ""} />
                ) : (
                  <Moon size={15} className={toggleAnim ? "animate-theme-swap" : ""} />
                )}
              </button>
            </div>

            {/* User profile card */}
            <div
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "var(--accent-primary-dim)",
                    border: "1px solid color-mix(in srgb, var(--accent-primary) 32%, transparent)",
                    color: "var(--accent-primary)",
                  }}
                >
                  {(user.user_metadata?.display_name?.[0] || user.email?.[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                    title={user.user_metadata?.display_name || user.email}
                  >
                    {user.user_metadata?.display_name || user.email?.split("@")[0]}
                  </p>
                  <p
                    className="truncate"
                    style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}
                  >
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditProfile(true)}
                className="theme-toggle"
                style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }}
                title="Edit Profil"
                id="edit-profile-btn"
              >
                <Settings size={13} />
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="btn-danger w-full py-2.5 text-xs font-semibold"
              id="logout-btn"
            >
              <LogOut size={13} />
              Keluar
            </button>
          </div>
        )}

        {/* Version */}
        <div className="px-5 pb-4">
          <p
            className="text-center"
            style={{ fontSize: "0.6rem", color: "var(--text-tertiary)" }}
          >
            Catatan Keuangan v1.2
          </p>
        </div>
      </aside>

      {showEditProfile && user && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </>
  );
}
