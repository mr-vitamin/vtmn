import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { IntroBoundary } from "@/components/vtmn/IntroBoundary";

// Creating the lazy component does not request its bundle. Only eligible entry
// visits render it; mobile, reduced motion and deep links never import Three.
const IntroScene = lazy(() => import("@/components/vtmn/IntroScene"));
const desktopQuery = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
const motionQuery = "(prefers-reduced-motion: reduce)";
const documentEntryPath = typeof window === "undefined" ? null : window.location.pathname;
type Phase = "boot" | "intro" | "transition" | "home";

function hasWebGL() {
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
function Loading({ onTimeout }: { onTimeout: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onTimeout, 12000);
    return () => window.clearTimeout(timer);
  }, [onTimeout]);
  return (
    <div className="vtmn-electric-loading" role="status">
      <span className="sr-only">Preparing VTMN introduction</span>
    </div>
  );
}

export function Entrance({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() =>
    pathname === "/" && (documentEntryPath === null || documentEntryPath === "/") ? "boot" : "home",
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const content = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const didPlay = useRef(false);
  const playing = pathname === "/" && (phase === "intro" || phase === "transition");
  const finish = useCallback(() => {
    if (phaseRef.current === "home") return;
    phaseRef.current = "home";
    setPhase("home");
  }, []);
  const transition = useCallback(() => {
    if (phaseRef.current !== "intro") return;
    phaseRef.current = "transition";
    setPhase("transition");
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      finish();
      return;
    }
    if (phaseRef.current === "home") return;
    const desktop = window.matchMedia(desktopQuery);
    const motion = window.matchMedia(motionQuery);
    const eligible = () =>
      desktop.matches && !motion.matches && window.location.hash !== "#vtmn-content";
    if (phaseRef.current === "boot") {
      if (!eligible() || !hasWebGL()) {
        finish();
        return;
      }
      phaseRef.current = "intro";
      setPhase("intro");
    }
    const changed = () => {
      if (!eligible()) finish();
    };
    desktop.addEventListener("change", changed);
    motion.addEventListener("change", changed);
    return () => {
      desktop.removeEventListener("change", changed);
      motion.removeEventListener("change", changed);
    };
  }, [pathname, playing, finish]);

  useLayoutEffect(() => {
    if (!playing) {
      if (didPlay.current && pathname === "/") {
        const heading = content.current?.querySelector<HTMLElement>("main h1");
        if (heading) {
          const previous = heading.getAttribute("tabindex");
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
          if (previous === null) heading.removeAttribute("tabindex");
          else heading.setAttribute("tabindex", previous);
        }
      }
      return;
    }
    didPlay.current = true;
    const { body, documentElement } = document;
    const overflow = body.style.overflow,
      padding = body.style.paddingRight;
    const gutter =
      documentElement.clientWidth > 0 ? window.innerWidth - documentElement.clientWidth : 0;
    if (gutter > 0)
      body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    body.style.overflow = "hidden";
    skip.current?.focus({ preventScroll: true });
    return () => {
      body.style.overflow = overflow;
      body.style.paddingRight = padding;
    };
  }, [playing, pathname]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
    } else if (event.key === "Tab") {
      event.preventDefault();
      skip.current?.focus();
    }
  };
  return (
    <>
      <noscript>
        <style>{".vtmn-electric-boot{display:none!important}"}</style>
      </noscript>
      <div id="vtmn-content" ref={content} inert={playing ? true : undefined}>
        {children}
      </div>
      {phase === "boot" && pathname === "/" && (
        <div className="vtmn-electric-boot" aria-hidden="true" />
      )}
      {playing && (
        <div
          className="vtmn-electric-entrance"
          role="dialog"
          aria-modal="true"
          aria-label="VTMN entrance"
          onKeyDown={onKeyDown}
        >
          <div aria-hidden="true">
            <IntroBoundary onError={finish}>
              <Suspense fallback={<Loading onTimeout={finish} />}>
                <IntroScene
                  fading={phase === "transition"}
                  onTransition={transition}
                  onEnd={finish}
                />
              </Suspense>
            </IntroBoundary>
          </div>
          <Button
            ref={skip}
            type="button"
            variant="outline"
            size="sm"
            className="vtmn-electric-skip"
            data-entrance-skip
            onClick={finish}
          >
            Skip Intro
          </Button>
        </div>
      )}
    </>
  );
}
