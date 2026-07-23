# Security Specification: Bible Personalized App

This document outlines the zero-trust security architecture, data invariants, and adversarial mock verification scenarios for a secure Firestore setup in the Personalised Bible Study assistant application.

## 1. Core Data Invariants & Collections Map

Based on `firebase-blueprint.json`, three top-level user-centric paths must be secured:

### A. User Profile (`/users/{userId}`)
- **Location**: `/users/{userId}`
- **Permissions**: Read/Write restricted exclusively to the profile owner (`request.auth.uid == userId`). No global lists allowed.
- **Invariants**:
  - `userId` must equal `request.auth.uid`.
  - `email` must match `request.auth.token.email` with modern verification (`request.auth.token.email_verified == true`).
  - `createdAt` is immutable after creation.
  - `updatedAt` must be set to `request.time` on writes.

### B. Bookmarks & Verse Study notes (`/users/{userId}/bookmarks/{bookmarkId}`)
- **Location**: `/users/{userId}/bookmarks/{bookmarkId}`
- **Permissions**: Read, create, update, and delete access bounded strictly to the owner (`request.auth.uid == userId`).
- **Invariants**:
  - `userId` matches the token UID.
  - `book`, `chapter`, and `verse` must be typesafe (string and integers).
  - `color` must belong to the allowed palette enum (`none`, `yellow`, `cyan`, `green`, `red`).
  - `updatedAt` dynamically synchronized with `request.time`.

### C. Theology & Memorization Quizzes (`/users/{userId}/quizzes/{quizId}`)
- **Location**: `/users/{userId}/quizzes/{quizId}`
- **Permissions**: Create and read access restricted to the owner (`request.auth.uid == userId`). No updates permitted (historical records are immutable).
- **Invariants**:
  - `userId` matches `request.auth.uid`.
  - `score` is a bounded integer between `0` and `100`.
  - `mode` must equal `vocabulary` or `memorization`.

---

## 2. The "Dirty Dozen" Vulnerability Payloads

These 12 malicious payload templates are simulated client requests designed to break integrity constraints. A secure rules configuration must return `PERMISSION_DENIED` on all of them.

### Attack 1: Identity Spoofing User Profile
- **Target Location**: `/users/legitimate_user_123`
- **Request Authentication Context**: Auth token is `attacker_uid` (unrelated malicious user)
- **Malicious Payload**:
  ```json
  {
    "userId": "legitimate_user_123",
    "email": "malicious@attacker.org"
  }
  ```
- **Reason to fail**: Attempting to read or write a profile belonging to another UID.

### Attack 2: Spoofing Admin / Self-Assigned Role
- **Target Location**: `/users/attacker_uid`
- **Request Authentication Context**: Auth token is `attacker_uid`
- **Malicious Payload**:
  ```json
  {
    "userId": "attacker_uid",
    "email": "attacker@email.com",
    "isAdmin": true,
    "role": "admin"
  }
  ```
- **Reason to fail**: Formulating custom field properties (`isAdmin` or custom high-tier `role`) to attain self-assigned roles. Strict schema checks must enforce standard blueprint fields.

### Attack 3: Unverified Email Hijacking
- **Target Location**: `/users/attacker_uid`
- **Request Authentication Context**: Auth token is `attacker_uid`, but `email_verified` is `false`.
- **Malicious Payload**: Valid UserProfile JSON format.
- **Reason to fail**: The user's credential email must be fully verified (`email_verified == true`).

### Attack 4: Shadow Field Insertion in UserProfile
- **Target Location**: `/users/attacker_uid`
- **Request Authentication Context**: `attacker_uid`, verified email.
- **Malicious Payload**:
  ```json
  {
    "userId": "attacker_uid",
    "email": "verified_user@email.com",
    "createdAt": "2026-06-04T19:00:20Z",
    "updatedAt": "2026-06-04T19:00:20Z",
    "shadowPrivilege": "granted_unrestricted_access"
  }
  ```
- **Reason to fail**: Rejecting ghost/shadow keys via size checks and strict field schema.

### Attack 5: Document ID Poisoning with Denial of Wallet Payload
- **Target Location**: `/users/attacker_uid/bookmarks/` + 2000-character long script tag string.
- **Malicious Payload**: Valid Bookmark schema.
- **Reason to fail**: String size checks must reject excessively long document IDs.

### Attack 6: Poisoned Color Highlight Value Insertion
- **Target Location**: `/users/attacker_uid/bookmarks/John_1_1`
- **Malicious Payload**:
  ```json
  {
    "id": "John_1_1",
    "userId": "attacker_uid",
    "book": "John",
    "chapter": 1,
    "verse": 1,
    "color": "highly_malicious_exploit_color",
    "createdAt": "2026-06-04T19:20:00Z",
    "updatedAt": "2026-06-04T19:20:00Z"
  }
  ```
- **Reason to fail**: The custom highlight color must map strictly to the accepted `enum` keys (`none`, `yellow`, `cyan`, `green`, `red`).

### Attack 7: Orphaned Note Highlight Creation
- **Target Location**: `/users/authenticated_user/bookmarks/John_1_1`
- **Request Authentication Context**: `attacker_uid` writing to user's bookmark nested tree.
- **Reason to fail**: Subcollections must inherit identity checks from parent scopes.

### Attack 8: Mutating Immutable History (Quiz Score Modification)
- **Target Location**: `/users/attacker_uid/quizzes/quiz_history_456`
- **Request Authentication Context**: `attacker_uid`
- **Malicious Payload**: Attempting an UPDATE query to revise score from `0` to `100`.
- **Reason to fail**: Historical records should have NO `allow update` or `allow delete` rules whatsoever. Only creation and self-reading is allowed.

### Attack 9: Out of Bounds Quiz Score Achieved
- **Target Location**: `/users/attacker_uid/quizzes/quiz_888`
- **Malicious Payload**:
  ```json
  {
    "id": "quiz_888",
    "userId": "attacker_uid",
    "mode": "vocabulary",
    "score": 9999999,
    "createdAt": "2026-06-04T19:20:00Z"
  }
  ```
- **Reason to fail**: Out-of-bounds metrics must be captured by range assertions (`score <= 100 && score >= 0`).

### Attack 10: Clock Tampering / Client-Based Timestamp Forgery
- **Target Location**: `/users/attacker_uid`
- **Malicious Payload**: Setting `createdAt` and `updatedAt` to five years in the future to mock fake streaks.
- **Reason to fail**: All date-time variables must equal current server clocks: `incoming().createdAt == request.time`.

### Attack 11: Immutable Field Mutation
- **Target Location**: `/users/attacker_uid`
- **Malicious Payload (Update request)**: Re-writing or attempting to change `createdAt` date-time.
- **Reason to fail**: Assertions must demand `incoming().createdAt == existing().createdAt`.

### Attack 12: List scraping (PII exposure)
- **Query Request**: Attacker queries `/users` listing all profiles without query limits.
- **Reason to fail**: Blanket queries or non-limited lists must be rejected at the rules level.

---

## 3. The Security Rule Test Runner Framework

The validation behavior can be verified using `@firebase/rules-unit-testing` matching the schemas above, returning `PERMISSION_DENIED` on each malicious test pattern.
