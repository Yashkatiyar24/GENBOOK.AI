declare module 'morgan' {
  const m: any;
  export default m;
}

declare module 'prom-client' {
  const c: any;
  export default c;
  export = c;
}

declare module 'winston' {
  const w: any;
  export default w;
  export = w;
}

declare module 'redis' {
  export type RedisClientType = any;
  export function createClient(opts: any): RedisClientType;
}
