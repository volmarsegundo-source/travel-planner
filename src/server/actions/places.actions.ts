"use server";

import { auth } from "@/lib/auth";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

type PlacesActionResult =
  | { success: true; data: PlaceSuggestion[] }
  | { success: false; error: string };

export async function searchPlaces(
  input: string,
): Promise<PlacesActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado." };

  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 100)
    return { success: true, data: [] };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Dev fallback: return mock suggestions so UI works without key
    return {
      success: true,
      data: [
        {
          placeId: "mock-1",
          description: `${trimmed}, Brasil`,
          mainText: trimmed,
          secondaryText: "Brasil",
        },
      ],
    };
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
  );
  url.searchParams.set("input", trimmed);
  url.searchParams.set("types", "(cities)");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Places API error: ${res.status}`);

    const json = (await res.json()) as {
      status: string;
      predictions: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
      }>;
    };

    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      console.error("[places.actions] API status:", json.status);
      return { success: false, error: "Erro ao buscar destinos." };
    }

    const suggestions: PlaceSuggestion[] = (json.predictions ?? []).map(
      (p) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting.main_text,
        secondaryText: p.structured_formatting.secondary_text,
      }),
    );

    return { success: true, data: suggestions };
  } catch (error) {
    console.error("[places.actions] Unexpected error:", error);
    return { success: false, error: "Erro ao buscar destinos." };
  }
}
