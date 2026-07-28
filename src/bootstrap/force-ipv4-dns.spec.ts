import dns from "node:dns";

import { forceIpv4Dns } from "./force-ipv4-dns";

describe("forceIpv4Dns", () => {
  const originalResolve6 = dns.Resolver.prototype.resolve6;

  afterEach(() => {
    dns.Resolver.prototype.resolve6 = originalResolve6;
  });

  it("patches Resolver.prototype.resolve6 to report no AAAA records", () => {
    forceIpv4Dns();

    const callback = jest.fn();
    new dns.Resolver().resolve6("smtp.gmail.com", callback);

    expect(callback).toHaveBeenCalledWith(null, []);
  });
});
