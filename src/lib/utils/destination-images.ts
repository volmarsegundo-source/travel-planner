/**
 * Shared destination image map.
 *
 * Curated Unsplash URLs for common travel destinations.
 * Used by DashboardV2 and DestinationGuideV2.
 */

/** Map of destination name (lowercase) to Unsplash image URL */
export const DESTINATION_IMAGES: Record<string, string> = {
  // Brazil
  "rio de janeiro": "https://images.unsplash.com/photo-1516834611397-8d633eaec5d0?w=600&q=80&fit=crop&auto=format",
  "bonito": "https://images.unsplash.com/photo-1469797384183-f961931553e9?w=600&q=80&fit=crop&auto=format",
  "pantanal": "https://images.unsplash.com/photo-1604970747673-3b173ce8e2c7?w=600&q=80&fit=crop&auto=format",
  "fernando de noronha": "https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?w=600&q=80&fit=crop&auto=format",
  "salvador": "https://images.unsplash.com/photo-1548963670-aaaa8f73a5e3?w=600&q=80&fit=crop&auto=format",
  "fortaleza": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&q=80&fit=crop&auto=format",
  "florianópolis": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80&fit=crop&auto=format",
  "florianopolis": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80&fit=crop&auto=format",
  "são paulo": "https://images.unsplash.com/photo-1543059080-db0c9f5b6e3d?w=600&q=80&fit=crop&auto=format",
  "sao paulo": "https://images.unsplash.com/photo-1543059080-db0c9f5b6e3d?w=600&q=80&fit=crop&auto=format",
  "brasília": "https://images.unsplash.com/photo-1532009877282-3340270e0529?w=600&q=80&fit=crop&auto=format",
  "brasilia": "https://images.unsplash.com/photo-1532009877282-3340270e0529?w=600&q=80&fit=crop&auto=format",
  "recife": "https://images.unsplash.com/photo-1598887142487-3c854d51eabb?w=600&q=80&fit=crop&auto=format",
  "manaus": "https://images.unsplash.com/photo-1564053489984-317bbd824340?w=600&q=80&fit=crop&auto=format",
  "gramado": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80&fit=crop&auto=format",
  "foz do iguaçu": "https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?w=600&q=80&fit=crop&auto=format",
  "foz do iguacu": "https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?w=600&q=80&fit=crop&auto=format",
  // International
  "lisbon": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&q=80&fit=crop&auto=format",
  "lisboa": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&q=80&fit=crop&auto=format",
  "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80&fit=crop&auto=format",
  "tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80&fit=crop&auto=format",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80&fit=crop&auto=format",
  "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&fit=crop&auto=format",
  "londres": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&fit=crop&auto=format",
  "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80&fit=crop&auto=format",
  "roma": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80&fit=crop&auto=format",
  "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&q=80&fit=crop&auto=format",
  "buenos aires": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&q=80&fit=crop&auto=format",
  "santiago": "https://images.unsplash.com/photo-1510253687831-0f982bec4856?w=600&q=80&fit=crop&auto=format",
  "machu picchu": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=600&q=80&fit=crop&auto=format",
  "cancun": "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&q=80&fit=crop&auto=format",
  "amsterdam": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&q=80&fit=crop&auto=format",
};

/**
 * Get an Unsplash image URL for a destination name.
 * Performs case-insensitive substring match.
 *
 * @returns Image URL or null if no match found
 */
export function getDestinationImage(destination: string): string | null {
  const key = destination.toLowerCase().trim();
  for (const [name, url] of Object.entries(DESTINATION_IMAGES)) {
    if (key.includes(name)) return url;
  }
  return null;
}
