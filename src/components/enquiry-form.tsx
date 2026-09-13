"use client";

import { useId, useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * In-page enquiry form. Posts to a serverless route rather than relying on
 * mailto:, which silently does nothing for anyone without a configured mail
 * client. The SKU rides along as a hidden field when the form is opened from a
 * stone.
 */
export function EnquiryForm({
  sku,
  defaultMessage,
  compact = false,
}: {
  sku?: string;
  defaultMessage?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!String(data.email || "").trim() && !String(data.phone || "").trim()) {
      setStatus("error");
      setError("Please leave either an email address or a phone number.");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "That did not go through.");
      }
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "That did not go through.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-[22px] border border-hairline bg-panel p-6"
      >
        <h3 className="font-display text-2xl">Enquiry received</h3>
        <p className="measure mt-2 text-[15px] text-ink-muted-panel">
          {sku
            ? `We have your interest in ${sku} and will come back to you with full details and availability.`
            : "We will come back to you shortly."}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-5 rounded-full border border-ink px-6 py-2.5 text-[14px] transition-colors duration-200 hover:bg-ink hover:text-white"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {sku ? <input type="hidden" name="sku" value={sku} /> : null}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <Field id={`${id}-name`} name="name" label="Name" required autoComplete="name" />
        <Field
          id={`${id}-email`}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
      </div>

      <Field id={`${id}-phone`} name="phone" label="Phone or WhatsApp" autoComplete="tel" />

      <div>
        <label htmlFor={`${id}-message`} className="block text-[13px] text-ink-muted">
          Message
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={compact ? 3 : 5}
          defaultValue={defaultMessage}
          className="mt-1.5 w-full rounded-[12px] border border-hairline bg-porcelain px-3.5 py-2.5 text-[15px] transition-colors duration-200 placeholder:text-ink-muted focus:border-ink"
          placeholder={
            sku
              ? "Anything specific you would like to know about this stone?"
              : "Shape, carat range, colour and clarity you are looking for."
          }
        />
      </div>

      {status === "error" && error ? (
        <p role="alert" className="text-[14px] text-ink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-ink px-7 py-3 text-[15px] text-white transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
      >
        {status === "sending" ? "Sending" : "Send enquiry"}
      </button>

      <p className="text-[12px] text-ink-muted">
        We use your details to answer this enquiry and nothing else.
      </p>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required = false,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] text-ink-muted">
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-[12px] border border-hairline bg-porcelain px-3.5 py-2.5 text-[15px] transition-colors duration-200 focus:border-ink"
      />
    </div>
  );
}
