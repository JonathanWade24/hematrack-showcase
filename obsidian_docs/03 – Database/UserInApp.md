# UserInApp (app.User Table)

---
Tags: [database, schema, drizzle, user, app-schema]
---

Details for the Drizzle ORM schema object `UserInApp`, corresponding to the `app.User` table in PostgreSQL.

## Schema Definition

```typescript
export const UserInApp = app.table("User", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().unique().notNull(),
	emailVerified: timestamp({ withTimezone: true, mode: 'date' }),
	image: text(),
	password: text(),
	role: text(),
	isActive: boolean("is_active").default(true).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});
```

## Key Columns

*   `id`: User's unique identifier.
*   `name`: Display name.
*   `email`: Unique email address.
*   `emailVerified`: Timestamp of email verification.
*   `password`: Hashed password.
*   `image`: URL to profile picture.
*   `role`: User's role (e.g., 'admin', 'user').
*   `isActive`: Boolean indicating if the account is active.
*   `created_at`: Timestamp of creation.
*   `updated_at`: Timestamp of last update.

## Purpose & Usage

Stores the primary information for user accounts. Used by NextAuth.js for authentication and by the application for user identification and role-based access control.

## Relations

*   Linked to `AccountInApp`, `SessionInApp` via `userId`.

---
Back to: [[03_DATABASE]] 