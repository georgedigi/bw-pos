import React, { useState, useEffect } from "react";
import {
  Document,
  Page,
  Text,
  Image,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { calculateSubtotalAndDiscount } from "~/lib/utils";
import { toast } from "sonner";
import { RenderItemsSection } from "./RenderItemsSection";

const DEFAULT_QR_CODE_DATA = "ESD Device Unreachable";

const TransactionReceiptPDF = ({
  data,
  receipt_info,
  account,
  duplicate,
}: {
  data: SalesReceiptInformation;
  receipt_info: CompanyReceiptInfo;
  account: UserAccountInfo;
  duplicate: boolean;
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState(data.qrCode || "");
  const [simulateError, setSimulateError] = useState(false);


  const generateDefaultQRCode = async () => {
    try {
      const code = await QRCode.toDataURL(DEFAULT_QR_CODE_DATA);
      setQrCodeUrl(code);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };
  const salesInfo = data[0];

  console.log("Sales Info", salesInfo);

  useEffect(() => {
    const generateKraCode = async () => {
      try {
        // Simulate an error based on the flag
        if (simulateError) {
          throw new Error("Simulated QR code generation error");
        }

        if (data.qrCode && data.qrCode.length > 0) {
          const code = await QRCode.toDataURL(data.qrCode);
          setQrCodeUrl(code);
        } else {
          await generateDefaultQRCode();
        }
      } catch (error) {
        console.error("Failed to generate QR code, falling back to default:", error);
        await generateDefaultQRCode();
      }
    };

    generateKraCode().catch((error) => {
      console.error("Failed to generate QR code:", error);
      // Generate the default QR code on catch
      void generateDefaultQRCode();
    });
  }, [data.qrCode]);



  const items: TransactionInvItem[] =
    salesInfo.pitems.length > 0 ? JSON.parse(salesInfo.pitems) : [];
  const payments: Payment[] =
    salesInfo.payments.length > 0 ? JSON.parse(salesInfo.payments) : [];

  function get_printout_size(
    items: TransactionInvItem[],
    payments: Payment[]
  ): [number, number] {
    // Base height for headers, company info, etc.
    const baseHeight = 477;

    // Count how many items are clothes and bags
    const clothes = items.filter(item => !["CR0001", "CR0002"].includes(item.item_option_id));
    const bags = items.filter(item => ["CR0001", "CR0002"].includes(item.item_option_id));

    // Calculate additional rows:
    // - Each item row (clothes + bags)
    // - Subtotal row for clothes (if exists)
    // - Subtotal row for bags (if exists)
    // - Spacing between sections (if both exist)
    // - Grand total row
    // - Payment rows
    const additionalRows =
      items.length + // All item rows
      (clothes.length > 0 ? 1 : 0) + // Clothes subtotal
      (bags.length > 0 ? 1 : 0) + // Bags subtotal
      (clothes.length > 0 && bags.length > 0 ? 1 : 0) + // Spacing
      1 + // Grand total
      payments.length; // Payment rows

    // Return width and calculated height
    return [200, baseHeight + (additionalRows * 10)];
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
  const totalDiscount = calculateSubtotalAndDiscount(salesInfo);
  const totalQuantity = calculateTotalQuantity(items);
  const totalPaid = sumTransAmount(payments);

  console.log("sub_total", totalDiscount);

  return (
    <Document>
      <Page
        size={get_printout_size(items, payments)}
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
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              {`Till Number: ${account.default_till}`}
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
                    {` ${salesInfo.customername ?? "N/A"}`}
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
                  <Text
                    style={[styles.text]}
                  >{` ${salesInfo.pin ?? "N/A"}`}</Text>
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
              {`Trans ID: ${salesInfo.id}`}
            </Text>
            {data.mpesaRef ? (
              <Text style={[styles.text, { fontWeight: "bold" }]}>
                {`M-Pesa Ref: ${data.mpesaRef}`}
              </Text>
            ) : null}
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

          <RenderItemsSection items={items} />

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
                  {item.TransID && String(item.TransID) !== "0" ? (
                    <Text style={[styles.text, { color: "#555" }]}>
                      {`Ref: ${item.TransID}`}
                    </Text>
                  ) : null}
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
          <TotalRowItem
            label={"Tax 16%"}
            value={`KES ${salesInfo.vat_amount ? salesInfo.vat_amount : 0}`}
          />
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
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Image src={qrCodeUrl} style={{ width: 130, height: 130, marginBottom: 6 }} />

          <View
            style={{
              width: "100%",
              padding: 2,
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {data.middlewareInvoiceNumber ? (
              <View style={{ paddingVertical: 1 }}>
                <Text style={[styles.text]}>Middleware Invoice Number</Text>
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                  {data.middlewareInvoiceNumber}
                </Text>
              </View>
            ) : null}

            {data.qrDate ? (
              <View style={{ paddingVertical: 1 }}>
                <Text style={[styles.text]}>QR Date</Text>
                <Text style={[styles.text, { fontWeight: "bold" }]}>{data.qrDate}</Text>
              </View>
            ) : null}

            {data.controlCode ? (
              <View style={{ paddingVertical: 1 }}>
                <Text style={[styles.text]}>Control Code</Text>
                <Text style={[styles.text, { fontWeight: "bold" }]}>{data.controlCode}</Text>
              </View>
            ) : null}

          </View>
        </View>
        <View style={{ flex: 0.2 }} />
        <View style={{ alignItems: "center", marginBottom: 3 }}>
          <Text style={[styles.text, { fontWeight: "bold" }]}>
            Thank you for doing business with us
          </Text>
          <Text style={[{ fontFamily: "Helvetica-Bold", fontSize: 9, fontWeight: "bold" }]}>
            NO REFUND, NO EXCHANGE
          </Text>
        </View>
      </Page>


      {duplicate && (
        <Page
          size={get_printout_size(items, payments)}
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
                      {` ${salesInfo.customername ?? "N/A"}`}
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
                    <Text
                      style={[styles.text]}
                    >{` ${salesInfo.pin ?? "N/A"}`}</Text>
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
                {`Trans ID: ${salesInfo.id}`}
              </Text>
              {data.mpesaRef ? (
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                  {`M-Pesa Ref: ${data.mpesaRef}`}
                </Text>
              ) : null}
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


            <RenderItemsSection items={items} />


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
              label={"Tax"}
              value={`KES ${salesInfo.vat_amount ? salesInfo.vat_amount : 0}`}
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
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Image src={qrCodeUrl} style={{ width: 130, height: 130, marginBottom: 6 }} />

            <View
              style={{
                width: "100%",
                padding: 2,
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {data.middlewareInvoiceNumber ? (
                <View style={{ paddingVertical: 1 }}>
                  <Text style={[styles.text]}>Middleware Invoice Number</Text>
                  <Text style={[styles.text, { fontWeight: "bold" }]}>
                    {data.middlewareInvoiceNumber}
                  </Text>
                </View>
              ) : null}

              {data.qrDate ? (
                <View style={{ paddingVertical: 1 }}>
                  <Text style={[styles.text]}>QR Date</Text>
                  <Text style={[styles.text, { fontWeight: "bold" }]}>{data.qrDate}</Text>
                </View>
              ) : null}

              {data.controlCode ? (
                <View style={{ paddingVertical: 1 }}>
                  <Text style={[styles.text]}>Control Code</Text>
                  <Text style={[styles.text, { fontWeight: "bold" }]}>{data.controlCode}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ flex: 0.2 }} />
          <View style={{ alignItems: "center", marginBottom: 3 }}>
            <Text style={[styles.text, { fontWeight: "ultrabold" }]}>
              Thank you for doing business with us
            </Text>
            <Text style={[{ fontFamily: "Helvetica-Bold", fontSize: 9, fontWeight: "bold" }]}>
              NO REFUND, NO EXCHANGE
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

export default TransactionReceiptPDF;
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