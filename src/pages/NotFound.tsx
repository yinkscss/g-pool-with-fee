import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { NAV } from "../components/Layout";

/** Nothing at this address: a plain way back into the app. */
export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found · Kolo Circle";
  }, []);

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="font-display text-5xl font-semibold text-accent">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">This page is not in the circle</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The link you followed does not point anywhere. Try one of these instead.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {NAV.map((item) => (
          <Link key={item.to} to={item.to}>
            <Button variant={item.to === "/" ? "accent" : "outline"} size="sm">
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
