declare type ComboBoxProps = {
  type: string;
  data: unknown;
  setSelected: (i: any) => void;
};

declare type SiteInfo = {
  company_url: string;
  tax: string;
  app_customer_creation: string;
  mpesa_paybill: string;
  manual_mpesa: string;
  visa: string;
  credit_note: string;
  cheque: string;
  packaging_items_present: string;
  limit_devices: string;
};

declare type SiteCompany = {
  company_prefix: string;
  branch: string;
};

declare type UserAccountInfo = {
  id: string;
  user_id: string;
  real_name: string;
  default_store: string;
  default_store_name: string;
  default_till: string;
  date_format: string;
  date_spec: string;
  dec_spec: string;
  def_print_destination: string;
  def_prin_orientation: string;
  description: string; //NOTE: (teddy) User role descriptiton
  email: string;
  graphic_link: string;
  inactive: string;
  language: string;
  last_visit_date: string;
  page_size: string;
  password: string;
  percent_dec: string;
  phone: string;
  pin: string;
  pos: string;
  price_dec: string;
  print_profile: string;
  qty_dec: string;
  query_size: string;
  rates_dec: string;
  rep_popup: string;
  role_id: string;
  save_report_selections: string;
  show_codes: string;
  show_gl: string;
  show_hints: string;
  startup_tab: string;
  sticky_doc_date: string;
  theme: string;
  tho_sep: string;
  transaction_days: string;
  use_date_picker: string;
  message?: string;
  status?: string;
};

declare type CompanyReceiptInfo = {
  name: string;
  location: string;
  email: string;
  phone_number: string;
  receipt: string;
};

declare type EndpointAuthInfo = {
  url: string;
  prefix: string;
  user_id: string;
  username: string;
  default_store: string;
  site_name: string;
};

declare type AuthInfo = {
  receipt_info: CompanyReceiptInfo | null;
  site_info: SiteInfo | null;
  site_url: string | null;
  site_company: SiteCompany | null;
  account: UserAccountInfo | null;
  without_sign_in_auth: EndpointAuthInfo | null;

  clear_auth_session: () => void;
  set_site_url: (url: string) => void;
  set_site_info: (url: SiteInfo) => void;
  set_receipt_info: (url: CompanyReceiptInfo) => void;
  set_site_company: (s: SiteCompany) => void;
  set_account_info: (a: AccountInfo) => void;
  set_without_sign_in_auth: (e: EndpointAuthInfo) => void;
  get_auth_data: () => EndpointAuthInfo;
  is_authenticated: () => boolean;
};

// Inventory Types

declare type InventoryItem = {
  stock_id: string;
  description: string;
  rate: string;
  kit: string;
  units: string;
  mb_flag: string;
  branch_name: string;
  pulldown: string;
  item: string;
  price: string;
  selling_price: string;
  balance: string;
};

declare type PriceList = {
  stock_id: string;
  description: string;
  rate: string;
  kit: string;
  units: string;
  mb_flag: string;
  branch_code: string;
  category_id: string;
  branch_name: string;
  balance: string;
  price: string;
  discount_percent: number;
  discounted_price: number;
  discount_details: DiscountDetails | null;
  has_discount: boolean;
};

declare type PricingMode = {
  id: string;
  sales_type: string;
};

declare type ProductPriceDetails = {
  price: number;
  quantity_available: number;
  tax_mode: number;
};

declare type ItemType = "Sales" | "Purchases" | "All";

// Sales Order Types
declare type Customer = {
  br_name: string;
  branch_code: string;
  branch_ref: string;
  debtor_no: string;
  lat: string;
  lon: string;
  is_farmer: string;
  sales_type: string;
  pin: string;
};
declare type CustomerBranch = {
  branch_code: string;
  br_name: string;
  branch_ref: string;
  debtor_no: string;
  lat: string;
  lon: string;
};

declare type DiscountDetails = {
  discount_id: string;
  discount_type: 'item' | 'category' | 'bulk';
  discount_percent: number;
  discount_amount: number;
  lower_limit: number;
  upper_limit: number;
}

declare type DirectSalesType = {
  __typename: "direct_sales";
  customer: Customer;
  branches: CustomerBranch[];
  user: string;
  bottles_issued?: string;
  bottles_returned?: string;
  max_quantity: number;
  discount?: string;
  enhanced_item: {
    stock_id: string;
    description: string;
    rate: string;
    kit: string;
    units: string;
    mb_flag: string;
    branch_code: string;
    category_id: string;
    branch_name: string;
    balance: string;
    price: string;
    discount_percent: number;
    discounted_price: number;
    discount_details: DiscountDetails | null;
    has_discount: boolean;
  };
};

declare type OrderEntryItem = {
  item: InventoryItem;
  details: ProductPriceDetails;
  quantity: number;
} & DirectSalesType;

declare type DirectSales = Omit<
  OrderEntryItem & DirectSalesType,
  "customer" | "branches"
>;

declare type Cart = {
  cart_id: string;
  items: DirectSales[];
};

// Payment Types
declare type Payment = {
  Auto: number | string;
  name: string;
  TransID: number | string;
  TransAmount: number | string;
  TransTime: number | string;
  Transtype?: string;
  balance?: number;
};

declare type DateParams = {
  from?: string;
  to?: string;
};
declare type TransTypeSummary = {
  TransType: string | undefined;
  TotalAmount: number;
};
declare type TransactionInvItem = {
  batch_no: string;
  booking_id: string;
  booking_type: string;
  bottles_issued: string;
  bottles_returned: string;
  customer_option: string;
  customer_option_id: string;
  deposit: string;
  discount: string;
  fsalesp: string;
  item_option: string;
  item_option_id: string;
  kit: string;
  mode_prices: string;
  posBatchSelect: string;
  price: string;
  discounted_price: string;
  quantity: string;
  quantityAval: string;
  rate: string;
  tax: string;
  total: number;
  original_price: string;
  automatic_discount: string;
  manual_discount: string;
};
declare type DirectSalesType = {
  __typename: "direct_sales";
  customer: Customer;
  branches: CustomerBranch[];
  user: string;
  bottles_issued?: string;
  bottles_returned?: string;
  max_quantity: number;
  discount?: string;
};

declare type ManualBankPaymentAccount = {
  bank_account_name: string;
  ttp: string;
};

declare type PaymentCart = {
  paymentType?: string;
  payments: Payment[];
};

declare type SalesReceiptInformation = {
  message: string | object;
  invNo: string;
  delNo: string;
  vat: number;
  ttpAuto: string | null;
  weight: number;
  posSaleInsertId: number;
  qrCode: string;
  qrDate: string;
  controlCode: string;
  middlewareInvoiceNumber: string;

  mpesaRef: string | null;
  status: "Success" | "Failed";
  "0": TransactionReportItem;
  discount_summary: string;

};
declare type OfflineSalesReceiptInformation = {
  offline: true;
  uid: string;
  inv_date: string;
  pos_payments: string;
  pos_items: string;
  synced: boolean;
  synced_at: string;
};
declare type StockItem = {
  stock_id: string;
  item: string;
  balance: string;
  pulldown: string;
  selling_price: string;
  price?: string;
  branch_name?: string;
};

declare type GeneralReport = {
  status: string;
  data: GeneralSalesReportItem[];
};
declare type GeneralSalesReportItem = {
  stock_id: string;
  description: string;
  unit_price: string;
  quantity: string;
  discount: string;
  receipt_no: string;
  user_id: string;
  location_name: string;
  trans_time: string;
};

declare type CollectionReportItem = {
  id: string;
  user_id: string;
  shift_no: string;
  trans_date: string;
  pay_mode: string;
  amount: string;
  trans_time: string;
};
declare type SalesReportItem = {
  stock_id: string;
  description: string;
  unit_price: string;
  quantity: string;
  category_name: string;
  parent_item: string;
};
declare type TransactionReportItem = {
  id: string;
  ptype: string;
  ptotal: string;
  payments: string;
  pitems: string;
  branch_code: string;
  branch_name: string;
  cp: string;
  uname: string;
  uid: string;
  pdate: string;
  print: string;
  customername: string;
  customerid: string;
  pin: string;
  booking: string;
  dispatch: string;
  salepersonId: string;
  salepersonName: string;
  shift_no: string;
  unique_identifier: string;
  qrCode: string | null;
  qrDate: string | null;
  controlCode: string | null;
  middlewareInvoiceNumber: string | null;
  weight: number;
  status?: string;
  vat_amount?: string;
  discount_summary?: string;
  rcp_no: string;
  cycle_id?: string;
  offline?: string;
  trans_time?: string;
};
declare type CheckInResponse = {
  id: string;
  message: string;
  user_id: string;
};

declare type ClearanceResponse = {
  status: "Success" | "Failed";
  id?: string;
};

declare type DailyTargetReportSummary = {
  status: "SUCCESS" | "Failed";
  data: {
    target: string;
    opening_stock: string;
    sales_to_date: string;
    sales_pieces: number;
    revenue: null | number | string;
  };
};
declare type DataTableFilterField<TData> = {
  label: string;
  value: keyof TData;
  placeholder?: string;
  options?: Option[];
};

declare type UnsynchedInvoice = {
  offline: boolean;
  uid: string;
  customer: Customer;
  uname: string;
  id: string;
  pin: string;
  inv_date: string;
  pos_payments: string;
  pos_items: string;
  total: string;
  synced: boolean;
  synced_at: string;
  inv_total: string;
};

declare type LookUpResponse = {
  result: "Success" | "Failed";
  ConversationID: string;
  message?: string;
};

declare type StkPushResponse = {
  success: boolean;
  message: string;
  data: {
    insert_id: number;
    checkout_request_id: string;
    merchant_request_id: string;
    customer_message: string;
  };
};

declare type StkLookupResponse = {
  success: boolean;
  payment_success: boolean;
  payment_failed: boolean;
  payment_status: string;
  mpesa_code?: string;
  message: string;
  data?: {
    source: string;
    transaction: {
      id: number;
      phone: string;
      amount: number;
      mpesa_receipt_number: string;
      transaction_date: string;
      reference: string;
      description: string;
    };
  };
};

declare type ConversationResponse = {
  ResponseTime: string;
  TransAction:
  | "The transaction receipt number does not exist."
  | "Transaction Verified";
};

declare type Shift = {
  id: string;
  user_id: string;
  dimension_id: string;
  cycle_id: string;
  start_date: string;
  end_date: string;
  closed: string;
  user_name: string;
};
declare type SearchParams = Record<string, string | string[] | undefined>;
