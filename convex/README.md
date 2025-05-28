# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// functions.js
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.functions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// functions.js
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get(id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.functions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

# Convex Backend

This directory contains the Convex backend functions for the Mirai AI chat application.

## Database Seeding

The application includes default profiles and modes that can be used to seed the database.

### Available Seeding Functions

#### `seed.seedDatabase`
Seeds the database with default profiles and modes. This function checks if data already exists and only inserts if tables are empty.

#### `seed.clearDatabase`  
Clears all profiles and modes from the database. Use with caution as this will delete all existing data.

#### `dev-utils.runSeed`
Convenience function that calls `seedDatabase`.

#### `dev-utils.resetDatabase`
Clears the database and then seeds it with default data. Useful for development and testing.

### How to Run Seeding

You can run these functions from the Convex dashboard or using the Convex CLI:

1. **Using Convex Dashboard:**
   - Go to your Convex dashboard
   - Navigate to the Functions tab
   - Find and run `seed.seedDatabase` or `dev-utils.runSeed`

2. **Using Convex CLI:**
   ```bash
   # Seed the database
   npx convex run seed:seedDatabase
   
   # Or use the convenience function
   npx convex run dev-utils:runSeed
   
   # Reset database (clear and reseed)
   npx convex run dev-utils:resetDatabase
   
   # Clear database only
   npx convex run seed:clearDatabase
   ```

### Default Data

The default data is defined in `src/lib/defaults.ts` and includes:

**Profiles:**
- Balanced (temperature: 0.7)
- Creative (temperature: 0.9) 
- Precise (temperature: 0.3)

**Modes:**
- General
- Research
- Summarizer
- Grammar Checker

### Schema

The database schema is defined in `schema.ts` and includes the following tables:

- `profiles` - AI model configurations with different temperature settings
- `modes` - Different AI behaviors and capabilities
- `threads` - Chat conversation threads
- `messages` - Individual messages within threads
- `accountSettings` - User account settings

## Development Notes

- The seeding functions are idempotent - they won't create duplicates if run multiple times
- Default data is used as fallbacks in the UI when the database is empty
- All seeding operations are logged to the console for debugging
