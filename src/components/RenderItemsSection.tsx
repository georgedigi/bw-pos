import {
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";


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
    customer_section: {
        marginBottom: 5,
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
    textBold: {
        fontFamily: "Helvetica",
        fontSize: 8.3,
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
        fontFamily: "Helvetica",
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


export const RenderItemsSection = ({ items }: { items: TransactionInvItem[] }) => {
    // Separate items into clothes and bags
    const clothes = items.filter(
        (item) => !["CR0001", "CR0002"].includes(item.item_option_id)
    );
    const bags = items.filter((item) =>
        ["CR0001", "CR0002"].includes(item.item_option_id)
    );

    // Calculate subtotals
    const calculateSubtotal = (items: TransactionInvItem[]): number => {
        return items.reduce(
            (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.price),
            0
        );
    };

    // Calculate total quantity
    const calculateTotalQuantity = (items: TransactionInvItem[]): number => {
        return items.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
    };

    const renderItemRow = (
        item: TransactionInvItem,
        index: number,
        array: TransactionInvItem[]
    ) => (
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
                <Text style={[styles.text]}>{item.price}</Text>
            </View>
            <View
                style={[
                    styles.table_col,
                    { width: "20%" },
                    index === array.length - 1 ? styles.table_col_last_row : {},
                ]}
            >
                <Text style={[styles.text]}>
                    {(parseFloat(item.quantity) * parseFloat(item.price)).toFixed(2)}
                </Text>
            </View>
        </View>
    );

    const renderSubtotal = (label: string, amount: number, quantity: number) => (
        <View style={{ flexDirection: "row" }}>
            <View style={[styles.table_col, { width: "47%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>{label}</Text>
            </View>
            <View style={[styles.table_col, { width: "13%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                    {quantity}
                </Text>
            </View>
            <View style={[styles.table_col, { width: "20%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}></Text>
            </View>
            <View style={[styles.table_col, { width: "20%" }]}>
                <Text style={[styles.text, { fontWeight: "bold" }]}>
                    {amount.toFixed(2)}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.table}>
            {/* Clothes Section */}
            {clothes.map((item, index, array) => renderItemRow(item, index, array))}
            {clothes.length > 0 && (
                renderSubtotal(
                    "Items Subtotal",
                    calculateSubtotal(clothes),
                    calculateTotalQuantity(clothes)
                )
            )}

            {/* Spacer if both sections present */}
            {clothes.length > 0 && bags.length > 0 && (
                <View style={{ height: 25 }} />
            )}

            {/* Bags Section */}
            {bags.map((item, index, array) => renderItemRow(item, index, array))}
            {bags.length > 0 && (
                renderSubtotal(
                    "Bags Subtotal",
                    calculateSubtotal(bags),
                    calculateTotalQuantity(bags)
                )
            )}

            {/* Grand Total */}
            <View style={{ flexDirection: "row", marginTop: 25 }}>
                <View style={[styles.table_col, { width: "47%" }]}>
                    <Text style={[styles.text, { fontWeight: "bold" }]}>Grand Total:</Text>
                </View>
                <View style={[styles.table_col, { width: "13%" }]}>
                    <Text style={[styles.text, { fontWeight: "bold" }]}>
                        {calculateTotalQuantity([...clothes, ...bags])}
                    </Text>
                </View>
                <View style={[styles.table_col, { width: "20%" }]}>
                    <Text style={[styles.text, { fontWeight: "bold" }]}></Text>
                </View>
                <View style={[styles.table_col, { width: "20%" }]}>
                    <Text style={[styles.text, { fontWeight: "bold" }]}>
                        {(calculateSubtotal(clothes) + calculateSubtotal(bags)).toFixed(2)}
                    </Text>
                </View>
            </View>
        </View>
    );
};