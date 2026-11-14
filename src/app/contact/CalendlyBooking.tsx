"use client";

import { useState } from "react";

const CALENDLY_URL = "https://calendly.com/metanomic";
const WIDGET_SCRIPT = "https://assets.calendly.com/assets/external/widget.js";
const WIDGET_STYLES = "https://assets.calendly.com/assets/external/widget.css";

type CalendlyApi = { initPopupWidget: (options: { url: string }) => void };
type CalendlyWindow = Window & { Calendly?: CalendlyApi };

let widgetPromise: Promise<void> | null = null;

function loadCalendlyWidget(): Promise<void> {
  const calendlyWindow = window as CalendlyWindow;
  if (calendlyWindow.Calendly?.initPopupWidget) return Promise.resolve();
  if (widgetPromise) return widgetPromise;

  widgetPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[data-calendly-widget]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = WIDGET_STYLES;
      stylesheet.dataset.calendlyWidget = "true";
      document.head.appendChild(stylesheet);
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (calendlyWindow.Calendly?.initPopupWidget) resolve();
      else reject(new Error("Calendly's booking widget is unavailable."));
    };
    script.onerror = () => reject(new Error("Calendly's booking widget could not load."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // Allow a new attempt after a network or script failure.
    widgetPromise = null;
    throw error;
  });

  return widgetPromise;
}

export default function CalendlyBooking() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);

  async function openBooking() {
    if (opening) return;
    setOpening(true);
    setError(false);

    try {
      await loadCalendlyWidget();
      (window as CalendlyWindow).Calendly?.initPopupWidget({ url: CALENDLY_URL });
    } catch {
      setError(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="mt-9">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={opening}
          onClick={() => void openBooking()}
          className="button button-primary min-h-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a] disabled:cursor-wait disabled:opacity-70"
        >
          {opening ? "Opening scheduler…" : "Schedule a Conversation"}
          {!opening && <span aria-hidden="true">↗</span>}
        </button>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#c9ec8a] underline underline-offset-4 hover:text-[#e5f9c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
        >
          Open Calendly instead <span aria-hidden="true">↗</span>
        </a>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#f2d2af]">
          The scheduler could not open. Please use the Calendly link above to book directly.
        </p>
      )}
      <p className="mt-5 max-w-[640px] text-xs leading-6 text-[#b9cac4]">
        Booking opens in a popup without leaving this page. Scheduling information is processed by Calendly.
      </p>
    </div>
  );
}
