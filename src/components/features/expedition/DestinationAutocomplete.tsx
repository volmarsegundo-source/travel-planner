"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Command } from "cmdk";
import * as Popover from "@radix-ui/react-popover";

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(false);
    try {
      const response = await fetch(
        `/api/destinations/search?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`
      );
      if (response.ok) {
        const data = await response.json();
        const fetchedResults = data.results ?? [];
        setResults(fetchedResults);
        setIsOpen(fetchedResults.length > 0);
        setHasSearched(true);
      }
    } catch {
      setResults([]);
      setIsOpen(false);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchResults(newValue), 400);
    },
    [onChange, fetchResults]
  );

  /** Format selected value for input display: "City, Country" (compact) */
  function formatSelectedValue(result: DestinationResult): string {
    const city = result.city;
    const country = result.country;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    return result.shortName ?? result.displayName;
  }

  /** Derive line 1 (city name) and line 2 (state, country) for each result */
  function getResultLines(result: DestinationResult): { line1: string; line2: string } {
    if (result.city) {
      const parts = [result.state, result.country].filter(Boolean);
      return { line1: result.city, line2: parts.join(", ") };
    }
    return { line1: result.displayName, line2: result.country ?? "" };
  }

  const handleSelect = useCallback(
    (result: DestinationResult) => {
      onChange(formatSelectedValue(result));
      onSelect?.(result);
      setIsOpen(false);
      setResults([]);
      setHasSearched(false);
    },
    [onChange, onSelect]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showNoResults = hasSearched && !isLoading && results.length === 0 && value.length >= 2;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Command
        shouldFilter={false}
        label={td("searchLabel")}
        className="relative"
      >
        <Popover.Anchor asChild>
          <div className="relative">
            <Command.Input
              ref={inputRef}
              id={id}
              name={name}
              value={value}
              onValueChange={handleInputChange}
              placeholder={placeholder ?? t("destinationPlaceholder")}
              disabled={disabled}
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-background text-foreground px-4 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
              data-testid="destination-input"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2" role="status">
                <div
                  className="h-4 w-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-ring"
                  aria-hidden="true"
                />
                <span className="sr-only" aria-live="polite">{td("searching")}</span>
              </div>
            )}
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            asChild
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            align="start"
            sideOffset={4}
            className="z-[9999]"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            <Command.List
              className="max-h-60 overflow-auto rounded-lg border border-border bg-card shadow-lg"
              data-testid="destination-listbox"
            >
              {results.map((result) => {
                const { line1, line2 } = getResultLines(result);
                const itemValue = `${result.lat}-${result.lon}`;
                return (
                  <Command.Item
                    key={itemValue}
                    value={itemValue}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer px-4 py-3 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground hover:bg-muted"
                    style={{ minHeight: "44px" }}
                    data-testid="destination-option"
                  >
                    <span className="block font-medium text-foreground text-sm" data-testid="result-line1">
                      {line1}
                    </span>
                    {line2 && (
                      <span className="block text-xs text-muted-foreground" data-testid="result-line2">
                        {line2}
                      </span>
                    )}
                  </Command.Item>
                );
              })}
              {showNoResults && (
                <Command.Empty
                  className="px-4 py-3 text-sm text-muted-foreground"
                  data-testid="no-results-hint"
                >
                  {td("noResults")}
                </Command.Empty>
              )}
            </Command.List>
          </Popover.Content>
        </Popover.Portal>
      </Command>
    </Popover.Root>
  );
}
