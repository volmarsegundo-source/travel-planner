# BDD scenarios for SPEC-AUTH-AGE-002 v2.0.0 — B4-Node-gate.
# Owner: qa-engineer. Created: 2026-04-24 (BUG-C-F3 iteração 7).
#
# These scenarios document the contract enforced by the Node Server
# Component layout `(app)/layout.tsx` after the Edge middleware no
# longer reads `profileComplete`. The DB column `UserProfile.birthDate`
# is the single source of truth.

Feature: Age gate enforcement via DB source of truth (B4-Node-gate)

  Background:
    Given the application is deployed with B4-Node-gate active
    And the middleware no longer checks profileComplete
    And the (app) layout queries UserProfile.birthDate on every protected page

  Scenario: User with birthDate accesses protected route
    Given a user with UserProfile.birthDate = "1982-03-28"
    When the user navigates to /pt-BR/expeditions
    Then the layout loads without redirect
    And no redirect to /auth/complete-profile occurs

  # Scenario updated in SPEC v2.0.2 (Iter 8): callbackUrl now preserves
  # the user's ORIGINAL path, not a hardcoded `/expeditions` fallback.
  # Project locales are `pt-BR` (default, no prefix) and `en` (prefixed).
  Scenario: pt-BR user without birthDate is redirected with original path preserved in callbackUrl
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    And the user's active locale is "pt-BR" (default, no URL prefix)
    When the user navigates to /expeditions
    Then the layout redirects to /auth/complete-profile
    And the callbackUrl query param equals "/expeditions"

  Scenario: User completes DOB and accesses expeditions
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    When the user submits DOB "1982-03-28" at /auth/complete-profile
    And the user is redirected to /expeditions
    Then the expeditions page loads successfully
    And no redirect loop occurs
    And the auth.middleware.redirectToCompleteProfile event is NOT emitted

  Scenario: Minor (under 18) is blocked at DOB submit
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    When the user submits DOB "2015-03-28" (age < 18)
    Then the action returns validation error "auth.errors.ageUnderage"
    And the user is signed out
    And the user is redirected to /auth/age-rejected
    And no UserProfile.birthDate row is created

  Scenario: JWT tampered with profileComplete=true but birthDate null
    Given an attacker crafts a JWT with profileComplete: true
    And the real UserProfile.birthDate is null
    When the attacker navigates to /pt-BR/expeditions
    Then the layout queries DB, finds null birthDate
    And redirects to /auth/complete-profile
    # Proves JWT is no longer load-bearing for security

  Scenario: /admin route unaffected by change
    Given an admin user with role="admin" and birthDate filled
    When the admin navigates to /admin
    Then the admin panel loads
    And no DOB check interferes with admin flow
    And the role guard in middleware still applies

  # Added in SPEC v2.0.1 (Iter 7.1 hotfix)
  Scenario: Fresh OAuth user (first-time signup) completes flow without adapter error
    Given a user authenticates via Google OAuth for the first time
    And no User row exists in the database for their email
    When the OAuth callback creates the user via adapter.createUser
    Then the creation succeeds without PrismaClientValidationError
    And the user is redirected to /auth/complete-profile because birthDate is null
    And after submitting a valid DOB, they land on /expeditions
    # Prevents regression of the signIn mutation issue fixed in SPEC v2.0.1.

  # Scenarios added in SPEC v2.0.2 (Iter 8): i18n callbackUrl preservation
  # + open-redirect guard. Project locales: `pt-BR` (default, no prefix),
  # `en` (prefixed). localePrefix: 'as-needed'.

  Scenario: en-locale user preserves prefix in callbackUrl
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    And the user's active locale is "en"
    When the user navigates to /en/expeditions
    Then the layout redirects to /en/auth/complete-profile
    And the callbackUrl query param equals "/en/expeditions"

  Scenario: Nested deep-link path is preserved
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    And the user's active locale is "pt-BR"
    When the user navigates to /expeditions/trip-123/planner
    Then the layout redirects to /auth/complete-profile
    And the callbackUrl query param equals "/expeditions/trip-123/planner"

  Scenario: Malicious absolute-URL callbackUrl is rejected (open-redirect guard)
    Given a request where the x-pathname header contains "https://attacker.com/phish"
    When the layout constructs the redirect
    Then the callbackUrl query param falls back to the safe default "/expeditions"
    And the callbackUrl does NOT contain "attacker.com"

  Scenario: Protocol-relative URL rejected
    Given a request where the x-pathname header starts with "//attacker.com"
    When the layout constructs the redirect
    Then the callbackUrl query param falls back to the safe default

  Scenario: Path traversal token rejected
    Given a request where the x-pathname header contains "/../etc/passwd"
    When the layout constructs the redirect
    Then the callbackUrl query param falls back to the safe default

  Scenario: End-to-end — DOB submit returns user to the exact original locale-qualified path
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    And the user navigated to /en/expeditions/trip-123
    When the layout redirects them to /en/auth/complete-profile?callbackUrl=%2Fen%2Fexpeditions%2Ftrip-123
    And the user submits a valid adult DOB
    Then after redirect-back the user lands on /en/expeditions/trip-123
    And they do NOT land on /expeditions/trip-123 (without the `en` prefix)
