// Booking is invoked only by the dedicated, visitor-confirmed API route.
// Never expose the Calendly access token or call POST /invitees from the model.

import { directBookingEligibility, findEventTypes, safeBookingUrl, validTimeZone } from "./calendly";

const API = "https://api.calendly.com";
const FALLBACK_URL = "https://calendly.com/metanomic";
const EVENT_URI = /^https:\/\/api\.calendly\.com\/event_types\/[A-Za-z0-9-]+$/;
export type BookingRequest = {
  eventTypeUri: string;
  startTime: string;
  name: string;
  email: string;
  timeZone: string;
  website?: unknown;
  turnstileToken?: unknown;
};

export type BookingOutcome = {
  status: "confirmed" | "not_available" | "unsupported" | "not_configured" | "auth_error" | "error" | "uncertain" | "duplicate";
  message: string;
  bookingUrl?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  eventType?: string;
  startTime?: string;
  timeZone?: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function result(status: BookingOutcome["status"], message: string, bookingUrl = FALLBACK_URL): BookingOutcome {
  return { status, message, bookingUrl };
}

function validEventTime(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms >= Date.now() + 5 * 60_000 && ms <= Date.now() + 180 * 86_400_000;
}

export function validBookingRequest(value: unknown): value is BookingRequest {
  const data = record(value);
  if (!data) return false;
  const name = data.name;
  const email = data.email;
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 100 && !/[\r\n<>]/.test(name) &&
    typeof email === "string" && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n<>]/.test(email) &&
    typeof data.eventTypeUri === "string" && EVENT_URI.test(data.eventTypeUri) &&
    typeof data.startTime === "string" && validEventTime(data.startTime) &&
    typeof data.timeZone === "string" && data.timeZone.length <= 64 &&
    validTimeZone(data.timeZone) === data.timeZone;
}

// Calendly's validation error includes structured codes and fields. Keep
// diagnostics limited to identifiers; never log an invitee name, email,
// raw provider message, body, or API credentials.
async function bookingErrorDetail(response: Response): Promise<{ code: string; parameter?: string; requestId?: string }> {
  let code = "http_" + response.status;
  let parameter: string | undefined;
  try {
    const body: unknown = await response.json();
    const error = record(body);
    const details = Array.isArray(error?.details) ? error.details : [];
    for (const detail of details) {
      const item = record(detail);
      if (typeof item?.code === "string" && /^[a-z0-9_]{1,72}$/.test(item.code)) {
        code = item.code;
        if (typeof item.parameter === "string" && /^[a-zA-Z0-9_.]{1,96}$/.test(item.parameter)) {
          parameter = item.parameter;
        }
        break;
      }
    }
  } catch {
    // Malformed error response; the HTTP status is still actionable.
  }
  const rawId = response.headers.get("x-request-id");
  const requestId = rawId && /^[a-zA-Z0-9-]{8,80}$/.test(rawId) ? rawId : undefined;
  console.error("Calendly booking rejected", { status: response.status, code, parameter, requestId });
  return { code, parameter, requestId };
}

export async function createCalendlyBooking(input: BookingRequest): Promise<BookingOutcome> {
  const token = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN?.trim();
  if (!token) return result("not_configured", "Direct booking is unavailable. Please use Calendly instead.");

  let bookingSubmitted = false;
  try {
    // Check that the event type belongs to this account, is still active,
    // and can be booked without unsupported payment, location or question inputs.
    const events = await findEventTypes(token);
    const event = events.find(entry => entry.uri === input.eventTypeUri);
    if (!event) return result("unsupported", "This meeting type is no longer bookable here. Please open Calendly.");

    const bookingUrl = event.scheduling_url || FALLBACK_URL;
    const eligibility = directBookingEligibility(event);
    if (!eligibility.supported) {
      return result("unsupported", eligibility.reason || "Use Calendly to book this meeting.", bookingUrl);
    }

    // A displayed slot is not a reservation. Recheck the exact start time
    // before submitting; Calendly remains authoritative for concurrency.
    const selectedTime = new Date(input.startTime);
    const queryStart = new Date(Math.max(Date.now() + 60_000, selectedTime.getTime() - 60_000));
    const queryEnd = new Date(selectedTime.getTime() + 2 * 60_000);
    if (queryStart >= queryEnd) {
      return result("not_available", "That time has passed. Please select another appointment.", bookingUrl);
    }
    const params = new URLSearchParams({
      event_type: event.uri,
      start_time: queryStart.toISOString(),
      end_time: queryEnd.toISOString(),
    });
    const availableReply = await fetch(API + "/event_type_available_times?" + params, {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!availableReply.ok) {
      if ([401, 403].includes(availableReply.status)) return result("auth_error", "Calendly access needs to be updated. Please use the external booking page.", bookingUrl);
      return result("error", "We couldn't verify this appointment. Please try again or book on Calendly.", bookingUrl);
    }
    const available = record(await availableReply.json());
    const slots = Array.isArray(available?.collection) ? available.collection : [];
    const stillAvailable = slots.some(slot => {
      const item = record(slot);
      return item?.status === "available" && typeof item.start_time === "string" &&
        Date.parse(item.start_time) === selectedTime.getTime();
    });
    if (!stillAvailable) return result("not_available", "This appointment is no longer available. Please select another time.", bookingUrl);

    bookingSubmitted = true;
    const response = await fetch(API + "/invitees", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: event.uri,
        start_time: selectedTime.toISOString(),
        invitee: {
          name: input.name.trim(),
          email: input.email.trim(),
          timezone: input.timeZone,
        },
        ...(eligibility.location ? { location: eligibility.location } : {}),
        tracking: { utm_source: "metanomic_theia" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (response.status === 401 || response.status === 403) {
      return result("auth_error", "Calendly didn't authorize direct booking. Check the API token's scheduled_events:write access or book on Calendly.", bookingUrl);
    }
    if ([400, 404, 409, 422].includes(response.status)) {
      const detail = await bookingErrorDetail(response);
      const reference = detail.requestId ? " Reference: " + detail.requestId + "." : "";
      if (response.status === 404 || response.status === 409) {
        return result("not_available", "Calendly no longer offers this time. Please choose another slot." + reference, bookingUrl);
      }
      const locationProblem = /location/i.test(detail.parameter || "") ||
        /location/.test(detail.code);
      const questionsProblem = /question/.test(detail.code) ||
        /question/i.test(detail.parameter || "");
      const reason = locationProblem
        ? "This meeting's location configuration requires booking on Calendly."
        : questionsProblem
          ? "This event requires additional responses on Calendly."
          : "Calendly rejected the booking details (HTTP " + response.status +
            ", code: " + detail.code + "). Please use the hosted booking link.";
      return result("unsupported", reason + reference, bookingUrl);
    }
    if (response.status === 429) {
      return result("error", "Calendly's booking limit has been reached. Please use the Calendly link or try again later.", bookingUrl);
    }
    if (!response.ok) {
      // For unexpected upstream responses, never assert that no invitee was created.
      console.error("Calendly booking request returned status", response.status);
      return result("uncertain", "We couldn't confirm whether Calendly completed the booking. Check your email before trying again.", bookingUrl);
    }

    const responseBody = record(await response.json());
    const invitee = record(responseBody?.resource);
    if (!invitee || invitee.status !== "active") {
      return result("uncertain", "Calendly responded, but confirmation details were unavailable. Check your email before trying again.", bookingUrl);
    }
    return {
      status: "confirmed",
      message: "Calendly confirmed your appointment. An invitation will be sent to your email.",
      bookingUrl,
      cancelUrl: safeBookingUrl(invitee.cancel_url) || undefined,
      rescheduleUrl: safeBookingUrl(invitee.reschedule_url) || undefined,
      eventType: event.name,
      startTime: selectedTime.toISOString(),
      timeZone: input.timeZone,
    };
  } catch {
    // A timeout after POST may mean Calendly succeeded. Never retry it automatically.
    console.error("Calendly booking check or request did not complete.");
    return bookingSubmitted
      ? result("uncertain", "Booking confirmation could not be verified. Check your email before attempting another booking.")
      : result("error", "Calendly availability could not be checked. Please use the booking page.");
  }
}
