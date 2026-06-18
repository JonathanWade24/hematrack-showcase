# SessionInApp (app.Session Table)

---
Tags: [database, schema, drizzle, session, app-schema, nextauth]
---

Details for the Drizzle ORM schema object `SessionInApp`, corresponding to the `app.Session` table in PostgreSQL.

## Schema Definition

```typescript
export const SessionInApp = app.table("Session", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull().references(() => UserInApp.id, { onDelete: "cascade" }),
	expires: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
}, (table) => ({
	userIdx: index("idx_session_userid").on(table.userId),
}));
```

## Key Columns

*   `sessionToken`: Unique session token (Primary Key).
*   `userId`: Foreign key to `UserInApp.id`.
*   `expires`: Timestamp when the session expires.

## Purpose & Usage

Part of NextAuth.js DrizzleAdapter. Used to store user sessions if the database session strategy (`strategy: "database"`) is configured in NextAuth.js. If JWT strategy is used, this table will not be actively populated with session data by NextAuth.js.

## Relations

*   Belongs to `UserInApp`.

---
Back to: [[03_DATABASE]] 