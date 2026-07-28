import dns from "node:dns";

type Resolve6Callback = (err: NodeJS.ErrnoException | null, addresses: string[]) => void;

// nodemailer resolves both A and AAAA records for SMTP_HOST and picks between them;
// some ISPs advertise IPv6 routes to Google that aren't actually reachable, causing
// EHOSTUNREACH. Returning no AAAA records forces IPv4-only without touching the host's network config.
export function forceIpv4Dns(): void {
  dns.Resolver.prototype.resolve6 = ((_hostname: string, callback: Resolve6Callback) => callback(null, [])) as typeof dns.Resolver.prototype.resolve6;
}
