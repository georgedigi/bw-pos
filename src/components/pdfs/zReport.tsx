import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register custom font
Font.register({
  family: "Courier Prime",
  src: "http://fonts.gstatic.com/s/raleway/v11/bIcY3_3JNqUVRAQQRNVteQ.ttf",
});

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 4,
  },
  header: {
    fontSize: 8,
    marginBottom: 5,
    fontFamily: "Courier Prime",
  },
  text: {
    fontSize: 3.0,
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
  table_col_last_row: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
  },
});

interface ParentItemSummary {
  parent_item: string;
  total_unit_price: number;
  total_quantity: number;
}
type PaymentTypes = Record<string, number>;

interface ZReportPDFProps {
  parentItemSummary: ParentItemSummary[];
  paymentTypes: PaymentTypes;
  receipt_info: CompanyReceiptInfo;
  account: UserAccountInfo;
}

const ZReportPDF = ({
  parentItemSummary,
  paymentTypes,
  receipt_info,
  account,
}: ZReportPDFProps) => {
  function get_printout_size(length: number): [number, number] {
    return [80, 140 + length * 14];
  }

  return (
    <Document>
      <Page
        size={get_printout_size(parentItemSummary.length)}
        style={{ padding: 2 }}
      >
        <View>
          <View style={{ paddingVertical: 4, alignItems: "center" }}>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 4 }]}
            >
              {receipt_info.name}
            </Text>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              Email: {receipt_info.email}
            </Text>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              Phone Number: {receipt_info.phone_number}
            </Text>
            <Text
              style={[styles.text, { fontWeight: "bold", marginBottom: 1 }]}
            >
              KRA Pin: {receipt_info.receipt}
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
                <Text style={[styles.text, { marginBottom: 1 }]}>
                  {`User: ${account.real_name ?? "N/A"}`}
                </Text>
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
              </View>
            </View>
          </View>

          <View style={{ paddingVertical: 1 }}>
            <Text
              style={[styles.text, { marginBottom: 1, fontWeight: "bold" }]}
            >
              Payments Received
            </Text>
            {Object.entries(paymentTypes).map(([type, total], index) => (
              <View key={index} style={{ flexDirection: "row" }}>
                <Text style={[styles.text, { width: "50%" }]}>{type}</Text>
                <Text style={[styles.text, { width: "50%" }]}>{total}</Text>
              </View>
            ))}
          </View>

          <View style={{ paddingVertical: 1 }}>
            <Text
              style={[styles.text, { marginBottom: 1, fontWeight: "bold" }]}
            >
              Items Sold Summary
            </Text>
            {parentItemSummary.map((item, index) => (
              <View key={index} style={{ flexDirection: "row" }}>
                <Text style={[styles.text, { width: "50%" }]}>
                  {item.parent_item}
                </Text>
                <Text style={[styles.text, { width: "25%" }]}>
                  {item.total_quantity}
                </Text>
                {/* <Text style={[styles.text, { width: "25%" }]}>
                  KES {item.total_unit_price.toFixed(2)}
                </Text> */}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ZReportPDF;
