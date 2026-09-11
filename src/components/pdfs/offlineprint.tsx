import React from "react";
import {
  Document,
  Page,
  Text,
  Image,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import QrCode from "qrcode";

import {
  calculateOfflineSubtotalAndDiscount,
  calculateSubtotalAndDiscount,
  tallyTotalAmountPaid,
} from "~/lib/utils";
Font.register({
  family: "Courier Prime",
  src: "http://fonts.gstatic.com/s/raleway/v11/bIcY3_3JNqUVRAQQRNVteQ.ttf",
});
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 4,
  },

  company_section: {
    marginBottom: 5,
    marginTop: 10,
    textAlign: "left",
    fontFamily: "Courier Prime",
  },
  customer_section: {
    marginBottom: 5,
    textAlign: "left",
    fontFamily: "Courier Prime",
  },
  header: {
    fontSize: 8,
    marginBottom: 5,
    fontFamily: "Courier Prime",
  },
  text: {
    fontSize: 8,
  },
  textImportant: {
    fontSize: 8,
    fontWeight: 700,
  },
  table: {
    display: "flex",
    flexDirection: "column",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeader: {
    width: "35rem",
  },
  tableCol: {
    width: "40rem",
    borderStyle: "solid",
  },
  tableCell: {
    margin: 5,
    fontSize: 7,
    fontFamily: "Courier Prime",
  },
  table_col: {
    paddingHorizontal: 1,
    borderTopColor: "#000",
    borderTopWidth: 0.5,
    padding: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
  },
  table_row_last: {
    paddingHorizontal: 1,
    padding: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
  },
  table_col_last_row: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
  },
});

const OfflineTransactionReceiptPDF = ({
  data,
  receipt_info,
  account,
  duplicate,
}: {
  data: UnsynchedInvoice;
  receipt_info: CompanyReceiptInfo;
  account: UserAccountInfo;
  duplicate: boolean;
}) => {
  const items: TransactionInvItem[] =
    data.pos_items.length > 0 ? JSON.parse(data.pos_items) : [];
  const payments: Payment[] =
    data.pos_payments.length > 0 ? JSON.parse(data.pos_payments) : [];

  function get_printout_size(length: number): [number, number] {
    return [200, 477 + length * 10];
  }

  function sumTransAmount(payments: Payment[]): number {
    console.log("payments", payments);
    return payments.reduce((sum, payment) => {
      const amount =
        typeof payment.TransAmount === "string"
          ? parseFloat(payment.TransAmount)
          : payment.TransAmount;
      const balance =
        payment.balance !== undefined
          ? typeof payment.balance === "string"
            ? parseFloat(payment.balance)
            : payment.balance
          : 0;
      return (
        sum + (isNaN(amount) ? 0 : amount) + (isNaN(balance) ? 0 : balance)
      );
    }, 0);
  }

  const calculateTotalQuantity = (items: TransactionInvItem[]): number => {
    return items.reduce((total, item) => total + parseFloat(item.quantity), 0);
  };
  const totalDiscount = calculateOfflineSubtotalAndDiscount(data);
  const totalQuantity = calculateTotalQuantity(items);
  const totalPaid = sumTransAmount(payments);

  //   console.log("sub_total", totalDiscount);

  const kra_code = async () => await QrCode.toDataURL("Digisales No KRA");
  return (
    <Document>
      <Page
        size={get_printout_size(items.length + payments.length + 3)}
        style={{ padding: 2 }}
      >
        <View>
          <View
            style={{
              paddingVertical: 2,
              alignItems: "center",
            }}
          >
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 4 }]}
            >
              {`${receipt_info.name}`}
            </Text>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              {`Email: ${receipt_info.email}`}:
            </Text>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              {`Phone Number: ${receipt_info.phone_number}`}
            </Text>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              {`KRA Pin: ${receipt_info.receipt}`}
            </Text>
          </View>
          <View>
            <View
              style={{
                paddingVertical: 1,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View style={{ width: "100%" }}>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Customer:</Text>
                  <Text style={[styles.text, {}]}>
                    {` ${data.customer.br_name ?? "N/A"}`}
                  </Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text]}>Customer Pin: </Text>
                  <Text style={[styles.text]}>{` ${data.pin ?? "N/A"}`}</Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Print Out Date</Text>
                  <Text style={[styles.text, {}]}>
                    {new Date().toLocaleString()}
                  </Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Cashier</Text>
                  <Text style={[styles.text, {}]}>{account.real_name}</Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Branch ID</Text>
                  <Text style={[styles.text, {}]}>
                    {account.default_store_name}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View
            style={{
              borderBottomWidth: 0.2,
              borderBottomColor: "#000",
              borderTopColor: "#000",
              borderTopWidth: 0.2,
              paddingVertical: 1,
              flexDirection: "column",
            }}
          >
            <Text style={[styles.text, { fontWeight: "bold" }]}>
              {`Trans ID: ${data.uid}`}
            </Text>
            <Text style={[styles.text, { fontWeight: "bold" }]}>
              {duplicate
                ? "Transaction Receipt"
                : "Transaction Receipt - Reprint"}
            </Text>
          </View>
        </View>

        <View style={{ paddingVertical: 1 }}>
          <Text
            style={[
              styles.text,
              {
                marginBottom: 1,
                fontWeight: "bold",
              },
            ]}
          >
            Items
          </Text>
          <View style={{ flexDirection: "row" }}>
            <View
              style={[
                styles.table_col,
                { width: "47%" },
                {
                  borderLeftWidth: 0.2,
                  borderLeftColor: "#000",
                },
              ]}
            >
              <Text style={[styles.text, { fontWeight: "bold" }]}>Name</Text>
            </View>
            <View style={[styles.table_col, { width: "13%" }]}>
              <Text style={[styles.text, { fontWeight: "bold" }]}>Qty</Text>
            </View>
            <View style={[styles.table_col, { width: "20%" }]}>
              <Text style={[styles.text, { fontWeight: "bold" }]}>
                Price(KES)
              </Text>
            </View>
            <View style={[styles.table_col, { width: "20%" }]}>
              <Text style={[styles.text, { fontWeight: "bold" }]}>
                Total(KES)
              </Text>
            </View>
          </View>
          {items.map((item, index, array) => {
            return (
              <View style={{ flexDirection: "row" }} key={index}>
                <View
                  style={[
                    styles.table_col,
                    { width: "47%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                    { borderLeftWidth: 0.3, borderLeftColor: "#000" },
                  ]}
                >
                  <Text style={[styles.text]}>{item.item_option}</Text>
                </View>
                <View
                  style={[
                    styles.table_col,
                    { width: "13%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                  ]}
                >
                  <Text style={[styles.text]}>{item.quantity}</Text>
                </View>
                <View
                  style={[
                    styles.table_col,
                    { width: "20%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                  ]}
                >
                  <Text style={[styles.text]}>{`${item.price}`}</Text>
                </View>
                <View
                  style={[
                    styles.table_col,
                    { width: "20%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                  ]}
                >
                  <Text style={[styles.text]}>
                    {`${parseFloat(item.quantity) * parseFloat(item.price)}`}
                  </Text>
                </View>
              </View>
            );
            // <View style={styles.tableRow} key={index}>
            //   <View style={[styles.tableCol, { width: "60rem" }]}>
            //     <Text style={styles.tableCell}>{item.item_option}</Text>
            //   </View>
            //   <View style={styles.tableCol}>
            //     <Text style={styles.tableCell}>{item.quantity}</Text>
            //   </View>
            //   <View style={styles.tableCol}>
            //     <Text style={styles.tableCell}>{item.price}</Text>
            //   </View>
            //   <View style={styles.tableCol}>
            //     <Text style={styles.tableCell}>
            //       {(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(
            //         2,
            //       )}
            //     </Text>
            //   </View>
            // </View>
          })}
          <View style={{ flexDirection: "row" }}>
            <View style={[{ width: "47%" }]}></View>
            <View style={[{ width: "13%" }]}></View>
            <View style={[{ width: "20%" }]}>
              <Text style={[styles.text]}> Subtotal</Text>
            </View>
            <View style={[{ width: "20%", border: 0.5 }]}>
              <Text style={[styles.text]}> {totalDiscount.subtotal}</Text>
            </View>
          </View>
        </View>
        <View style={{ paddingVertical: 1 }}>
          <Text
            style={[
              styles.text,
              {
                marginBottom: 1,
                fontWeight: "bold",
              },
            ]}
          >
            Payments
          </Text>
          <View style={{ flexDirection: "row" }}>
            <View
              style={[
                styles.table_col,
                { width: "50%" },
                {
                  borderLeftWidth: 0.2,
                  borderLeftColor: "#000",
                },
              ]}
            >
              <Text style={[styles.text, { fontWeight: "bold" }]}>Type</Text>
            </View>
            <View style={[styles.table_col, { width: "50%" }]}>
              <Text style={[styles.text, { fontWeight: "bold" }]}>Amount</Text>
            </View>
          </View>
          {payments.map((item, index, array) => {
            const transAmount =
              typeof item.TransAmount === "string"
                ? parseFloat(item.TransAmount)
                : item.TransAmount;
            const balance =
              item.balance !== undefined
                ? typeof item.balance === "string"
                  ? parseFloat(item.balance)
                  : item.balance
                : 0;
            const totalAmount =
              (isNaN(transAmount) ? 0 : transAmount) +
              (isNaN(balance) ? 0 : balance);

            return (
              <View style={{ flexDirection: "row" }} key={index}>
                <View
                  style={[
                    styles.table_col,
                    { width: "50%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                    { borderLeftWidth: 0.3, borderLeftColor: "#000" },
                  ]}
                >
                  <Text style={[styles.text]}>{item.Transtype}</Text>
                </View>
                <View
                  style={[
                    styles.table_col,
                    { width: "50%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                  ]}
                >
                  <Text style={[styles.text]}>{totalAmount}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <TotalRowItem label={"Total Item Count"} value={`${totalQuantity}`} />
          <TotalRowItem
            label={"Total"}
            value={`KES ${totalDiscount.subtotal}`}
          />
          {/* <TotalRowItem
            label={"Tax 16%"}
            value={`KES ${data. ? data.vat_amount : 0}`}
          /> */}
          <TotalRowItem
            label={"Discount"}
            value={`KES ${totalDiscount.totalDiscount}`}
            is_last
          />
          <TotalRowItem
            label={"Balance"}
            value={`KES ${totalDiscount.subtotal - totalDiscount.totalDiscount - totalPaid}`}
            is_last
          />
          {/* <TotalRowItem
            label={"Total"}
            value={`KES ${totalDiscount.subtotal - totalDiscount.totalDiscount}`}
            is_last
          /> */}
        </View>
        <View
          style={{
            width: "100%",
            paddingVertical: 4,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              width: "40%",
              padding: 2,
              justifyContent: "center",
              backgroundColor: "#fff",
            }}
          >
            <Image src={kra_code} style={{ height: 70, width: 70 }} />
          </View>
          <View
            style={{
              width: "60%",
              padding: 2,
              justifyContent: "center",
              flexDirection: "column",
            }}
          ></View>
        </View>
        <View style={{ flex: 0.2 }} />
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.text, { fontWeight: "bold" }]}>
            Thank you for doing business with us
          </Text>
          <Text style={[styles.textImportant, { fontWeight: "bold" }]}>
            NO refund , No exchange
          </Text>
        </View>
      </Page>
      {duplicate && (
        <Page
          size={get_printout_size(items.length + payments.length + 3)}
          style={{ padding: 2 }}
        >
          <View>
            <View
              style={{
                paddingVertical: 4,
                alignItems: "center",
              }}
            >
              <Text
                style={[styles.text, { fontWeight: "bold", marginBottom: 4 }]}
              >
                {`${receipt_info.name}`}
              </Text>
              <Text
                style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
              >
                {`Email: ${receipt_info.email}`}:
              </Text>
              <Text
                style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
              >
                {`Phone Number: ${receipt_info.phone_number}`}
              </Text>
              <Text
                style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
              >
                {`KRA Pin: ${receipt_info.receipt}`}
              </Text>
            </View>
            <View>
              <View
                style={{
                  paddingVertical: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ width: "100%" }}>
                  <View
                    style={{
                      justifyContent: "space-between",
                      paddingVertical: 1,
                      flexDirection: "row",
                    }}
                  >
                    <Text style={[styles.text, {}]}>Customer:</Text>
                    <Text style={[styles.text, {}]}>
                      {` ${data.customer.br_name ?? "N/A"}`}
                    </Text>
                  </View>
                  <View
                    style={{
                      justifyContent: "space-between",
                      paddingVertical: 1,
                      flexDirection: "row",
                    }}
                  >
                    <Text style={[styles.text]}>Customer Pin: </Text>
                    <Text style={[styles.text]}>{` ${data.pin ?? "N/A"}`}</Text>
                  </View>
                  <View
                    style={{
                      justifyContent: "space-between",
                      paddingVertical: 1,
                      flexDirection: "row",
                    }}
                  >
                    <Text style={[styles.text, {}]}>Print Out Date</Text>
                    <Text style={[styles.text, {}]}>
                      {new Date().toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={{
                      justifyContent: "space-between",
                      paddingVertical: 1,
                      flexDirection: "row",
                    }}
                  >
                    <Text style={[styles.text, {}]}>Cashier</Text>
                    <Text style={[styles.text, {}]}>{account.real_name}</Text>
                  </View>
                  <View
                    style={{
                      justifyContent: "space-between",
                      paddingVertical: 1,
                      flexDirection: "row",
                    }}
                  >
                    <Text style={[styles.text, {}]}>Branch ID</Text>
                    {/* TODO: Add branch name */}
                    <Text style={[styles.text, {}]}>
                      {account.default_store_name}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View
              style={{
                borderBottomWidth: 0.2,
                borderBottomColor: "#000",
                borderTopColor: "#000",
                borderTopWidth: 0.2,
                paddingVertical: 1,
                flexDirection: "column",
              }}
            >
              <Text style={[styles.text, { fontWeight: "bold" }]}>
                {`Trans ID: ${data.id}`}
              </Text>
              <Text style={[styles.text, { fontWeight: "bold" }]}>
                {"Transaction Receipt - Copy"}
              </Text>
            </View>
          </View>

          <View style={{ paddingVertical: 1 }}>
            <Text
              style={[
                styles.text,
                {
                  marginBottom: 1,
                  fontWeight: "bold",
                },
              ]}
            >
              Items
            </Text>
            <View style={{ flexDirection: "row" }}>
              <View
                style={[
                  styles.table_col,
                  { width: "47%" },
                  {
                    borderLeftWidth: 0.2,
                    borderLeftColor: "#000",
                  },
                ]}
              >
                <Text style={[styles.text, { fontWeight: "bold" }]}>Name</Text>
              </View>
              <View style={[styles.table_col, { width: "13%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>Qty</Text>
              </View>
              <View style={[styles.table_col, { width: "20%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                  Price(KES)
                </Text>
              </View>
              <View style={[styles.table_col, { width: "20%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                  Total(KES)
                </Text>
              </View>
            </View>
            {items.map((item, index, array) => {
              return (
                <View style={{ flexDirection: "row" }} key={index}>
                  <View
                    style={[
                      styles.table_col,
                      { width: "47%" },
                      index === array.length - 1
                        ? styles.table_col_last_row
                        : {},
                      { borderLeftWidth: 0.3, borderLeftColor: "#000" },
                    ]}
                  >
                    <Text style={[styles.text]}>{item.item_option}</Text>
                  </View>
                  <View
                    style={[
                      styles.table_col,
                      { width: "13%" },
                      index === array.length - 1
                        ? styles.table_col_last_row
                        : {},
                    ]}
                  >
                    <Text style={[styles.text]}>{item.quantity}</Text>
                  </View>
                  <View
                    style={[
                      styles.table_col,
                      { width: "20%" },
                      index === array.length - 1
                        ? styles.table_col_last_row
                        : {},
                    ]}
                  >
                    <Text style={[styles.text]}>{`${item.price}`}</Text>
                  </View>
                  <View
                    style={[
                      styles.table_col,
                      { width: "20%" },
                      index === array.length - 1
                        ? styles.table_col_last_row
                        : {},
                    ]}
                  >
                    <Text style={[styles.text]}>
                      {`${parseFloat(item.quantity) * parseFloat(item.price)}`}
                    </Text>
                  </View>
                </View>
              );
              // <View style={styles.tableRow} key={index}>
              //   <View style={[styles.tableCol, { width: "60rem" }]}>
              //     <Text style={styles.tableCell}>{item.item_option}</Text>
              //   </View>
              //   <View style={styles.tableCol}>
              //     <Text style={styles.tableCell}>{item.quantity}</Text>
              //   </View>
              //   <View style={styles.tableCol}>
              //     <Text style={styles.tableCell}>{item.price}</Text>
              //   </View>
              //   <View style={styles.tableCol}>
              //     <Text style={styles.tableCell}>
              //       {(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(
              //         2,
              //       )}
              //     </Text>
              //   </View>
              // </View>
            })}
            <View style={{ flexDirection: "row" }}>
              <View style={[{ width: "47%" }]}></View>
              <View style={[{ width: "13%" }]}></View>
              <View style={[{ width: "20%" }]}>
                <Text style={[styles.text]}> Subtotal</Text>
              </View>
              <View style={[{ width: "20%", border: 0.5 }]}>
                <Text style={[styles.text]}> {totalDiscount.subtotal}</Text>
              </View>
            </View>
          </View>
          <View style={{ paddingVertical: 1 }}>
            <Text
              style={[
                styles.text,
                {
                  marginBottom: 1,
                  fontWeight: "bold",
                },
              ]}
            >
              Payments
            </Text>
            <View style={{ flexDirection: "row" }}>
              <View
                style={[
                  styles.table_col,
                  { width: "50%" },
                  {
                    borderLeftWidth: 0.2,
                    borderLeftColor: "#000",
                  },
                ]}
              >
                <Text style={[styles.text, { fontWeight: "bold" }]}>Type</Text>
              </View>
              <View style={[styles.table_col, { width: "50%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                  Amount
                </Text>
              </View>
            </View>
            {payments.map((item, index, array) => {
              const transAmount =
                typeof item.TransAmount === "string"
                  ? parseFloat(item.TransAmount)
                  : item.TransAmount;
              const balance =
                item.balance !== undefined
                  ? typeof item.balance === "string"
                    ? parseFloat(item.balance)
                    : item.balance
                  : 0;
              const totalAmount =
                (isNaN(transAmount) ? 0 : transAmount) +
                (isNaN(balance) ? 0 : balance);

              return (
                <View style={{ flexDirection: "row" }} key={index}>
                  <View
                    style={[
                      styles.table_col,
                      { width: "50%" },
                      index === array.length - 1
                        ? styles.table_col_last_row
                        : {},
                      { borderLeftWidth: 0.3, borderLeftColor: "#000" },
                    ]}
                  >
                    <Text style={[styles.text]}>{item.Transtype}</Text>
                  </View>
                  <View
                    style={[
                      styles.table_col,
                      { width: "50%" },
                      index === array.length - 1
                        ? styles.table_col_last_row
                        : {},
                    ]}
                  >
                    <Text style={[styles.text]}>{totalAmount}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <TotalRowItem
              label={"Total Item Count"}
              value={`${totalQuantity}`}
            />
            <TotalRowItem
              label={"Total"}
              value={`KES ${totalDiscount.subtotal}`}
            />

            <TotalRowItem
              label={"Discount"}
              value={`KES ${totalDiscount.totalDiscount}`}
              is_last
            />
            {/* <TotalRowItem
              label={"Total"}
              value={`KES ${totalDiscount.subtotal - totalDiscount.totalDiscount}`}
              is_last
            /> */}
            <TotalRowItem
              label={"Balance"}
              value={`KES ${totalDiscount.subtotal - totalDiscount.totalDiscount - totalPaid}`}
              is_last
            />
          </View>
          <View
            style={{
              width: "100%",
              paddingVertical: 4,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                width: "40%",
                padding: 2,
                justifyContent: "center",
                backgroundColor: "#fff",
              }}
            >
              <Image src={kra_code} style={{ height: 70, width: 70 }} />
            </View>
            <View
              style={{
                width: "60%",
                padding: 2,
                justifyContent: "center",
                flexDirection: "column",
              }}
            ></View>
          </View>

          <View style={{ flex: 0.2 }} />
          <View style={{ alignItems: "center", marginBottom: 3 }}>
            <Text style={[styles.text, { fontWeight: "ultrabold" }]}>
              Thank you for doing business with us
            </Text>
            <Text style={[styles.text, { fontWeight: "extrabold" }]}>
              No refund , No exchange
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

export default OfflineTransactionReceiptPDF;

type TotalRowItemProps = {
  is_last?: boolean;
  label: string;
  value: string;
};

function TotalRowItem({ is_last, label, value }: TotalRowItemProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          width: "70%",
          borderTopColor: "#000",
          borderTopWidth: 0.2,
          borderRightColor: "#000",
          borderRightWidth: 0.2,
          borderLeftColor: "#000",
          borderLeftWidth: 0.2,
        },
        is_last
          ? {
              borderBottomWidth: 0.2,
              borderBottomColor: "#000",
            }
          : {},
      ]}
    >
      <View
        style={{
          width: "50%",
          borderRightWidth: 0.2,
          borderRightColor: "#000",
          padding: 1,
        }}
      >
        <Text style={[styles.text, { fontWeight: "bold" }]}>{label}</Text>
      </View>
      <View
        style={{
          width: "50%",
          padding: 1,
        }}
      >
        <Text style={[styles.text]}>{value}</Text>
      </View>
    </View>
  );
}
