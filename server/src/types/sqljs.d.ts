declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): void
    prepare(sql: string): Statement
    export(): Uint8Array
  }

  export interface Statement {
    bind(params?: unknown[]): void
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}
