import { proxy } from "./proxy-middleware";

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};

export default proxy;
