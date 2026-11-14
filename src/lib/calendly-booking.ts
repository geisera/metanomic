// Booking is invoked only by the dedicated, visitor-confirmed API route.
// Never expose the Calendly access token or call POST /invitees from the model.

import { findEventTypes, safeBookingUrl, validTimeZone } from "./calendly";

const API = "https://api.calendly.com";
const FALLBACK_URL = "https://calendly.com/metanomic";
const EVENT_URI = /^https:\/\/api\.calendly\.com\/event_types\/[A-Za-z0-9-]+$/;
const DIRECT_LOCATION_KINDS = new Set([
  "zoom_conference", "google_conference", "microsoft_teams_conference",
  "webex_conference", "gotomeeting_conference", "inbound_call",
]);

export type BookingRequest = {
  eventTypeUri: string;
  startTime: string;
  name: string;
  email: string;
  timeZone: string;
};

export type BookingOutcome = {
  status: "confirmed" | "not_available" | "unsupported" | "not_configured" | "auth_error" | "error" | "uncertain";
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

export async function createCalendlyBooking(input: BookingRequest): Promise<BookingOutcome> {
  const token = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN?.trim();
  if (!token) return result("not_configured", "Direct booking is unavailable. Please use Calendly instead.");

  try {
    // Check that the event type belongs to this account, is still active,
    // and can be booked without unsupported payment, location or question inputs.
    const events = await findEventTypes(token);
    const event = events.find(entry => entry.uri === input.eventTypeUri);
    if (!event) return result("unsupported", "This meeting type is no longer bookable here. Please open Calendly.");

    const bookingUrl = event.scheduling_url || FALLBACK_URL;
    if (event.is_paid || (event.booking_method && event.booking_method !== "instant")) {
      return result("unsupported", "This meeting type requires Calendly's booking process.", bookingUrl);
    }

    const requiredQuestions = Array.isArray(event.custom_questions) && event.custom_questions.some(question => {
      const item = record(question);
      return item?.enabled === true && item.required === true;
    });
    if (requiredQuestions) {
      return result("unsupported", "This meeting type has additional required questions. Please complete booking on Calendly.", bookingUrl);
    }

    const options = Array.isArray(event.locations) ? event.locations : [];
    let location: { kind: string } | undefined;
    if (event.pooling_type !== "round_robin") {
      if (options.length > 1) {
        return result("unsupported", "This meeting offers multiple locations. Please choose one on Calendly.", bookingUrl);
      }
      if (options.length === 1) {
        const option = record(options[0]);
        const kind = option?.kind;
        if (typeof kind !== "string" || !DIRECT_LOCATION_KINDS.has(kind)) {
          return result("unsupported", "This meeting requires a location choice or additional contact information. Please use Calendly.", bookingUrl);
        }
        location = { kind };
      }
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
        ...(location ? { location } : {}),
        tracking: { utm_source: "metanomic_theia" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (response.status === 401 || response.status === 403) {
      return result("auth_error", "Calendly didn't authorize direct booking. Check the API token's scheduled_events:write access or book on Calendly.", bookingUrl);
    }
    if ([400, 404, 409, 422].includes(response.status)) {
      return result("not_available", "Calendly couldn't confirm this booking. The time or meeting requirements may have changed. Please book on Calendly.", bookingUrl);
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
    // A timeout after POST may mean Calendly succeeded. Do not retry automatically.
    console.error("Calendly booking request did not complete.");
    return result("uncertain", "Booking confirmation could not be verified. Check your email before attempting another booking.");
  }
}
