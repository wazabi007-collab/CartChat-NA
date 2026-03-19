"use client";

import { useState, useCallback } from "react";
import { inputBase, focusGreen, focusBrand, label, helperText } from "@/lib/ui";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  id?: string;
  required?: boolean;
  /** "brand" for auth pages (blue), "green" for dashboard/checkout */
  variant?: "brand" | "green";
  /** Helper text below the input */
  hint?: string;
  /** Error message */
  error?: string;
  /** Status indicator below input */
  status?: React.ReactNode;
  labelText?: string;
}

/**
 * Smart phone input for Namibian numbers.
 * Auto-formats to +264 prefix, accepts local formats (081...), and shows
 * real-time format guidance to reduce input friction.
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  id = "phone",
  required = false,
  variant = "green",
  hint,
  error,
  status,
  labelText = "WhatsApp Number",
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  const focus = variant === "brand" ? focusBrand : focusGreen;

  const formatHint = useCallback(() => {
    const v = value.replace(/\s/g, "");
    if (!v) return null;

    // Already correct format
    if (/^\+264\d{8,9}$/.test(v)) return null;

    // Starts with 0 — local format
    if (/^0\d{9}$/.test(v)) {
      return (
        <span className="text-green-600">
          Will be saved as +264{v.slice(1)}
        </span>
      );
    }

    // Starts with 264 without +
    if (/^264\d{8,9}$/.test(v)) {
      return (
        <span className="text-green-600">
          Will be saved as +{v}
        </span>
      );
    }

    // International (non-Namibian) — preserve as-is
    if (/^\+\d{10,15}$/.test(v) && !v.startsWith("+264")) {
      return (
        <span className="text-gray-500">
          International number — will be saved as entered
        </span>
      );
    }

    // Too short or unclear
    if (v.length >= 3 && v.length < 9) {
      return (
        <span className="text-gray-400">
          Keep typing... e.g. 081 234 5678
        </span>
      );
    }

    return null;
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className={label}>
        {labelText}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e.target.value);
          }}
          required={required}
          placeholder="081 234 5678"
          className={`${inputBase} ${focus} ${error ? "border-red-300" : ""}`}
        />
      </div>
      {/* Error takes priority, then status, then format hint, then static hint */}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : status ? (
        <div className="mt-1">{status}</div>
      ) : focused || value.length > 2 ? (
        <p className="text-xs mt-1">
          {formatHint() || (hint && <span className="text-gray-500">{hint}</span>)}
        </p>
      ) : hint ? (
        <p className={helperText}>{hint}</p>
      ) : null}
    </div>
  );
}
