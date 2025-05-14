# AccountInApp (app.Account Table)

---
Tags: [database, schema, drizzle, account, app-schema, nextauth]
---

Details for the Drizzle ORM schema object `AccountInApp`, corresponding to the `app.Account` table in PostgreSQL.

## Schema Definition

```typescript
export const AccountInApp = app.table("Account", {
	id: text().primaryKey().notNull(),
	userId: text().notNull().references(() => UserInApp.id, { onDelete: "cascade" }),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refresh_token: text(),
	access_token: text(),
	expires_at: integer(),
	token_type: text(),
	scope: text(),
	id_token: text(),
	session_state: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
	uniqueProviderAccount: unique("Account_provider_providerAccountId_key").on(table.provider, table.providerAccountId),
	userIdx: index("idx_account_userid").on(table.userId),
}));
```

## Key Columns

*   `userId`: Foreign key to `UserInApp.id`.
*   `type`: Type of account (e.g., 'oauth', 'credentials').
*   `provider`: Name of the provider (e.g., 'google', 'credentials').
*   `providerAccountId`: Account ID from the provider.
*   OAuth specific fields: `access_token`, `refresh_token`, `expires_at`, etc.

## Purpose & Usage

Part of NextAuth.js DrizzleAdapter. Stores information about linked third-party accounts (OAuth) or other authentication mechanisms for a user. For a credentials-only setup, it might store a record with `type: 'credentials'`.

## Relations

*   Belongs to `UserInApp`.

---
Back to: [[03_DATABASE]] 