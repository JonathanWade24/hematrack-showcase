# VerificationTokenInApp (app.VerificationToken Table)

---
Tags: [database, schema, drizzle, verification-token, app-schema, nextauth]
---

Details for the Drizzle ORM schema object `VerificationTokenInApp`, corresponding to the `app.VerificationToken` table in PostgreSQL.

## Schema Definition

```typescript
export const VerificationTokenInApp = app.table("VerificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
}, (table) => ({
	pk: primaryKey({ columns: [table.identifier, table.token], name: "VerificationToken_pkey"}),
}));
```

## Key Columns

*   `identifier`: Typically the user's email or another identifier.
*   `token`: The unique verification token.
*   `expires`: Timestamp when the token expires.

## Purpose & Usage

Part of NextAuth.js DrizzleAdapter. Used by NextAuth.js for features like email verification (e.g., after sign-up) or passwordless login if an Email provider is configured. Stores tokens sent to users that they must use to verify an action.

## Relations

*   Typically associated with a user identified by the `identifier` field, though not always a direct foreign key to `UserInApp` in all NextAuth.js adapter implementations for this specific table.

---
Back to: [[03_DATABASE]] 