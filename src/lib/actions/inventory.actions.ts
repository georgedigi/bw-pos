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
    const response = await axios.postForm<EnhancedInventoryResponse>(
      `${site_url}process.php`,
      form_data,
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
  try {
    const response = await axios.postForm<string>(
      `${site_url}process.php`,
      form_data,
    );

    if (response.data === "") {
      //No data was returned
      return null;
    }

    const args = response.data.split("|");

    const product_details: ProductPriceDetails = {
      price: parseFloat(args[0] ?? "0"),
      quantity_available: parseFloat(args[1] ?? "0"),
      tax_mode: parseInt(args[2] ?? "0"),
    };

    if (args.length <= 3) {
      return product_details;
    }

    return null;
  } catch (e) {
    console.log(JSON.stringify(e));
    if (axios.isAxiosError(e)) {
      console.log(e);
    }

    return null;
  }
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
