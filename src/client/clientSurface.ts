export type ClientSurface = "phone" | "tv";

export function selectClientSurface(pathname: string): ClientSurface {
  return pathname.startsWith("/tv") ? "tv" : "phone";
}
