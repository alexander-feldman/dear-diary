declare module "@supabase/ssr" {
  type QueryResult<T = unknown> = Promise<{ data: T; error: { message: string } | null }>;
  type SupabaseClient = {
    auth: {
      getUser(): QueryResult<{ user: { id: string } | null }>;
      signInWithOtp(options: { email: string; options?: { shouldCreateUser?: boolean } }): QueryResult;
      verifyOtp(options: { email: string; token: string; type: "email" }): QueryResult;
      signOut(): QueryResult;
    };
    from(table: string): {
      select(columns?: string): { eq(column: string, value: unknown): { maybeSingle(): QueryResult<Record<string, unknown> | null> } };
    };
    rpc(functionName: string, args?: Record<string, unknown>): QueryResult<boolean>;
  };
  export function createBrowserClient(url: string, key: string): SupabaseClient;
  export function createServerClient(url: string, key: string, options: unknown): SupabaseClient;
}
