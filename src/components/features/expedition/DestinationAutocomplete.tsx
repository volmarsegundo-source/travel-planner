"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";

interface DestinationResult {
  displayName: string;
  shortName?: string;
  lat: number;
  lon: number;
  country: string | null;
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
  const locale = useLocale();
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;

  const fetchResults = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/destinations/search?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results ?? []);
        setIsOpen((data.results ?? []).length > 0);
        setActiveIndex(-1);
      }
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchResults(newValue), 400);
    },
    [onChange, fetchResults]
  );

  const handleSelect = useCallback(
    (result: DestinationResult) => {
      onChange(result.shortName ?? result.displayName);
      onSelect?.(result);
      setIsOpen(false);
      setResults([]);
      setActiveIndex(-1);
    },
    [onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            handleSelect(results[activeIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, results, activeIndex, handleSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t("destinationPlaceholder")}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-background text-foreground px-4 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-ring" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
        >
          {results.map((result, index) => (
            <li
              key={`${result.lat}-${result.lon}`}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-4 py-2 text-sm ${
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-muted"
              }`}
            >
              {result.shortName ?? result.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
