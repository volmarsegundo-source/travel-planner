/**
 * Grader: Autocomplete Quality (EVAL-UX-002)
 *
 * Evaluates destination autocomplete search results against expected outcomes.
 * This is a CODE GRADER — runs automatically per commit, no AI cost.
 *
 * Implements 4 grading dimensions:
 *   1. Accuracy:    Does the first result match the expected city/country?
 *   2. Performance: Response time < 300ms (excluding network)?
 *   3. Format:      Result has city, state, country, flag emoji?
 *   4. Mobile:      Touch targets >= 44px?
 *
 * Schedule: per-commit (code grader, zero AI cost)
 * Dataset:  docs/evals/datasets/autocomplete-quality.json
 * Spec ref: SPEC-PROD-017
 *
 * --- IMPLEMENTATION STUB ---
 * This file defines the grader interface and scoring logic.
 * Devs implement the actual test runner that calls this grader.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutocompleteResult {
  city: string;
  state?: string;
  country: string;
  countryIso2: string;
  flagEmoji?: string;
  isAirport?: boolean;
  lat?: number;
  lon?: number;
}

export interface AutocompleteGraderInput {
  testCaseId: string;
  query: string;
  locale: string;
  results: AutocompleteResult[];
  apiCallCount?: number;
  responseTimeMs?: number;
  resultRowHeightPx?: number;
  resultGapPx?: number;
  ariaActivedescendantSet?: boolean;
  firstResultHighlighted?: boolean;
  noResultsMessageVisible?: boolean;
  consoleErrors: string[];
}

export interface AutocompleteExpected {
  first_result_city?: string;
  first_result_contains?: string;
  first_result_country_iso2?: string;
  first_result_country_iso2_in?: string[];
  has_flag_emoji?: boolean;
  has_secondary_text?: boolean;
  secondary_text_contains?: string;
  is_airport_result?: boolean;
  result_count?: number;
  result_count_min?: number;
  result_count_max?: number;
  results_have_different_countries?: boolean;
  results_include_countries?: string[];
  all_results_have_secondary_text?: boolean;
  api_call_made?: boolean;
  api_call_count_max?: number;
  api_call_count_min?: number;
  dropdown_visible?: boolean;
  no_error?: boolean;
  no_xss_execution?: boolean;
  no_results_message_visible?: boolean;
  no_results_message_locale?: string;
  result_row_height_min_px?: number;
  result_gap_min_px?: number;
  first_result_highlighted?: boolean;
  aria_activedescendant_set?: boolean;
  final_results_present?: boolean;
}

export interface GraderResult {
  testCaseId: string;
  passed: boolean;
  score: number; // 0.0 - 1.0
  dimensions: {
    accuracy?: number;
    performance?: number;
    format?: number;
    mobile?: number;
    accessibility?: number;
    security?: number;
  };
  failures: string[];
}

// ---------------------------------------------------------------------------
// Grader Logic
// ---------------------------------------------------------------------------

export function gradeAutocomplete(
  input: AutocompleteGraderInput,
  expected: AutocompleteExpected,
  weights: Record<string, number>
): GraderResult {
  const failures: string[] = [];
  const dimensions: Record<string, number> = {};

  // --- Accuracy ---
  if (weights.accuracy !== undefined) {
    let accuracyScore = 1.0;

    if (expected.first_result_city && input.results.length > 0) {
      const firstCity = input.results[0].city.toLowerCase();
      if (!firstCity.includes(expected.first_result_city.toLowerCase())) {
        accuracyScore = 0.0;
        failures.push(
          `First result "${input.results[0].city}" does not match expected "${expected.first_result_city}"`
        );
      }
    }

    if (expected.first_result_contains && input.results.length > 0) {
      const firstCity = input.results[0].city.toLowerCase();
      if (!firstCity.includes(expected.first_result_contains.toLowerCase())) {
        accuracyScore = 0.0;
        failures.push(
          `First result "${input.results[0].city}" does not contain "${expected.first_result_contains}"`
        );
      }
    }

    if (expected.first_result_country_iso2 && input.results.length > 0) {
      if (input.results[0].countryIso2 !== expected.first_result_country_iso2) {
        accuracyScore *= 0.5;
        failures.push(
          `First result country "${input.results[0].countryIso2}" does not match expected "${expected.first_result_country_iso2}"`
        );
      }
    }

    if (expected.first_result_country_iso2_in && input.results.length > 0) {
      if (!expected.first_result_country_iso2_in.includes(input.results[0].countryIso2)) {
        accuracyScore *= 0.5;
        failures.push(
          `First result country "${input.results[0].countryIso2}" not in expected set [${expected.first_result_country_iso2_in.join(", ")}]`
        );
      }
    }

    if (expected.result_count !== undefined) {
      if (input.results.length !== expected.result_count) {
        accuracyScore *= 0.5;
        failures.push(
          `Result count ${input.results.length} does not match expected ${expected.result_count}`
        );
      }
    }

    if (expected.result_count_min !== undefined) {
      if (input.results.length < expected.result_count_min) {
        accuracyScore *= 0.5;
        failures.push(
          `Result count ${input.results.length} below minimum ${expected.result_count_min}`
        );
      }
    }

    if (expected.is_airport_result && input.results.length > 0) {
      if (!input.results[0].isAirport) {
        accuracyScore *= 0.5;
        failures.push("First result is not flagged as airport");
      }
    }

    dimensions.accuracy = accuracyScore;
  }

  // --- Performance ---
  if (weights.performance !== undefined) {
    let perfScore = 1.0;

    if (expected.api_call_count_max !== undefined && input.apiCallCount !== undefined) {
      if (input.apiCallCount > expected.api_call_count_max) {
        perfScore *= 0.5;
        failures.push(
          `API call count ${input.apiCallCount} exceeds max ${expected.api_call_count_max}`
        );
      }
    }

    if (input.responseTimeMs !== undefined && input.responseTimeMs > 300) {
      // Linear degradation: 300ms = 1.0, 600ms = 0.0
      perfScore *= Math.max(0, 1.0 - (input.responseTimeMs - 300) / 300);
      failures.push(`Response time ${input.responseTimeMs}ms exceeds 300ms target`);
    }

    dimensions.performance = perfScore;
  }

  // --- Format ---
  if (weights.format !== undefined) {
    let formatScore = 1.0;

    if (expected.has_flag_emoji && input.results.length > 0) {
      if (!input.results[0].flagEmoji) {
        formatScore *= 0.5;
        failures.push("First result missing flag emoji");
      }
    }

    if (expected.has_secondary_text && input.results.length > 0) {
      if (!input.results[0].state && !input.results[0].country) {
        formatScore *= 0.5;
        failures.push("First result missing secondary text (state/country)");
      }
    }

    if (expected.all_results_have_secondary_text) {
      const missing = input.results.filter((r) => !r.state && !r.country);
      if (missing.length > 0) {
        formatScore *= 1.0 - missing.length / input.results.length;
        failures.push(`${missing.length} results missing secondary text`);
      }
    }

    if (expected.no_results_message_visible && !input.noResultsMessageVisible) {
      formatScore = 0.0;
      failures.push("No results message not visible for zero-result query");
    }

    dimensions.format = formatScore;
  }

  // --- Mobile ---
  if (weights.mobile !== undefined) {
    let mobileScore = 1.0;

    if (
      expected.result_row_height_min_px !== undefined &&
      input.resultRowHeightPx !== undefined
    ) {
      if (input.resultRowHeightPx < expected.result_row_height_min_px) {
        mobileScore = 0.0;
        failures.push(
          `Touch target ${input.resultRowHeightPx}px below minimum ${expected.result_row_height_min_px}px`
        );
      }
    }

    dimensions.mobile = mobileScore;
  }

  // --- Accessibility ---
  if (weights.accessibility !== undefined) {
    let a11yScore = 1.0;

    if (expected.aria_activedescendant_set && !input.ariaActivedescendantSet) {
      a11yScore = 0.0;
      failures.push("aria-activedescendant not set after ArrowDown");
    }

    if (expected.first_result_highlighted && !input.firstResultHighlighted) {
      a11yScore *= 0.5;
      failures.push("First result not highlighted after ArrowDown");
    }

    dimensions.accessibility = a11yScore;
  }

  // --- Security ---
  if (weights.security !== undefined) {
    let secScore = 1.0;

    if (input.consoleErrors.length > 0) {
      secScore = 0.0;
      failures.push(`Console errors: ${input.consoleErrors.join("; ")}`);
    }

    dimensions.security = secScore;
  }

  // --- Composite Score ---
  let compositeScore = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(weights)) {
    if (dimensions[dim] !== undefined) {
      compositeScore += dimensions[dim] * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight > 0) {
    compositeScore /= totalWeight;
  }

  return {
    testCaseId: input.testCaseId,
    passed: compositeScore >= 0.85 && failures.length === 0,
    score: Math.round(compositeScore * 1000) / 1000,
    dimensions,
    failures,
  };
}
