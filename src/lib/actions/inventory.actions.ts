// Get All Sellable Items

import axios from "axios";
import { EnhancedPriceList } from "~/hawk-tuah/types/discount-types";

export interface EnhancedInventoryResponse {
  items: EnhancedPriceList[];
  statistics: {
    total_items: number;
    items_with_approved_discount: number;
    total_discount_amount: number;
    carrier_bags_excluded: number;
    approved_discounts_applied: number;
  };
  timestamp: string;
  branch_code: string;
  approval_filter: string;
}

export async function fetch_all_sellable_items(
  site_company: SiteCompany,
  account: UserAccountInfo,
  site_url: string,
) {
  const form_data = new FormData();
  form_data.append("tp", "loadItemsAll");
  form_data.append("cp", site_company.company_prefix);
  form_data.append("name", "%%");
  form_data.append("branch_code", account.default_store);
  form_data.append("type", "Sales");

  try {
    const response = await axios.postForm<InventoryItem[]>(
      `${site_url}process.php`,
      form_data,
    );
    if ((response as unknown as string) === "") {
      console.error("tp: loadItemsAll failed");
      //    Add sentry here
      return [];
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(error);
    }
    return null;
  }
  //   add finally to take loading into account
}

export async function fetch_all_item_inventory(
  site_company: SiteCompany,
  site_url: string,
  account: UserAccountInfo,
  stock_id?: string,
): Promise<EnhancedInventoryResponse | null> {
  const form_data = new FormData();
  form_data.append("tp", "loadItemsAllWithPriceAndBalance");
  form_data.append("cp", site_company.company_prefix);
  // If a specific stock_id is provided, fetch only that item; otherwise fetch all
  form_data.append("name", stock_id ?? "%%");
  form_data.append("branch_code", account.default_store);
  form_data.append("type", "Sales");

  try {
    // A single-item lookup runs alongside the scan's stock check, which allows
    // 20s, so the same limit adds no wait. A shorter one gave up while the
    // server was busy and the item rang up unnamed at full price.
    const response = await axios.postForm<EnhancedInventoryResponse>(
      `${site_url}process.php`,
      form_data,
      stock_id ? { timeout: 20000 } : undefined,
    );
    console.log("All item inventory: ", response);

    if ((response as unknown as string) === "") {
      console.error("tp: loadItemsAll failed");
      return null; // Fix: Return null instead of [] for consistency with return type
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(error);
    }
    return null;
  }
}

export async function fetch_item_details(
  site_url: string,
  company_prefix: string,
  user_id: string,
  stock_id: string,
  kit: string,
  pricing_id: PricingMode | undefined,
) {
  const form_data = new FormData();
  form_data.append("tp", "getItemPriceQtyTaxWithId");
  form_data.append("it", stock_id);
  form_data.append("cp", company_prefix);
  form_data.append("kit", kit);
  form_data.append("id", user_id);
  if (pricing_id) {
    form_data.append("pid", pricing_id.id);
  }
  const response = await axios.postForm<string>(
    `${site_url}process.php`,
    form_data,
    { timeout: 20000 },
  );

  if (response.data === "") {
    // Server explicitly has no record for this code — genuinely "not found",
    // not a network/request failure, so don't throw here.
    return null;
  }

  const args = response.data.split("|");

  if (args.length > 3) {
    throw new Error("Unexpected response from server — please rescan");
  }

  const price = parseFloat(args[0] ?? "");
  const quantity_available = parseFloat(args[1] ?? "");
  const tax_mode = parseInt(args[2] ?? "", 10);

  if (
    Number.isNaN(price) ||
    Number.isNaN(quantity_available) ||
    Number.isNaN(tax_mode)
  ) {
    // A malformed/empty segment used to silently become 0 (false "out of
    // stock") or NaN (silently bypassing the stock check). Surface it instead.
    throw new Error("Received invalid stock data from server — please rescan");
  }

  return { price, quantity_available, tax_mode } satisfies ProductPriceDetails;
}

export async function fetch_branch_discount_rules(
  site_url: string,
  company_prefix: string,
  branch_code: string,
) {
  const form_data = new FormData();
  form_data.append("tp", "get_discounts_by_branch"); 
  form_data.append("cp", company_prefix);
  form_data.append("branch_code", branch_code); // (TODO): Confirm paramenter name was inserted by backend team

  try {
    const response = await axios.postForm<{ status: string, data: any[] }>(
      `${site_url}process.php`,
      form_data,
    );

    if (response.data.status === "SUCCESS") {
      return response.data.data;
    }

    console.error("Failed to fetch discount rules:", response.data);
    return [];
  } catch (error) {
    console.error("Error fetching discount rules:", error);
    return [];
  }
}

export async function fetch_branch_inventory(
  site_company: SiteCompany,
  account: UserAccountInfo,
  site_url: string,
) {
  const form_data = new FormData();
  form_data.append("tp", "userStoreBalance");
  form_data.append("cp", site_company.company_prefix);
  form_data.append("id", account.id);
  form_data.append("loc_code", account.default_store);

  try {
    const response = await axios.postForm<StockItem[]>(
      `${site_url}process.php`,
      form_data,
    );
    console.log("Branch inventory: ", response);
    if ((response as unknown as string) === "") {
      console.error("tp: userStoreBalance failed");
      //    Add sentry here
      return [];
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(error);
    }
    return null;
  }
}

export async function fetchAllItemsInSiteInventory(
  site_company: SiteCompany,
  site_url: string,
  // account: UserAccountInfo,
) {
  const form_data = new FormData();
  form_data.append("tp", "loadItemsAllWithPriceAndBalance");
  form_data.append("cp", site_company.company_prefix);
  form_data.append("name", "%%");
  // form_data.append("branch_code", account.default_store);
  form_data.append("type", "Sales");

  try {
    const response = await axios.postForm<PriceList[]>(
      `${site_url}process.php`,
      form_data,
    );
    console.log("All site item inventory: ", response);

    if ((response as unknown as string) === "") {
      console.error("tp: loadItemsAll failed");
      //    Add sentry here
      return [];
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(error);
    }
    return null;
  }
}

// Per-piece grading labels (e.g. GM8-D3-49) are not stock items: each piece of
// a graded item carries its own label, which sells as that item and only once.
// Ask the server whether a code is a label before it goes into the cart.
// null = not a label; undefined = the server could not be asked (offline, or a
// backend without labels), so the caller treats the code as before.
export type GradingTag = {
  code: string;
  item_code: string;
  sold: number;
  voided: number;
  // why a cancelled label was cancelled: null = its grading order changed,
  // "returned" = returned to HQ at the end of its cycle, "baled" = cleared to
  // bales. Absent on a backend older than this field.
  void_reason?: string | null;
  sold_receipt: string | null;
  // Only when a cart was given and the label can be sold: 1 = now held for
  // that cart, 0 = another cart holds it. Absent on a backend older than this.
  reserved?: number;
};

// With `cart`, a label that can be sold is also reserved for that cart, so it
// cannot be scanned into any other cart until it is released or paid for.
export async function lookup_grading_tag(
  site_url: string,
  company_prefix: string,
  code: string,
  cart?: string,
): Promise<GradingTag | null | undefined> {
  const form_data = new FormData();
  form_data.append("tp", "gradingtaglookup");
  form_data.append("cp", company_prefix);
  form_data.append("code", code);
  if (cart) form_data.append("cart", cart);
  try {
    const response = await axios.postForm<{ status?: string; tag?: GradingTag | null }>(
      `${site_url}process.php`,
      form_data,
      { timeout: 20000 },
    );
    if (response.data?.status !== "SUCCESS") return undefined;
    return response.data.tag ?? null;
  } catch (e) {
    console.error("tp: gradingtaglookup failed", e);
    return undefined;
  }
}

// Give back labels a cart reserved when they were scanned: one label, or all
// of the cart's when no code is given. Best effort; a reservation left behind
// lapses on the server after 15 minutes.
export async function release_grading_tag(
  site_url: string,
  company_prefix: string,
  cart: string,
  code?: string,
): Promise<void> {
  const form_data = new FormData();
  form_data.append("tp", "gradingtagrelease");
  form_data.append("cp", company_prefix);
  form_data.append("cart", cart);
  if (code) form_data.append("code", code);
  try {
    await axios.postForm(`${site_url}process.php`, form_data);
  } catch (e) {
    console.error("tp: gradingtagrelease failed", e);
  }
}
