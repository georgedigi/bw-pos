"use client";
import axios from "axios";
import { useAuthStore } from "~/store/auth-store";

// The server keeps a copy of every cart and a log of each change to it
// (process.php cart_sync / cart_open). The cart used to live only in this
// browser, so a cache clear, another browser or a crash lost it without a
// trace, and pieces paid for in cash could go back into stock unrecorded.
// Changes are sent in the background, in order; ones that fail wait in
// localStorage and go with the next change. Scanning never waits for this.

export type CartEvent = "add" | "qty" | "remove" | "discount" | "drop";

type Pending = {
  cart_id: string;
  event: CartEvent;
  items: string;
  code: string;
  description: string;
  qty: string;
  price: string;
};

const QUEUE_KEY = "cart_sync_queue";
const QUEUE_MAX = 300;
let flushing = false;

const readQueue = (): Pending[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Pending[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: Pending[]) => {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-QUEUE_MAX)));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // storage full or blocked: the server keeps what already reached it
  }
};

const auth = () => {
  const { site_url, site_company, account } = useAuthStore.getState();
  if (!site_url || !site_company || !account) return null;
  return { url: `${site_url}process.php`, cp: site_company.company_prefix, id: account.id };
};

const flush = async () => {
  if (flushing) return;
  const a = auth();
  if (!a) return;
  flushing = true;
  try {
    let queue = readQueue();
    while (queue.length) {
      const p = queue[0]!;
      const form = new FormData();
      form.append("tp", "cart_sync");
      form.append("cp", a.cp);
      form.append("id", a.id);
      Object.entries(p).forEach(([k, v]) => form.append(k, v));
      try {
        await axios.postForm(a.url, form, { timeout: 15000 });
      } catch {
        break; // offline or server down: keep it for the next change
      }
      // a refused change (bad cart id) is dropped too, or it would block the rest
      queue = readQueue().slice(1);
      writeQueue(queue);
    }
  } finally {
    flushing = false;
  }
};

export const syncCart = (event: CartEvent, cart: Cart, item?: DirectSales) => {
  if (typeof window === "undefined") return;
  writeQueue([
    ...readQueue(),
    {
      cart_id: cart.cart_id,
      event,
      items: JSON.stringify(cart.items),
      code: item?.item.stock_id ?? "",
      description: item?.item.description ?? "",
      qty: item ? String(item.quantity) : "",
      price: item ? String(item.details?.price ?? "") : "",
    },
  ]);
  void flush();
};

// The cashier's unpaid cart on the server, for a till that starts with none.
export const fetchOpenCart = async (): Promise<Cart | null> => {
  const a = auth();
  if (!a) return null;
  const form = new FormData();
  form.append("tp", "cart_open");
  form.append("cp", a.cp);
  form.append("id", a.id);
  try {
    const res = await axios.postForm<{ status: string; cart?: Cart }>(a.url, form, { timeout: 15000 });
    const cart = res.data?.cart;
    return res.data?.status === "SUCCESS" && cart?.cart_id && Array.isArray(cart.items) && cart.items.length
      ? cart
      : null;
  } catch {
    return null;
  }
};
