# Userbot Development Plan and Notes

## Task: Resolve TypeScript Errors and Optimize GitHub Actions Workflows

### Part 1: Code Fixes (Completed)

The following code changes were applied to resolve the reported TypeScript errors (TS1160, TS1005, TS2339):

1.  **`userbot/src/index.ts` (TS1160: Unterminated template literal):** Removed the extra closing parenthesis `)` on line 118.
2.  **`userbot/src/whatsapp_adapter/whatsappClient.ts` (TS1005: '}' expected):** Inserted the missing closing brace for the `processMediaMessage` method on line 219.
3.  **`userbot/src/telegram_adapter/telegramClient.ts` (TS2339: Property 'audio'/'voice' does not exist):** Used type assertion `(ctx.message as any).audio` to resolve the strict type check on line 118.

### Part 2: GitHub Actions Workflow Restructuring (Revised Plan)

The user requested to keep workflows separate while introducing a dedicated `type-check` step that must pass before `test` and `doc`.

**Implementation Steps:**

1.  **Add `type-check` script to `userbot/package.json`** (Next Step).
2.  **Create `userbot/.github/workflows/type-check.yml`** (Next Step).
3.  **Modify `userbot/.github/workflows/test.yml`** to trigger on `workflow_run` of `Type Check` (if successful).
4.  **Modify `userbot/.github/workflows/docs.yml`** to trigger on `workflow_run` of `Type Check` (if successful), replacing the dependency on `Test Suite`.

### Notes on TypeScript Errors

The local environment is reporting new TypeScript errors (missing Node.js and library types) because the type packages are not installed locally. Since the user forbids local `npm install`, these errors will be resolved by the new `type-check` workflow, which will install dependencies in the runner environment. The `tsconfig.json` already includes `"node"` types, so the issue is purely environmental (missing `node_modules`).