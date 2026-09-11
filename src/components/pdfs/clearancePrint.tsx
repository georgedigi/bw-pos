import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 4,
  },
  company_section: {
    marginBottom: 5,
    marginTop: 10,
    textAlign: "left",
    fontFamily: "Helvetica",
  },
  header: {
    fontSize: 8,
    marginBottom: 5,
    fontFamily: "Helvetica",
    fontWeight: "bold",
  },
  text: {
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: "Helvetica",
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
    fontFamily: "Courier",
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
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 5,
  },
  signatureField: {
    width: "40%", // Adjust the width to suit your layout
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 2,
    textAlign: "center",
  },
  signatureLabel: {
    fontSize: 8,
    fontFamily: "Helvetica",
    marginTop: 5,
  },
});

interface ClearancePrintPDFProps {
  selectedShift: Shift | null;
  amounts: Record<string, string>;
  paymentSummary: TransTypeSummary[];
  receipt_info: CompanyReceiptInfo;
  account: UserAccountInfo;
}

const ClearancePrintPDF = ({
  selectedShift,
  amounts,
  paymentSummary,
  receipt_info,
  account,
}: ClearancePrintPDFProps) => {
  function get_printout_size(length: number): [number, number] {
    return [200, 800 + length * 10];
  }
  const dataToSubmit = paymentSummary.map((paymentType) => ({
    TransType: paymentType.TransType!,
    ActualValue: amounts[paymentType.TransType!]?.toString() || "0.00",
  }));

  return (
    <Document>
      <Page size={get_printout_size(5)} style={{ padding: 2 }}>
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
                  <Text style={[styles.text, {}]}>Branch Name:</Text>
                  <Text style={[styles.text, {}]}>
                    {` ${account.default_store_name ?? "N/A"}`}
                  </Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Collected By:</Text>
                  <Text style={[styles.text, {}]}>
                    {` ${account.real_name ?? "N/A"}`}
                  </Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Collected From:</Text>
                  <Text style={[styles.text, {}]}>
                    {` ${selectedShift?.user_name ?? "N/A"}`}
                  </Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Collection Date:</Text>
                  <Text style={[styles.text, {}]}>
                    {new Date().toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {/* Shift Details */}
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
                  <Text style={[styles.text, {}]}>Shift Number:</Text>
                  <Text style={[styles.text, {}]}>
                    {` ${selectedShift ? selectedShift.id : "N/A"}`}
                  </Text>
                </View>
                <View
                  style={{
                    justifyContent: "space-between",
                    paddingVertical: 1,
                    flexDirection: "row",
                  }}
                >
                  <Text style={[styles.text, {}]}>Shift Duration:</Text>
                  <Text style={[styles.text, {}]}>
                    {selectedShift
                      ? `${new Date(selectedShift.start_date).toLocaleString()} - ${!selectedShift.end_date.includes("0000-00") ? new Date(selectedShift.end_date).toLocaleString() : "N/A"}`
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={{ paddingVertical: 1, paddingHorizontal: 2 }}>
          <View style={{ paddingVertical: 1 }}>
            <Text
              style={[styles.text, { marginBottom: 1, fontWeight: "bold" }]}
            >
              Payments Received
            </Text>
          </View>
          <View style={styles.table}>
            {/* Table Headers */}
            <View
              style={[
                styles.tableRow,
                { borderWidth: 0.5, borderColor: "#000" },
              ]}
            >
              <View
                style={[
                  styles.tableCol,
                  styles.table_col_last_row,
                  { width: "50%" }, // Adjust width to exactly half
                  {
                    borderLeftWidth: 0.2,
                    borderLeftColor: "#000",
                  }, // Keep border consistent
                ]}
              >
                <Text style={[styles.text, { fontWeight: "bold" }]}>Type</Text>
              </View>
              <View
                style={[
                  styles.tableCol,
                  { width: "50%" }, // Adjust width to exactly half
                  { borderLeftWidth: 0.2, borderLeftColor: "#000" },
                  styles.table_col_last_row,
                ]}
              >
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                  Amount
                </Text>
              </View>
            </View>

            {/* Table Body */}
            {Object.entries(dataToSubmit).map(([type, i], index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  { borderWidth: 0.2, borderColor: "#000" },
                ]}
              >
                {/* Payment Type */}
                <View
                  style={[
                    styles.tableCol,
                    styles.table_col_last_row,
                    { width: "50%" }, // Adjust width to exactly half
                    { borderLeftWidth: 0.2, borderLeftColor: "#000" },
                  ]}
                >
                  <Text style={[styles.text, { fontWeight: "bold" }]}>
                    {i.TransType}
                  </Text>
                </View>

                {/* Actual Value */}
                <View
                  style={[
                    styles.tableCol,
                    { width: "50%" }, // Adjust width to exactly half
                    styles.table_col_last_row,
                    { borderRightWidth: 0.3, borderRightColor: "#000" },
                  ]}
                >
                  <Text style={[styles.text, { fontWeight: "bold" }]}>
                    {i.ActualValue}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.signatureSection}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Cashier Signature</Text>
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>T.Lead Signature</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ClearancePrintPDF;
