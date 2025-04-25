# Prisma Migration Guide

This guide outlines how to migrate components from Supabase to Prisma in our application.

## Background

We're transitioning from Supabase to Prisma as our database access layer. This change provides:

- Type-safe database queries
- Better IDE autocomplete support
- Schema-first database management
- Support for multi-schema PostgreSQL databases
- Improved authentication with NextAuth.js

## Migration Steps

### 1. Replace Supabase Client Imports

**Before:**
```typescript
import { createClient } from '@/lib/supabase/client' // Client-side
// OR
import { createClient } from '@/lib/supabase/server' // Server-side
```

**After:**
```typescript
import { prisma } from '@/lib/prisma' // Direct Prisma import
// OR
import { getLaboratoryData, getClinicalData } from '@/lib/prisma-helpers' // Helper functions
```

### 2. Replace Supabase Queries

**Before (Supabase):**
```typescript
const supabase = createClient()
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
```

**After (Prisma):**
```typescript
const data = await prisma.table_name.findMany({
  where: {
    column: value
  }
})
```

### 3. Authentication Changes

**Before (Supabase Auth):**
```typescript
const { data: { user } } = await supabase.auth.getUser()
await supabase.auth.signOut()
```

**After (NextAuth.js):**
```typescript
import { useSession, signOut } from 'next-auth/react'

// Get user data
const { data: session } = useSession()
const user = session?.user

// Sign out
await signOut()
```

### 4. Handling Multiple Schemas

Prisma automatically handles multiple schemas through the schema definition. All models are defined in `prisma/schema.prisma` with their respective schemas.

For common operations on specific schemas, use the helpers in `src/lib/prisma-helpers.ts`:

```typescript
import { getLaboratoryData, getClinicalData, getPhiData } from '@/lib/prisma-helpers'

// Get data from the laboratory schema
const laboratoryData = await getLaboratoryData('model_name', {
  where: { column: value },
  take: 10
})

// Get data from the clinical schema
const clinicalData = await getClinicalData('model_name', {
  where: { column: value }
})
```

## Common Migration Patterns

### Fetching Records

**Supabase:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('column1, column2, relation(relation_column)')
  .eq('id', 123)
```

**Prisma:**
```typescript
const data = await prisma.table_name.findUnique({
  where: { id: 123 },
  select: {
    column1: true,
    column2: true,
    relation: {
      select: {
        relation_column: true
      }
    }
  }
})
```

### Creating Records

**Supabase:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert({ column1: 'value', column2: 'value' })
  .select()
```

**Prisma:**
```typescript
const data = await prisma.table_name.create({
  data: {
    column1: 'value',
    column2: 'value'
  }
})
```

### Updating Records

**Supabase:**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .update({ column1: 'new_value' })
  .eq('id', 123)
  .select()
```

**Prisma:**
```typescript
const data = await prisma.table_name.update({
  where: { id: 123 },
  data: { column1: 'new_value' }
})
```

### Deleting Records

**Supabase:**
```typescript
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', 123)
```

**Prisma:**
```typescript
await prisma.table_name.delete({
  where: { id: 123 }
})
```

## Advanced Scenarios

### Transactions

Prisma makes it easy to run multiple operations in a transaction:

```typescript
await prisma.$transaction([
  prisma.table1.create({ data: { ... } }),
  prisma.table2.update({ where: { ... }, data: { ... } })
])
```

### Raw SQL Queries

When needed, you can still run raw SQL with Prisma:

```typescript
const result = await prisma.$queryRaw`SELECT * FROM table_name WHERE complex_condition`
```

## Environment Variables

After migration, the main environment variable needed is `DATABASE_URL` in the `.env` file. Make sure special characters in the password are properly URL-encoded. 