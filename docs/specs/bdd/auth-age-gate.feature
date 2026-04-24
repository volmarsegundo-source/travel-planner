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

  Scenario: User without birthDate is redirected
    Given a user authenticated via Google OAuth
    And UserProfile.birthDate is null
    When the user navigates to /pt-BR/expeditions
    Then the layout redirects to /pt-BR/auth/complete-profile
    And the callbackUrl query param is set to "/pt-BR/expeditions"

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
