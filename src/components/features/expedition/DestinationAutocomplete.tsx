"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useTranslations, useLocale } from "next-intl";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DestinationResult {
  displayName: string;
  shortName?: string;
  formattedName?: string;
  lat: number;
  lon: number;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
}

interface DestinationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: DestinationResult) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const SKELETON_COUNT = 3;
const MIN_TOUCH_TARGET_PX = 44;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts an ISO 3166-1 alpha-2 country code to a flag emoji.
 * Each letter is mapped to a regional indicator symbol (U+1F1E6..U+1F1FF).
 */
function countryCodeToFlag(code: string | null): string | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65; // 'A' = 65
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset
  );
}

/** Format selected value for input display: "City, State, Country" (compact, no emoji) */
function formatSelectedValue(result: DestinationResult): string {
  const city = result.city;
  const state = result.state;
  const country = result.country;
  if (city && state && country) return `${city}, ${state}, ${country}`;
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  return result.shortName ?? result.displayName;
}

/** Derive line 1 (city name) and line 2 (state, country) for each result */
function getResultLines(result: DestinationResult): {
  line1: string;
  line2: string;
} {
  if (result.city) {
    const parts = [result.state, result.country].filter(Boolean);
    return { line1: result.city, line2: parts.join(", ") };
  }
  return { line1: result.displayName, line2: result.country ?? "" };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DestinationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled = false,
  id = "destination",
  name = "destination",
}: DestinationAutocompleteProps) {
  const t = useTranslations("expedition.phase1");
  const td = useTranslations("destination");
  const locale = useLocale();

  const [results, setResults] = useState<DestinationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [provider, setProvider] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listboxId = `${id}-listbox`;

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchResults = useCallback(
    async (query: string) => {
      if (query.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setIsOpen(false);
        setHasSearched(false);
        setHasError(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);
      setHasSearched(false);
      setHasError(false);
      try {
        const response = await fetch(
          `/api/destinations/search?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`
        );
        if (response.ok) {
          const data = await response.json();
          const fetchedResults: DestinationResult[] = data.results ?? [];
          setResults(fetchedResults);
          setIsOpen(true);
          setHasSearched(true);
          setActiveIndex(-1);
          setProvider(data.provider ?? null);
        } else {
          setResults([]);
          setIsOpen(true);
          setHasSearched(true);
          setHasError(true);
        }
      } catch {
        setResults([]);
        setIsOpen(true);
        setHasSearched(true);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [locale]
  );

  // ─── Input handlers ─────────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (newValue.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setIsOpen(false);
        setHasSearched(false);
        setHasError(false);
        return;
      }
      debounceRef.current = setTimeout(
        () => fetchResults(newValue),
        DEBOUNCE_MS
      );
    },
    [onChange, fetchResults]
  );

  const handleSelect = useCallback(
    (result: DestinationResult) => {
      onChange(formatSelectedValue(result));
      onSelect?.(result);
      setIsOpen(false);
      setResults([]);
      setHasSearched(false);
      setActiveIndex(-1);
    },
    [onChange, onSelect]
  );

  // ─── Keyboard navigation ───────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            handleSelect(results[activeIndex]);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          inputRef.current?.focus();
          break;
        }
      }
    },
    [isOpen, results, activeIndex, handleSelect]
  );

  // ─── Blur handling ──────────────────────────────────────────────────────

  const handleBlur = useCallback(() => {
    // Delay close to allow click on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  }, []);

  const handleDropdownMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent blur on input when clicking dropdown
      e.preventDefault();
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    },
    []
  );

  // ─── Scroll active item into view ──────────────────────────────────────

  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeItem = listboxRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      );
      activeItem?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ─── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // ─── Derived state ─────────────────────────────────────────────────────

  const showNoResults =
    hasSearched && !isLoading && !hasError && results.length === 0 && value.length >= MIN_QUERY_LENGTH;
  const showError = hasSearched && !isLoading && hasError;
  const showSkeleton = isLoading;
  const showResults = isOpen && results.length > 0;
  const showDropdown = isOpen && (showResults || showNoResults || showError || showSkeleton);
  const showAttribution = provider === "mapbox" && showResults;

  const activeDescendant =
    activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div className="relative" data-testid="destination-autocomplete">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder ?? t("destinationPlaceholder")}
          disabled={disabled}
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          aria-label={td("searchLabel")}
          className="w-full rounded-lg border border-border bg-background text-foreground px-4 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
          data-testid="destination-input"
        />
        {isLoading && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2"
            role="status"
          >
            <div
              className="h-4 w-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-ring"
              aria-hidden="true"
            />
            <span className="sr-only">{td("searching")}</span>
          </div>
        )}
      </div>

      {/* Live region for screen readers */}
      <div aria-live="polite" className="sr-only" data-testid="live-region">
        {showResults && td("resultsCount", { count: results.length })}
        {showNoResults && td("noResults")}
        {showError && td("searchError")}
        {isLoading && td("searching")}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={td("searchLabel")}
          onMouseDown={handleDropdownMouseDown}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-card shadow-lg"
          data-testid="destination-listbox"
        >
          {/* Skeleton loading */}
          {showSkeleton && (
            <div data-testid="skeleton-loading">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ minHeight: `${MIN_TOUCH_TARGET_PX}px` }}
                >
                  <div className="h-6 w-6 rounded-full bg-muted animate-pulse motion-reduce:animate-none" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse motion-reduce:animate-none" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {showResults &&
            results.map((result, index) => {
              const { line1, line2 } = getResultLines(result);
              const flag = countryCodeToFlag(result.countryCode);
              const isActive = index === activeIndex;

              return (
                <div
                  key={`${result.lat}-${result.lon}`}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  data-index={index}
                  onClick={() => handleSelect(result)}
                  className={`cursor-pointer px-4 py-3 text-sm ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  }`}
                  style={{ minHeight: `${MIN_TOUCH_TARGET_PX}px` }}
                  data-testid="destination-option"
                >
                  <div className="flex items-start gap-2">
                    {flag && (
                      <span
                        className="text-base leading-5 shrink-0"
                        aria-hidden="true"
                        data-testid="flag-emoji"
                      >
                        {flag}
                      </span>
                    )}
                    <div className="min-w-0">
                      <span
                        className="block font-semibold text-foreground text-sm truncate"
                        data-testid="result-line1"
                      >
                        {line1}
                      </span>
                      {line2 && (
                        <span
                          className="block text-xs text-muted-foreground truncate"
                          data-testid="result-line2"
                        >
                          {line2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* No results */}
          {showNoResults && (
            <div
              className="px-4 py-3 text-sm text-muted-foreground"
              data-testid="no-results-hint"
            >
              {td("noResults")}
            </div>
          )}

          {/* Error */}
          {showError && (
            <div
              className="px-4 py-3 text-sm text-muted-foreground"
              data-testid="search-error"
            >
              {td("searchError")}
            </div>
          )}

          {/* Mapbox attribution */}
          {showAttribution && (
            <div
              className="px-3 py-1 text-[10px] text-muted-foreground/50"
              data-testid="mapbox-attribution"
            >
              {td("poweredBy")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
