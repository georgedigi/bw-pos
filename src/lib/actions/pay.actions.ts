import axios from "axios";
import { toDBDate } from "../utils";
import { updateInvoice } from "~/utils/indexeddb";

export async function submit_direct_sale_request(
  //receipt_info: CompanyReceiptInfo,
  site_url: string,
  company_prefix: string,
  user_id: string,
  username: string,
  data_items: DirectSales[],
  customer: Customer,
  payments: PaymentCart[],
  customer_name: string,
  uid: string,
  pin: string,
) {
  console.log("Submitting payment details for direct sale");

  const total = data_items.reduce(
    (x, y) => x + y.details.price * y.quantity,
    0,
  );
  console.log("total", total);

  if (data_items) {
    data_items.map((x) => {
      if (x.quantity > x.max_quantity) {
        return null;
      }
    });
  }
  console.log("data_items", data_items);
  const items = data_items.map((x: DirectSales) => {
    const tax = (parseInt(x.item.rate) * x.details.price) / 100;
    const item_total = x.details.price * x.quantity;

    return {
      quantity: x.quantity.toFixed(2),
      quantityAval: x.details.quantity_available.toFixed(2),
      booking_id: "",
      customer_option: customer.br_name,
      // new user will not have branch code
      customer_option_id: customer.branch_code,
      booking_type: "",
      discount: x.discount ?? "0",
      mode_prices: "1",
      kit: x.item.kit,
      batch_no: "",
      // tax is not applicable for direct sale
      tax: tax.toFixed(2),
      item_option: x.item.description,
      item_option_id: x.item.stock_id,
      rate: x.item.rate,
      deposit: "",
      total: item_total.toFixed(2),
      price: x.details.price.toFixed(2),
      posBatchSelect: "",
      bottles_issued: x.bottles_issued ?? "",
      bottles_returned: x.bottles_returned ?? "",
      fsalesp: "",
    };
  });

  const payment = payments.flatMap((x) =>
    x.payments.map((y) => ({
      ...y,
      Transtype: x.paymentType,
    })),
  );

  console.log("payment", payment);
  console.log("items", items);

  const form_data = new FormData();
  form_data.append("tp", "booking-cash-payment");
  form_data.append("cp", company_prefix);
  form_data.append("id", user_id);
  form_data.append("ttp", payments[0]!.paymentType!);
  form_data.append("total", total.toString());
  form_data.append("pospayments", JSON.stringify(payment));
  form_data.append("posdesc", JSON.stringify(items));
  form_data.append("uname", username);
  form_data.append("cpbooking_id", "");
  form_data.append("cust_name", customer_name);
  form_data.append("unique_identifier", uid);
  form_data.append("cust_pin", pin);

  try {
    if (navigator.onLine) {
      const response = await axios.postForm<
        SalesReceiptInformation | OfflineSalesReceiptInformation
      >(`${site_url}process.php`, form_data);
      console.log("Submission successful");
      console.log("SALES RESPONSE", response.data);

      if (typeof response.data === "string") {
        // SEND STRING TO SENTRY
        return null;
      }
      console.log("SALES RESPONSE", response.data);
      return response.data;
    }
    // else {
    //   console.log("Offline: Saving data to IndexedDB");
    else {
      return {
        offline: true,
        uid,
        customer: customer,
        uname: username,
        id: user_id,
        pin: pin,
        inv_date: new Date().toISOString(),
        pos_payments: JSON.stringify(payment),
        pos_items: JSON.stringify(items),
        total: total.toString(),
        synced: false,
        synced_at: "",
      };
    }
  } catch (e) {
    console.error(e);
    // TODO: SHOULD WE SAVE TO INDEXEDDB?
    if (axios.isAxiosError(e)) {
      console.error(e);
      return {
        offline: true,
        uid,
        customer: customer,
        uname: username,
        id: user_id,
        pin: pin,
        inv_date: new Date().toISOString(),
        pos_payments: JSON.stringify(payment),
        pos_items: JSON.stringify(items),
        total: total.toString(),
        synced: false,
        synced_at: "",
      };
    } else {
      console.error("Failed to submit direct sale data");
      return null;
    }
  }
}

export async function sync_invoice(
  site_url: string,
  company_prefix: string,
  invoice: UnsynchedInvoice,
) {
  const payments: PaymentCart[] = JSON.parse(invoice.pos_payments);
  const trans_date = toDBDate(invoice.inv_date);
  const form_data = new FormData();
  form_data.append("tp", "booking-cash-payment");
  form_data.append("cp", company_prefix);
  form_data.append("id", invoice.id);
  form_data.append("ttp", payments[0]!.paymentType!);
  form_data.append("total", invoice.total);
  form_data.append("pospayments", invoice.pos_payments);
  form_data.append("posdesc", invoice.pos_items);
  form_data.append("uname", invoice.uname);
  form_data.append("cpbooking_id", "");
  form_data.append("cust_name", invoice.customer.br_name);
  form_data.append("unique_identifier", invoice.uid);
  form_data.append("cust_pin", invoice.pin);
  form_data.append("offline", "1");
  form_data.append("trans_date", trans_date);

  try {
    const response = await axios.postForm<SalesReceiptInformation>(
      `${site_url}process.php`,
      form_data,
    );
    console.log("response", response);
    if (typeof response.data === "string") {
      // SEND STRING TO SENTRY
      return null;
    }
    if (response.data.message === "Success") {
      invoice.synced = true;
      invoice.synced_at = new Date().toISOString();
      invoice.offline = false;

      await updateInvoice(invoice.uid, invoice);
    }
    return response.data;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function fetch_customers(
  site_url: string,
  company_prefix: string,
) {
  const form_data = new FormData();
  form_data.append("tp", "loadCustomersBranches");
  form_data.append("cp", company_prefix);
  form_data.append("name", "%%");

  try {
    const response = await axios.postForm<Customer[]>(
      `${site_url}process.php`,
      form_data,
    );

    if (typeof response.data === "string" && (response.data as string) === "") {
      return null;
    }

    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log(e);
    }
    return null;
  }
}

export async function fetch_mpesa_transactions(
  site_url: string,
  company_prefix: string,
  user_id: string,
) {
  const form = new FormData();
  form.append("tp", "loadMpesaTransaction");
  form.append("cp", company_prefix);
  form.append("id", user_id);

  try {
    const response = await axios.postForm<Payment[]>(
      `${site_url}process.php`,
      form,
    );

    console.log("MPESA ", response.data);

    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log("Failed to load mpesa transactions");
    }
    console.log(e);
  }

  return null;
}

export async function fetch_manual_bank_payment_accounts(
  site_url: string,
  company_prefix: string,
  user_id: string,
) {
  const form = new FormData();
  form.append("tp", "getManualBanks");
  form.append("cp", company_prefix);
  form.append("id", user_id);

  try {
    const response = await axios.postForm<ManualBankPaymentAccount[]>(
      `${site_url}process.php`,
      form,
    );

    if (typeof response.data === "string") {
      console.log("Payment accounts not loaded");
      return null;
    }
    return response.data;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function lookup_mpesa_payment(
  ref: string,
  site_url: string,
  company_prefix: string,
  user_id: string,
  short_code: string,
) {
  const form = new FormData();
  form.append("tp", "MpesaTransactionStatus");
  form.append("cp", company_prefix);
  form.append("id", user_id);
  form.append("trans_id", ref);
  form.append("short_code", short_code);

  try {
  const response = await axios.get<LookUpResponse>(
      `${site_url}BankIntergrations/Mpesa/routes/lookup.php`,
      {
        params: {
          checkout_request_id: ref,
        },
      }
    );

    if (response.data.result === "Failed") {
      return null;
    }

    await delay(3000);

    const transaction = await handleTransactionEnd(
      site_url,
      company_prefix,
      response.data.ConversationID,
      ref,
      user_id,
    );
    return transaction;

    // return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log("Failed to load mpesa transactions");
    }
    console.log(e);
    return null;
  }
}

async function handleTransactionEnd(
  site_url: string,
  cp: string,
  conversation_id: string,
  ref: string,
  user_id: string,
) {
  try {
    const conversation = await lookup_mpesa_end(site_url, cp, conversation_id);
    if (
      conversation &&
      conversation[0]?.TransAction ===
        "The transaction receipt number does not exist."
    ) {
      return {
        result: "Failed",
        message: "Transaction number does not exist.",
      };
    }

    const transactions = await fetch_mpesa_transactions(site_url, cp, user_id);
    const foundTransaction = transactions?.find((tx) => tx.TransID === ref);

    if (foundTransaction) {
      console.log("Found transaction", foundTransaction);
      return foundTransaction;
    } else {
      console.log("Transaction not found after conversation end.");
      return null;
    }
  } catch (error) {
    console.log("Failed to end conversation");
    return null;
  }
}

export async function lookup_mpesa_end(
  site_url: string,
  cp: string,
  conversation_id: string,
) {
  const form = new FormData();
  form.append("tp", "MpesaTransactionResponse");
  form.append("cp", cp);
  form.append("ConversationID", conversation_id);

  try {
    const response = await axios.postForm<ConversationResponse[]>(
      `${site_url}process.php`,
      form,
    );

    console.log("MPESA ", response.data);

    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log("Failed to load mpesa transactions");
    }
    console.log(e);
    return null;
  }
}

export async function initiate_stk_push(
  site_url: string,
  phone: string,
  amount: number,
  reference: string,
  description: string,
  branch: string,
  short_code = "",
  till_no = "",
): Promise<StkPushResponse> {
  const response = await axios.post<StkPushResponse>(
    `${site_url}BankIntergrations/Mpesa/routes/stk_push.php`,
    { phone, amount, reference, description, short_code, till_no, branch }
  );

  return response.data;
}

// Include the till context and preserve server error messages regardless of HTTP status.
export async function lookup_mpesa_by_code(
  site_url: string,
  mpesa_code: string,
  branch = "",
  cp = "",
): Promise<StkLookupResponse> {
  try {
    const response = await axios.get<StkLookupResponse>(
      `${site_url}BankIntergrations/Mpesa/routes/lookup.php`,
      {
        params: { mpesa_code, ...(branch ? { branch } : {}), ...(cp ? { cp } : {}) },
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError<StkLookupResponse>(error)) {
      const message = error.response?.data?.message;
      if (typeof message === "string" && message.trim()) {
        return {
          success: false,
          payment_status: "error",
          payment_success: false,
          payment_failed: true,
          message,
        };
      }
    }
    throw error;
  }
}

// Look a code up, and while the server is still asking Safaricom ("pending") ask again on our own
// every few seconds, instead of showing that as an error and leaving the cashier to press Lookup
// again. Returns the last reply: found, already used, not found, or still pending at the timeout.
export async function find_mpesa_by_code(
  site_url: string,
  mpesa_code: string,
  branch = "",
  cp = "",
  onWaiting?: (message: string) => void,
  intervalMs = 4000,
  timeoutMs = 45000,
): Promise<StkLookupResponse> {
  const started = Date.now();
  for (;;) {
    const res = await lookup_mpesa_by_code(site_url, mpesa_code.trim().toUpperCase(), branch, cp);
    if (res.payment_status !== "pending" || Date.now() - started >= timeoutMs) return res;
    onWaiting?.(res.message || "Checking with Safaricom...");
    await delay(intervalMs);
  }
}

export async function lookup_stk_payment(
  site_url: string,
  checkout_request_id: string,
): Promise<StkLookupResponse> {
  const response = await axios.get<StkLookupResponse>(
    `${site_url}BankIntergrations/Mpesa/routes/lookup.php`,
    { params: { checkout_request_id } },
  );
  console.log("STK Lookup response:", response.data);
  return response.data;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
