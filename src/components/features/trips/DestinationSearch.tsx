"use client";

import { useState, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchPlaces } from "@/server/actions/places.actions";
import type { PlaceSuggestion } from "@/server/actions/places.actions";

interface DestinationSearchProps {
  value: string;
  placeId?: string;
  onChange: (name: string, placeId?: string) => void;
  error?: string;
  disabled?: boolean;
}

export function DestinationSearch({
  value,
  placeId: _placeId,
  onChange,
  error,
  disabled,
}: DestinationSearchProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = "destination-search";

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      onChange(raw, undefined);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (raw.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        const result = await searchPlaces(raw);
        setIsLoading(false);
        if (result.success) {
          setSuggestions(result.data);
          setIsOpen(result.data.length > 0);
        }
      }, 350);
    },
    [onChange],
  );

  function handleSelect(suggestion: PlaceSuggestion) {
    onChange(suggestion.description, suggestion.placeId);
    setSuggestions([]);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        Destino <span aria-hidden="true">*</span>
      </label>

      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="destination-listbox"
          aria-invalid={!!error}
          aria-describedby={error ? "destination-error" : undefined}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          disabled={disabled}
          placeholder="Para onde você vai?"
          className={cn(
            "w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm outline-none transition-colors",
            "placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
            error ? "border-red-400" : "border-gray-300",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />
        {isLoading && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
            aria-hidden="true"
          />
        )}
      </div>

      {error && (
        <p id="destination-error" className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          id="destination-listbox"
          role="listbox"
          aria-label="Sugestões de destino"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={false}
              onMouseDown={() => handleSelect(s)}
              className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-orange-50"
            >
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-orange-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {s.mainText}
                </p>
                <p className="text-xs text-gray-500">{s.secondaryText}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
