/**
 * Grader: Summary Completeness (EVAL-UX-006)
 *
 * Evaluates the expedition summary report for completeness and accuracy.
 * Verifies all 6 phases have data sections, data matches DB records,
 * booking codes are masked, and print layout is correct.
 *
 * Implements 3 grading dimensions:
 *   1. Completeness: All 6 phases have data sections present?
 *   2. Accuracy:     Data in each section matches DB records?
 *   3. Security:     Booking codes masked, no encrypted blobs visible?
 *
 * Schedule: per-commit (code grader, zero AI cost)
 * Dataset:  docs/evals/datasets/summary-completeness.json
 * Spec ref: SPEC-QA-004
 *
 * --- IMPLEMENTATION STUB ---
 * Devs implement the test runner that populates SummaryGraderInput from DOM.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhaseSection {
  phaseIndex: number;
  phaseName: string;
  sectionVisible: boolean;
  hasData: boolean;
  showsNotCompletedIndicator: boolean;
  dataFields: Record<string, unknown>;
}

export interface BookingCodeCheck {
  fieldName: string;
  displayedValue: string;
  isMasked: boolean; // "****XXXX" format
  isEncryptedBlobVisible: boolean; // raw aes256gcm string
}

export interface SummaryGraderInput {
  testCaseId: string;
  tripId: string;
  locale: string;
  phases: PhaseSection[];
  bookingCodes: BookingCodeCheck[];
  printSections: {
    phaseIndex: number;
    visibleInPrint: boolean;
    breakInsideAvoided: boolean;
  }[];
  dbSnapshot: Record<string, unknown>; // Expected DB data for comparison
  consoleErrors: string[];
}

export interface SummaryGraderResult {
  testCaseId: string;
  passed: boolean;
  score: number;
  dimensions: {
    completeness: number;
    accuracy: number;
    security: number;
    print?: number;
  };
  failures: string[];
}

// ---------------------------------------------------------------------------
// Grader Logic
// ---------------------------------------------------------------------------

export function gradeSummary(input: SummaryGraderInput): SummaryGraderResult {
  const failures: string[] = [];

  // --- Completeness (all 6 phases present) ---
  let completenessScore = 0;
  const expectedPhaseCount = 6;
  let visibleCount = 0;

  for (const phase of input.phases) {
    if (phase.sectionVisible) {
      visibleCount++;

      // Phase with data should show data, not "not completed"
      if (phase.hasData && phase.showsNotCompletedIndicator) {
        failures.push(
          `Phase ${phase.phaseIndex} (${phase.phaseName}) has data but shows "Not completed" indicator`
        );
      }

      // Phase without data should show "not completed"
      if (!phase.hasData && !phase.showsNotCompletedIndicator) {
        failures.push(
          `Phase ${phase.phaseIndex} (${phase.phaseName}) has no data but missing "Not completed" indicator`
        );
      }
    } else {
      failures.push(
        `Phase ${phase.phaseIndex} (${phase.phaseName}) section not visible`
      );
    }
  }

  completenessScore = visibleCount / expectedPhaseCount;

  // --- Accuracy (data matches DB) ---
  // This is a simplified check — real implementation should deep-compare fields
  let accuracyScore = 1.0;
  if (input.consoleErrors.length > 0) {
    accuracyScore *= 0.5;
    failures.push(`Console errors during summary render: ${input.consoleErrors.length}`);
  }

  // --- Security (booking codes masked) ---
  let securityScore = 1.0;
  const MASK_PATTERN = /^\*{4}[A-Za-z0-9]{2,4}$/;

  for (const code of input.bookingCodes) {
    if (code.isEncryptedBlobVisible) {
      securityScore = 0.0; // Zero tolerance
      failures.push(
        `CRITICAL: Encrypted blob visible for ${code.fieldName}: "${code.displayedValue.substring(0, 20)}..."`
      );
    }

    if (!code.isMasked) {
      securityScore *= 0.5;
      failures.push(
        `Booking code ${code.fieldName} not properly masked: "${code.displayedValue}"`
      );
    }

    if (code.isMasked && !MASK_PATTERN.test(code.displayedValue)) {
      securityScore *= 0.8;
      failures.push(
        `Booking code ${code.fieldName} mask format unexpected: "${code.displayedValue}" (expected ****XXXX)`
      );
    }
  }

  // --- Print (optional dimension) ---
  let printScore: number | undefined;
  if (input.printSections.length > 0) {
    let printCorrect = 0;
    for (const section of input.printSections) {
      if (section.visibleInPrint && section.breakInsideAvoided) {
        printCorrect++;
      } else {
        if (!section.visibleInPrint) {
          failures.push(`Phase ${section.phaseIndex} not visible in print preview`);
        }
        if (!section.breakInsideAvoided) {
          failures.push(`Phase ${section.phaseIndex} has break-inside issue in print`);
        }
      }
    }
    printScore = printCorrect / input.printSections.length;
  }

  // --- Composite Score ---
  let compositeScore: number;
  if (printScore !== undefined) {
    compositeScore =
      completenessScore * 0.30 +
      accuracyScore * 0.30 +
      securityScore * 0.25 +
      printScore * 0.15;
  } else {
    compositeScore =
      completenessScore * 0.35 +
      accuracyScore * 0.35 +
      securityScore * 0.30;
  }

  // Security zero-tolerance override
  if (securityScore === 0.0) {
    compositeScore = 0.0;
  }

  return {
    testCaseId: input.testCaseId,
    passed: compositeScore >= 0.85 && securityScore > 0.0 && failures.length === 0,
    score: Math.round(compositeScore * 1000) / 1000,
    dimensions: {
      completeness: completenessScore,
      accuracy: accuracyScore,
      security: securityScore,
      ...(printScore !== undefined ? { print: printScore } : {}),
    },
    failures,
  };
}
