import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * In-memory stand-in for the Supabase admin client, covering the query
 * shapes the billing code issues: select/insert/update/upsert with
 * eq/neq/in/is/lt/or filters, order/limit/range, maybeSingle, `.select()`
 * after a write, and auth.admin.listUsers pagination. Unique constraints
 * mirror the real schema so 23505 and ignoreDuplicates behave.
 */

export type Row = Record<string, unknown>;

export type FakeAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

const UNIQUE_COLUMNS: Record<string, string[]> = {
  stripe_webhook_events: ["stripe_event_id"],
  billing_unresolved_events: ["stripe_event_id"],
  profiles: ["id", "stripe_customer_id"],
  subscriptions: ["id", "stripe_subscription_id"],
  plans: ["id", "slug", "stripe_price_id"],
  testimonials: ["id", "user_id", "unpublish_token"],
  testimonial_prompt_events: ["user_id"],
  demo_accounts: ["user_id"],
  feedback_email_sends: ["id", "user_id", "form_token"],
};

/** Column defaults the real schema generates (mirrors the migrations). */
const hex48 = () => Array.from({ length: 48 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const COLUMN_DEFAULTS: Record<string, Record<string, () => unknown>> = {
  testimonials: {
    unpublish_token: hex48,
    publish_after: () => new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    created_at: () => new Date().toISOString(),
    status: () => "pending",
    consent: () => false,
  },
  feedback_email_sends: {
    form_token: hex48,
    sent_at: () => new Date().toISOString(),
  },
  testimonial_prompt_events: {
    shown_at: () => new Date().toISOString(),
  },
  billing_unresolved_events: {
    created_at: () => new Date().toISOString(),
  },
};

function withDefaults(table: string, row: Row): Row {
  const defaults = COLUMN_DEFAULTS[table];
  if (!defaults) return row;
  const out = { ...row };
  for (const [column, make] of Object.entries(defaults)) {
    if (out[column] === undefined) out[column] = make();
  }
  return out;
}

type Filter = (row: Row) => boolean;

type QueryState = {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload: Row | Row[] | null;
  upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean };
  filters: Filter[];
  returnRows: boolean;
  wantCount: boolean;
  headOnly: boolean;
  order: { column: string; ascending: boolean } | null;
  limit: number | null;
  range: { from: number; to: number } | null;
};

function parseOr(expression: string): Filter {
  const clauses = expression.split(",").map((clause) => clause.trim());
  const predicates: Filter[] = clauses.map((clause) => {
    const [column, operator, ...rest] = clause.split(".");
    const value = rest.join(".");
    switch (operator) {
      case "is":
        return (row) => (value === "null" ? row[column] == null : Boolean(row[column]) === (value === "true"));
      case "lt":
        return (row) => row[column] != null && String(row[column]) < value;
      case "gt":
        return (row) => row[column] != null && String(row[column]) > value;
      case "eq":
        return (row) => String(row[column]) === value;
      default:
        throw new Error(`fake admin: unsupported or() operator ${operator}`);
    }
  });
  return (row) => predicates.some((p) => p(row));
}

export function createFakeAdmin(options: {
  tables?: Record<string, Row[]>;
  users?: FakeAuthUser[];
  /** Tables that "do not exist" — every query returns 42P01. */
  missingTables?: string[];
} = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(options.tables ?? {})) {
    tables[name] = rows.map((row) => ({ ...row }));
  }
  const users = [...(options.users ?? [])];
  const missing = new Set(options.missingTables ?? []);
  let idCounter = 0;

  function ensure(table: string): Row[] {
    if (!tables[table]) tables[table] = [];
    return tables[table];
  }

  function violatesUnique(table: string, candidate: Row, ignoreIndex = -1): boolean {
    const rows = ensure(table);
    for (const column of UNIQUE_COLUMNS[table] ?? []) {
      const value = candidate[column];
      if (value == null) continue;
      if (rows.some((row, index) => index !== ignoreIndex && row[column] === value)) return true;
    }
    return false;
  }

  function execute(state: QueryState): { data: unknown; error: { code: string; message: string } | null; count?: number } {
    if (missing.has(state.table)) {
      return {
        data: null,
        error: { code: "42P01", message: `relation "public.${state.table}" does not exist` },
      };
    }
    const rows = ensure(state.table);
    const matches = () => rows.filter((row) => state.filters.every((f) => f(row)));

    if (state.op === "select") {
      let out = matches();
      if (state.order) {
        const { column, ascending } = state.order;
        out = [...out].sort((a, b) => {
          const av = String(a[column] ?? "");
          const bv = String(b[column] ?? "");
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      const total = out.length;
      if (state.range) out = out.slice(state.range.from, state.range.to + 1);
      if (state.limit != null) out = out.slice(0, state.limit);
      return {
        data: state.headOnly ? null : out.map((row) => ({ ...row })),
        error: null,
        ...(state.wantCount ? { count: total } : {}),
      };
    }

    if (state.op === "insert") {
      const incoming = Array.isArray(state.payload) ? state.payload : [state.payload ?? {}];
      for (const row of incoming) {
        if (violatesUnique(state.table, row)) {
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
        }
      }
      const inserted = incoming.map((row) => withDefaults(state.table, { id: `${state.table}-${++idCounter}`, ...row }));
      rows.push(...inserted);
      return { data: state.returnRows ? inserted.map((row) => ({ ...row })) : null, error: null };
    }

    if (state.op === "update") {
      const patch = (state.payload ?? {}) as Row;
      const updated: Row[] = [];
      for (const row of rows) {
        if (state.filters.every((f) => f(row))) {
          Object.assign(row, patch);
          updated.push({ ...row });
        }
      }
      return { data: state.returnRows ? updated : null, error: null };
    }

    if (state.op === "upsert") {
      const incoming = Array.isArray(state.payload) ? state.payload : [state.payload ?? {}];
      const conflictColumn = state.upsertOptions.onConflict ?? "id";
      const written: Row[] = [];
      for (const row of incoming) {
        const index = rows.findIndex((existing) => existing[conflictColumn] === row[conflictColumn]);
        if (index >= 0) {
          if (state.upsertOptions.ignoreDuplicates) continue;
          Object.assign(rows[index], row);
          written.push({ ...rows[index] });
        } else {
          if (violatesUnique(state.table, row)) {
            return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
          }
          const created = withDefaults(state.table, { id: `${state.table}-${++idCounter}`, ...row });
          rows.push(created);
          written.push({ ...created });
        }
      }
      return { data: state.returnRows ? written : null, error: null };
    }
    throw new Error(`fake admin: unsupported op ${state.op}`);
  }

  function builder(table: string) {
    const state: QueryState = {
      table,
      op: "select",
      payload: null,
      upsertOptions: {},
      filters: [],
      returnRows: false,
      wantCount: false,
      headOnly: false,
      order: null,
      limit: null,
      range: null,
    };
    const api = {
      select(_columns?: string, options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
        if (options?.count) state.wantCount = true;
        if (options?.head) state.headOnly = true;
        if (state.op === "select") return api;
        state.returnRows = true;
        return api;
      },
      insert(payload: Row | Row[]) {
        state.op = "insert";
        state.payload = payload;
        return api;
      },
      update(payload: Row) {
        state.op = "update";
        state.payload = payload;
        return api;
      },
      upsert(payload: Row | Row[], upsertOptions: QueryState["upsertOptions"] = {}) {
        state.op = "upsert";
        state.payload = payload;
        state.upsertOptions = upsertOptions;
        return api;
      },
      eq(column: string, value: unknown) {
        state.filters.push((row) => row[column] === value);
        return api;
      },
      neq(column: string, value: unknown) {
        state.filters.push((row) => row[column] !== value);
        return api;
      },
      in(column: string, values: unknown[]) {
        state.filters.push((row) => values.includes(row[column]));
        return api;
      },
      is(column: string, value: unknown) {
        state.filters.push((row) => (value === null ? row[column] == null : row[column] === value));
        return api;
      },
      lt(column: string, value: unknown) {
        state.filters.push((row) => row[column] != null && String(row[column]) < String(value));
        return api;
      },
      lte(column: string, value: unknown) {
        state.filters.push((row) => row[column] != null && String(row[column]) <= String(value));
        return api;
      },
      gte(column: string, value: unknown) {
        state.filters.push((row) => row[column] != null && String(row[column]) >= String(value));
        return api;
      },
      not(column: string, operator: string, value: unknown) {
        if (operator !== "in") throw new Error(`fake admin: unsupported not() operator ${operator}`);
        const list = String(value).replace(/^\(|\)$/g, "").split(",").map((v) => v.trim()).filter(Boolean);
        state.filters.push((row) => !list.includes(String(row[column])));
        return api;
      },
      gt(column: string, value: unknown) {
        state.filters.push((row) => row[column] != null && String(row[column]) > String(value));
        return api;
      },
      or(expression: string) {
        state.filters.push(parseOr(expression));
        return api;
      },
      order(column: string, opts: { ascending?: boolean } = {}) {
        state.order = { column, ascending: opts.ascending !== false };
        return api;
      },
      limit(n: number) {
        state.limit = n;
        return api;
      },
      range(from: number, to: number) {
        state.range = { from, to };
        return api;
      },
      maybeSingle() {
        const result = execute(state);
        if (result.error) return Promise.resolve({ data: null, error: result.error });
        const rows = (result.data as Row[] | null) ?? [];
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      single() {
        return api.maybeSingle();
      },
      then(onFulfilled: (value: ReturnType<typeof execute>) => unknown, onRejected?: (error: unknown) => unknown) {
        return Promise.resolve(execute(state)).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  const listUsers = async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
    const start = (page - 1) * perPage;
    return {
      data: { users: users.slice(start, start + perPage) },
      error: null,
    };
  };

  const admin = {
    from: (table: string) => builder(table),
    auth: { admin: { listUsers } },
  } as unknown as SupabaseClient;

  return {
    admin,
    tables,
    users,
    rows(table: string): Row[] {
      return ensure(table);
    },
  };
}
