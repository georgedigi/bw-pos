import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { type ColumnDef } from "@tanstack/react-table";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  table: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000000",
  },
  tableRow: {
    flexDirection: "row",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000000",
  },
  tableCol: {
    flex: 1,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000000",
    padding: 5,
  },
  tableCell: {
    fontSize: 10,
  },
});

const ReportDocument = ({
  data,
  columns,
  receipt_info,
}: {
  data: any[];
  columns: ColumnDef<any>[];
  receipt_info: CompanyReceiptInfo;
  from: string | undefined;
  to: string | undefined;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View>
        <View
          style={{
            paddingVertical: 4,
            alignItems: "center",
          }}
        >
          <Text style={[{ fontWeight: "bold", marginBottom: 4 }]}>
            {`${receipt_info.name}`}
          </Text>
          <Text style={[{ fontWeight: "bold", marginBottom: 1 }]}>
            {`Email: ${receipt_info.email}`}:
          </Text>
          <Text style={[{ fontWeight: "bold", marginBottom: 1 }]}>
            {`Phone Number: ${receipt_info.phone_number}`}
          </Text>
          <Text style={[{ fontWeight: "bold", marginBottom: 1 }]}>
            {`KRA Pin: ${receipt_info.receipt}`}
          </Text>
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
          <Text style={[{ fontWeight: "bold" }]}>Sales Report</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {columns.map((column, index) => (
            <View style={styles.tableCol} key={index}>
              <Text style={styles.tableCell}>{column?.header as string}</Text>
            </View>
          ))}
        </View>
        {data.map((row, rowIndex) => (
          <View style={styles.tableRow} key={rowIndex}>
            {columns.map((column, colIndex) => (
              <View style={styles.tableCol} key={colIndex}>
                <Text style={styles.tableCell}>
                  {row[column.id as keyof any]}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default ReportDocument;
// export const exportToPDF = (
//   data: SalesReportItem[],
//   columns: ColumnDef<SalesReportItem>[],
// ) => {
//   const blob = pdf(<ReportDocument data={data} columns={columns} />).toBlob();
//   blob.then((file) => {
//     saveAs(file, "item-report.pdf");
//   });
// };
