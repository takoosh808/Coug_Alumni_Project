# Testing Coug Connect

The categories answer different questions and intentionally overlap: functional testing describes the behavior being checked; unit, integration, and system testing describe how much of the application runs together.

| Category    | Command                           | What runs / what it proves                                                                                                                                                         |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | `npm test` or `npm run test:unit` | Small functions without a database/server: CSV parsing and boundaries, query parameters, legacy conversion, password hashing, fetch error handling                                 |
| Integration | `npm run test:integration`        | Real PostgreSQL plus parser/store/query modules: five-entity persistence, upserts/replacement, rollback, education matching, privacy-safe facets, repeatable schema initialization |
| Functional  | `npm run test:functional`         | Real HTTP API and PostgreSQL: preview/commit, invalid imports, filters/pagination, profile updates, permissions, origin validation, account creation, logout                       |
| System      | `npm run test:system`             | Chromium + production Next.js + PostgreSQL: sign-in, filter/navigation/refresh, import and edit, validation messages, account creation, sign-out                                   |
| Performance | `npm run test:performance`        | Production API load and parser/import timings: latency percentiles, throughput, correctness under concurrent reads, and configurable regression budgets                            |
| All five    | `npm run test:all`                | Unit → integration → functional → system → performance; builds/starts the app once for the latter three                                                                            |

The original externally targeted smoke script remains available as `npm run test:smoke`. It uses the running app, configured super-admin credentials, and application database, just as it did before. The new suites do not require that script.

## Setup and isolation

```sh
npm install
npx playwright install chromium
# Start PostgreSQL if using this repository's Docker setup:
docker compose up -d db
npm run test:all
```

Unit tests only need Node and installed dependencies. Database-backed suites read `.env` using Next's environment loader and use `TEST_DATABASE_URL` if provided, otherwise `DATABASE_URL`. Prefer a dedicated test database. The database must already exist and the role must be able to create schemas; application tables and a pre-existing super-admin account are not required.

`scripts/run-tests.ts` creates a unique `coug_test_<uuid>` schema, installs `db/schema.sql`, seeds three test accounts and 23 fictional alumni, and points the test processes at that schema with PostgreSQL's `search_path`. The public schema is excluded from that search path. It never prints the database connection string or reads your super-admin password.

For HTTP/browser/performance tests, it builds the production app into `.next-test`, picks a free loopback port, and starts its own server with the isolated database URL. An already-running development app is not reused. Your regular `.next` build remains separate. Next may add its test-build generated type directories to `tsconfig.json` during a build.

The runner stops its server and drops only its generated schema in `finally`, including after an assertion failure. Ordinary SIGINT/SIGTERM interruption also triggers cleanup. An OS crash or SIGKILL cannot run JavaScript cleanup; in that case an unused `coug_test_*` schema may remain for manual removal. Run one database-backed test command at a time because they share `.next-test` and report paths.

Test accounts/passwords in `tests/support/fixtures.ts` are fictional and inserted only into the temporary schema. Database and HTTP test helpers reject execution outside the isolated runner. Browser tests use fresh browser contexts for independent sign-ins. Retries are disabled so failures remain visible.

## Important cases and files

- `tests/csv.test.ts`, `tests/profiles.test.ts`: existing quoted CSV, passwords, custom answers, education, query construction, and privacy rules.
- `tests/boundaries.test.ts`: exactly 5,000 rows; excessive/empty imports; normalized duplicate headers; 10,000-character fields; 30-entry education limit; explicit text overriding legacy flags; injection-like search strings; invalid years; mocked fetch success/error behavior.
- `tests/integration/database.test.ts`: real schema/view behavior and transactions. The rollback case induces a database check-constraint failure after a profile and import-log write, then checks that both disappear after rollback.
- `tests/functional/api.test.ts`: API status codes and persisted outcomes. Preview cannot write data/history; one invalid row cannot partly import a file; replacement clears omitted fields; hidden contacts cannot be searched; unauthorized writes cannot succeed. One test installs a temporary database trigger that fails a later import row, then checks through the API that earlier profile writes and history were rolled back. The trigger exists only in the disposable schema and is removed afterward.
- `tests/system/workflows.spec.ts`: user journeys through visible controls. Editing adds a qualification and checks persistence after refresh. Login failure checks focus on the error for keyboard/screen-reader users.
- `tests/performance/benchmark.ts`: parses 5,000 CSV rows, imports a configurable dataset, warms four directory query shapes, then runs bounded concurrent member requests and checks the responses as well as their duration.

This suite does not claim exhaustive coverage: it does not test every CSS breakpoint, all browser engines, Docker/Nginx/TLS deployment, internet-scale traffic, or every possible privacy-answer combination. The system suite currently targets desktop Chromium. The original smoke script also contains a populated legacy-upgrade scenario.

## Performance settings and interpretation

Defaults are practical local regression budgets, not production service-level guarantees. Parsing uses the maximum supported 5,000-row count; API load uses 500 imported profiles, 50 measured requests, and concurrency 5. Authentication, data setup, initial build, and warm-up requests are excluded from the measured directory load.

| Variable           | Default | Purpose                                           |
| ------------------ | ------- | ------------------------------------------------- |
| `PERF_ROWS`        | `500`   | Imported benchmark profiles, up to 5,000          |
| `PERF_REQUESTS`    | `50`    | Measured reads, up to 5,000                       |
| `PERF_CONCURRENCY` | `5`     | Concurrent request workers, up to 50              |
| `PERF_P95_MS`      | `2000`  | Maximum permitted directory p95 response duration |
| `PERF_PARSE_MS`    | `2000`  | Maximum duration to parse 5,000 basic CSV records |
| `PERF_IMPORT_MS`   | `30000` | Maximum duration for benchmark file import        |

Example in macOS/Linux shells:

```sh
PERF_ROWS=1000 PERF_REQUESTS=200 PERF_CONCURRENCY=10 PERF_P95_MS=1500 npm run test:performance
```

The runner prints p50/p95 latency, requests per second, parser/import duration, and error count. It writes `test-results/performance.json` with the workload, budgets, metrics, and failures. Any request error or exceeded budget fails the command. Compare results on the same machine, dataset size, runtime, and concurrency; increase sample size for more stable percentile estimates. Each API directory request also computes network stats and facets, so it exercises more than a simple indexed row lookup.

Initial local verification on November 5, 2026: all 19 unit, 4 integration, 7 functional, and 5 Chromium system tests passed. The default performance workload passed with zero errors: approximately 21 ms to parse 5,000 rows, 315 ms to import 500 profiles, directory p95 of 45 ms, and 143 requests/second. These are observations from this machine, not portable guarantees. The browser regression test also exposed and verified a fix for login-error focus: focus now runs in an effect after React renders the message.

## Reports and troubleshooting

- Node suites print named assertions with pass/fail summaries.
- Browser results go to `playwright-report/`; open with `npx playwright show-report`.
- Screenshots and traces are retained for failed browser tests in `test-results/browser/`.
- Test-server logs go to `test-results/server.log`.
- Performance measurements go to `test-results/performance.json`.
- A database connection error means PostgreSQL is stopped, the test URL is incorrect, or the role lacks access. A schema-creation error requires a role with schema creation privileges in the test database.
- A missing browser executable requires `npx playwright install chromium`. Linux CI may need `npx playwright install --with-deps chromium`.
- The installed Next.js version may stop a build to display a security-upgrade reminder. Address that recommendation separately; if its message explicitly asks for a retry, rerun the test command. The test runner does not suppress framework security checks.

Generated reports, test builds, and traces are ignored by Git. Traces can contain test inputs and responses; the suite uses fictional records.

## Supporting documentation

The browser setup uses the installed Next.js testing guide plus Playwright's [fixtures](https://playwright.dev/docs/test-fixtures) and [assertions](https://playwright.dev/docs/test-assertions) documentation. The suite uses assertions that wait for UI state rather than fixed sleeps.
