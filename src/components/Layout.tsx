import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, PiggyBank } from "lucide-react";
import { ConnectButton } from "./ConnectButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { cn } from "../lib/utils";

export const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/pool", label: "Pool" },
  { to: "/members", label: "Members" },
  { to: "/journal", label: "Journal" },
  { to: "/about", label: "About" },
];

/** The shell around every page: a sticky top bar with the app mark, nav and wallet button. */
export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
              <PiggyBank className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">Kolo Circle</span>
              <span className="block text-[11px] text-muted-foreground">G$ savings pool · Celo</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <div className="hidden sm:block">
              <ConnectButton />
            </div>
            <button
              type="button"
              aria-label="Menu"
              className="grid size-9 place-items-center rounded-md text-foreground hover:bg-muted md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Kolo Circle</SheetTitle>
            <SheetDescription>Save G$ with your circle on Celo.</SheetDescription>
          </SheetHeader>
          <nav className="mt-4 flex flex-col">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "border-b border-border py-3 text-sm transition-colors",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-5">
            <ConnectButton />
          </div>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs leading-relaxed text-muted-foreground sm:px-6">
        Kolo Circle saves in G$ (GoodDollar) on Celo mainnet. Every deposit and withdrawal is a transaction your wallet
        signs, so the pool keeps no keys of yours. Member profiles and the private journal are saved off chain.
      </footer>
    </div>
  );
}
