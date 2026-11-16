type SummaryQuestion = { name: string; position: number; required: boolean };
export function summaryQuestion(questions: unknown): SummaryQuestion | null {
  if (!Array.isArray(questions)) return null;
  for (const value of questions) {
    if (!value || typeof value !== "object" || value.enabled === false) continue;
    if (!["text", "string"].includes(value.type) || typeof value.name !== "string") continue;
    if (!/conversation summary|what would you like to discuss|please share anything that will help prepare for our meeting/i.test(value.name)) continue;
    if (!Number.isInteger(value.position) || value.position < 0) continue;
    return { name: value.name, position: value.position, required: value.required === true };
  }
  return null;
}

// Calendly availability and visitor-confirmed scheduling. Credentials never leave the server.
// Only the separately confirmed booking endpoint can create invitees.

const API = "https://api.calendly.com";
const PROFILE_URL = "https://calendly.com/metanomic";
const MAX_DAYS = 28;
const MAX_LOOKAHEAD_DAYS = 180;

export type AvailableSlot = {
  startTime: string;
  label: string;
  bookingUrl: string;
};

export type EventType = {
  uri: string;
  name: string;
  scheduling_url?: string;
  locations?: unknown;
  custom_questions?: unknown;
  kind?: string;
  pooling_type?: string;
  booking_method?: string;
  is_paid?: boolean;
};

export type AvailabilityRequest = {
  startDate?: unknown;
  endDate?: unknown;
  timeZone?: unknown;
  timeOfDay?: unknown;
  eventTypeName?: unknown;
  limit?: unknown;
  after?: unknown;
  eventTypeUri?: unknown;
};

export type AvailabilityResult = {
  status: "available" | "no_slots" | "not_configured" | "choose_event" | "invalid_request" | "unavailable";
  message: string;
  bookingUrl: string;
  timeZone?: string;
  eventType?: string;
  eventTypeUri?: string;
  directBookingSupported?: boolean;
  directBookingReason?: string;
  slots?: AvailableSlot[];
  hasMore?: boolean;
  query?: { startDate: string; endDate: string; timeZone: string; timeOfDay: string; eventTypeUri: string };
  eventTypes?: Array<{ name: string; bookingUrl: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function safeBookingUrl(candidate: unknown): string | null {
  if (typeof candidate !== "string") return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && ["calendly.com", "www.calendly.com"].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(day + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

function localDay(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const take = (key: string) => parts.find(part => part.type === key)?.value || "";
  return take("year") + "-" + take("month") + "-" + take("day");
}

export function validTimeZone(value: unknown): string | null {
  const timeZone = typeof value === "string" ? value.trim() : "America/New_York";
  if (timeZone.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return null;
  }
}

function addDays(day: string, number: number): string {
  return new Date(Date.parse(day + "T00:00:00.000Z") + number * 86_400_000)
    .toISOString().slice(0, 10);
}

async function requestCalendly(path: string, token: string): Promise<Record<string, unknown>> {
  const response = await fetch(API + path, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("calendly_http_" + response.status);
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("calendly_invalid_response");
  return payload;
}

export async function findEventTypes(token: string): Promise<EventType[]> {
  const userResult = await requestCalendly("/users/me", token);
  const user = isRecord(userResult.resource) ? userResult.resource : {};
  if (typeof user.uri !== "string" || !user.uri.startsWith(API + "/users/")) {
    throw new Error("calendly_user_not_found");
  }

  const events: EventType[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      user: user.uri, active: "true", count: "100",
      ...(cursor ? { page_token: cursor } : {}),
    });
    const data = await requestCalendly("/event_types?" + params, token);
    if (!Array.isArray(data.collection)) throw new Error("calendly_events_invalid");
    for (const entry of data.collection) {
      if (!isRecord(entry) || typeof entry.uri !== "string" ||
          typeof entry.name !== "string") continue;
      if (!/^https:\/\/api\.calendly\.com\/event_types\/[A-Za-z0-9-]+$/.test(entry.uri)) continue;
      events.push({
        uri: entry.uri,
        name: entry.name.slice(0, 120),
        scheduling_url: safeBookingUrl(entry.scheduling_url) || undefined,
        locations: entry.locations,
        custom_questions: entry.custom_questions,
        kind: typeof entry.kind === "string" ? entry.kind : undefined,
        pooling_type: typeof entry.pooling_type === "string" ? entry.pooling_type : undefined,
        booking_method: typeof entry.booking_method === "string" ? entry.booking_method : undefined,
        is_paid: entry.is_paid === true,
      });
    }
    const pagination = isRecord(data.pagination) ? data.pagination : {};
    cursor = typeof pagination.next_page_token === "string" && pagination.next_page_token
      ? pagination.next_page_token
      : null;
    if (!cursor) break;
  }
  return events;
}

// The UI and write endpoint share the same eligibility rules. Complex event
// types remain bookable through Calendly's hosted booking page.
export function directBookingEligibility(event: EventType): {
  supported: boolean;
  reason?: string;
  location?: { kind: string };
} {
  if (event.is_paid || (event.kind && event.kind !== "solo") ||
      (event.booking_method && event.booking_method !== "instant")) {
    return { supported: false, reason: "This meeting type requires Calendly's booking process." };
  }

  if (Array.isArray(event.custom_questions) && event.custom_questions.some(value => {
    const question = isRecord(value) ? value : {};
    return question.required === true && question.enabled !== false && question.name !== summaryQuestion(event.custom_questions)?.name;
  })) {
    return { supported: false, reason: "Additional required questions must be answered on Calendly." };
  }

  if (event.pooling_type === "round_robin") return { supported: true };
  const locations = Array.isArray(event.locations) ? event.locations : [];
  if (locations.length > 1) {
    return { supported: false, reason: "Choose a meeting location on Calendly." };
  }
  if (locations.length === 1) {
    const location = isRecord(locations[0]) ? locations[0] : {};
    const kind = location.kind;
    const simpleKinds = [
      "zoom_conference", "google_conference", "microsoft_teams_conference",
      "webex_conference", "gotomeeting_conference",
    ];
    if (typeof kind !== "string" || !simpleKinds.includes(kind)) {
      return { supported: false, reason: "This meeting location needs additional details on Calendly." };
    }
    return { supported: true, location: { kind } };
  }
  return { supported: true };
}

function chooseEvent(events: EventType[], requestName: unknown): EventType | null {
  const selectedUri = process.env.CALENDLY_EVENT_TYPE_URI?.trim();
  const configuredName = process.env.CALENDLY_EVENT_TYPE_NAME?.trim();
  if (selectedUri) return events.find(event => event.uri === selectedUri) || null;

  const name = typeof requestName === "string" && requestName.length <= 120
    ? requestName.trim().toLowerCase()
    : configuredName?.toLowerCase();
  if (name) {
    const exact = events.filter(event => event.name.toLowerCase() === name);
    if (exact.length === 1) return exact[0];
    const partial = events.filter(event => event.name.toLowerCase().includes(name));
    return partial.length === 1 ? partial[0] : null;
  }

  if (events.length === 1) return events[0];
  // Prefer a single clearly named discovery/consultation appointment.
  const consultations = events.filter(event => /consult|discovery|introduct|strategy call/i.test(event.name));
  return consultations.length === 1 ? consultations[0] : null;
}

function displaySlot(date: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone, weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}

function localHour(date: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find(part => part.type === "hour")?.value ?? "-1");
}

function inPeriod(hour: number, period: string): boolean {
  if (period === "morning") return hour >= 5 && hour < 12;
  if (period === "afternoon") return hour >= 12 && hour < 18;
  if (period === "evening") return hour >= 18 && hour < 23;
  return true;
}

export async function checkCalendlyAvailability(input: AvailabilityRequest): Promise<AvailabilityResult> {
  const base = { bookingUrl: PROFILE_URL };
  const token = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN?.trim();
  if (!token) return {
    ...base,
    status: "not_configured",
    message: "Live Calendly availability is not connected yet. Visitors can still book directly on Calendly.",
  };

  const zone = validTimeZone(input.timeZone);
  if (!zone) return { ...base, status: "invalid_request", message: "Please provide a valid IANA time zone." };

  const now = new Date();
  const today = localDay(now, zone);
  const startDate = input.startDate ?? today;
  if (!validDay(startDate)) {
    return { ...base, status: "invalid_request", message: "Please use a valid start date in YYYY-MM-DD format." };
  }
  const endDate = input.endDate ?? addDays(startDate, 6);
  const period = input.timeOfDay ?? "any";

  if (!validDay(endDate) ||
      !["any", "morning", "afternoon", "evening"].includes(String(period))) {
    return { ...base, status: "invalid_request", message: "Please use YYYY-MM-DD dates and a valid time-of-day preference." };
  }

  const startMs = Date.parse(startDate + "T00:00:00.000Z");
  const endMs = Date.parse(endDate + "T00:00:00.000Z");
  const spanDays = Math.round((endMs - startMs) / 86_400_000) + 1;
  if (spanDays < 1 || spanDays > MAX_DAYS ||
      endMs < Date.parse(today + "T00:00:00.000Z") ||
      startMs > Date.parse(today + "T00:00:00.000Z") + MAX_LOOKAHEAD_DAYS * 86_400_000) {
    return { ...base, status: "invalid_request", message: "Select a future date window of up to 28 days, within the next six months." };
  }

  const limit = typeof input.limit === "number" && Number.isFinite(input.limit)
    ? Math.max(1, Math.min(6, Math.floor(input.limit)))
    : 6;
  const after = input.after;
  if (after !== undefined && (typeof after !== "string" || !Number.isFinite(Date.parse(after)))) {
    return { ...base, status: "invalid_request", message: "Please refresh the available times." };
  }
  try {
    const events = await findEventTypes(token);
    if (events.length === 0) {
      return { ...base, status: "unavailable", message: "No active Calendly meeting types were found. Please book from the Calendly page." };
    }
    const chosen = input.eventTypeUri
      ? events.find(event => event.uri === input.eventTypeUri) || null
      : chooseEvent(events, input.eventTypeName);
    if (!chosen) {
      const name = typeof input.eventTypeName === "string" ? input.eventTypeName : "";
      return {
        ...base,
        status: "choose_event",
        message: name
          ? "I couldn't find a unique active meeting type matching that name. Ask which meeting type to use."
          : "More than one meeting type is available. Ask the visitor which one they want.",
        eventTypes: events.slice(0, 8).map(event => ({
          name: event.name,
          bookingUrl: event.scheduling_url || PROFILE_URL,
        })),
      };
    }

    const bookingUrl = chosen.scheduling_url || PROFILE_URL;
    const eligibility = directBookingEligibility(chosen);
    // The API requires UTC bounds; pad for IANA time-zone offsets and filter locally.
    const queryStart = new Date(Math.max(Date.now() + 60_000, startMs - 86_400_000));
    const queryEnd = new Date(endMs + 2 * 86_400_000);
    if (queryEnd <= queryStart || queryEnd.getTime() - queryStart.getTime() > 31 * 86_400_000) {
      return { ...base, status: "invalid_request", message: "That date window is not supported. Please choose a shorter range." };
    }
    const params = new URLSearchParams({
      event_type: chosen.uri, start_time: queryStart.toISOString(),
      end_time: queryEnd.toISOString(),
    });
    const response = await requestCalendly("/event_type_available_times?" + params, token);
    if (!Array.isArray(response.collection)) throw new Error("calendly_slots_invalid");

    const matching = response.collection
      .filter(isRecord)
      .filter(item => item.status === "available" && typeof item.start_time === "string")
      .map(item => {
        const time = new Date(item.start_time as string);
        return { time, bookingUrl: safeBookingUrl(item.scheduling_url) || bookingUrl };
      })
      .filter(item => Number.isFinite(item.time.getTime()) && item.time.getTime() > Date.now())
      .filter(item => {
        const day = localDay(item.time, zone);
        return day >= startDate && day <= endDate && inPeriod(localHour(item.time, zone), String(period));
      })
      .filter(item => !after || item.time.getTime() > Date.parse(after as string))
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .filter((item, index, all) => index === 0 || item.time.getTime() !== all[index - 1].time.getTime());
    const slots: AvailableSlot[] = matching.slice(0, limit)
      .map(item => ({
        startTime: item.time.toISOString(),
        label: displaySlot(item.time, zone),
        bookingUrl: item.bookingUrl,
      }));

    return {
      status: slots.length ? "available" : "no_slots",
      message: slots.length
        ? "These are currently available Calendly appointments. Times are not reserved and can change until booked."
        : "Calendly returned no available times in the requested window. Try a wider date range or use the booking page.",
      eventType: chosen.name,
      eventTypeUri: chosen.uri,
      directBookingSupported: eligibility.supported,
      directBookingReason: eligibility.reason,
      timeZone: zone,
      bookingUrl,
      slots,
      hasMore: matching.length > limit,
      query: { startDate, endDate, timeZone: zone, timeOfDay: String(period), eventTypeUri: chosen.uri },
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    console.error("Calendly read-only availability lookup failed:", code);
    return { ...base, status: "unavailable", message: "Calendly availability could not be checked right now. Please use the booking page." };
  }
}
