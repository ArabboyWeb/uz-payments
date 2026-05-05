import { createPaymeNextHandler } from "@uz-payments/next";

import { callbacks, payme } from "../../../lib/payme";

export const runtime = "nodejs";

export const POST = createPaymeNextHandler(payme, callbacks);
