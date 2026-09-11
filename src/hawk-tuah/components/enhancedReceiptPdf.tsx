/**
 * Complete Clean Receipt PDF with Duplicate Support - Enhanced Sizing
 * 
 * Clean receipt design with duplicate copy support and QR fallback
 * ENHANCED: Better dynamic sizing to prevent content cutoff
 * 
 * @author Kennedy Ngugi
 * @date 19-06-2025
 * @version 2.0.1 - Enhanced sizing only
 */

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
import { formatMoney } from "../utils/formatters";
import EnhancedSeparatedItemsSection from "./enhancedSeparatedItemsSection";

const DEFAULT_QR_CODE_DATA = "ESD Device Unreachable";

interface EnhancedReceiptCalculations {
    items: Array<{
        id: string;
        name: string;
        quantity: number;
        originalPrice: number;
        finalPrice: number;
        automaticDiscount: number;
        manualDiscount: number;
        totalDiscount: number;
        lineTotal: number;
        tax: number;
        hasDiscount: boolean;
    }>;
    totals: {
        subtotal: number;
        totalAutomaticDiscounts: number;
        totalManualDiscounts: number;
        bulkDiscount: number;
        totalSavings: number;
        finalTotal: number;
        tax: number;
        grandTotal: number;
    };
}

/**
 * Calculate receipt data using server response values directly
 */
function calculateEnhancedReceiptData(data: SalesReceiptInformation): EnhancedReceiptCalculations {
    const salesInfo = data[0];
    const items: TransactionInvItem[] = salesInfo.pitems.length > 0 ? JSON.parse(salesInfo.pitems) : [];

    let discountSummary = null;
    try {
        if (salesInfo.discount_summary) {
            discountSummary = typeof salesInfo.discount_summary === 'string'
                ? JSON.parse(salesInfo.discount_summary)
                : salesInfo.discount_summary;
        }
    } catch (error) {
        console.log('Using item-level discount data');
    }

    const enhancedItems = items.map(item => {
        const quantity = parseFloat(item.quantity);
        const finalPrice = parseFloat(item.discounted_price || "0");
        const lineTotal = quantity * finalPrice;
        const totalDiscount = parseFloat(item.discount || "0");
        const tax = parseFloat(item.tax || "0");

        const originalPrice = item.original_price
            ? parseFloat(item.original_price)
            : finalPrice + (totalDiscount / quantity);

        const automaticDiscount = item.automatic_discount
            ? parseFloat(item.automatic_discount)
            : 0;

        const manualDiscount = item.manual_discount
            ? parseFloat(item.manual_discount)
            : totalDiscount - automaticDiscount;

        return {
            id: item.item_option_id,
            name: item.item_option,
            quantity,
            originalPrice,
            finalPrice,
            automaticDiscount,
            manualDiscount,
            totalDiscount,
            lineTotal,
            tax,
            hasDiscount: totalDiscount > 0
        };
    });

    const subtotal = discountSummary?.subtotal || enhancedItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    const finalTotal = parseFloat(salesInfo.ptotal);
    const totalAutomaticDiscounts = discountSummary?.automatic_discounts || enhancedItems.reduce((sum, item) => sum + item.automaticDiscount, 0);
    const totalManualDiscounts = discountSummary?.manual_discounts || enhancedItems.reduce((sum, item) => sum + item.manualDiscount, 0);
    const bulkDiscount = discountSummary?.bulk_discount || 0;
    const totalSavings = totalAutomaticDiscounts + totalManualDiscounts + bulkDiscount;
    const totalTax = parseFloat(salesInfo.vat_amount || "0");

    // finalTotal from server already includes tax
    const grandTotal = finalTotal;

    return {
        items: enhancedItems,
        totals: {
            subtotal,
            totalAutomaticDiscounts,
            totalManualDiscounts,
            bulkDiscount,
            totalSavings,
            finalTotal,
            tax: totalTax,
            grandTotal
        }
    };
}

const EnhancedTransactionReceiptPDF = ({
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
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [qrCodeStatus, setQrCodeStatus] = useState<'loading' | 'success' | 'error'>('loading');

    console.log("Data received for the receipt: ", data)
    console.log("Received QR data:", qrCodeUrl);

    const salesInfo = data[0];
    // console.log("Sales info:", salesInfo);
    const payments: Payment[] = salesInfo.payments.length > 0 ? JSON.parse(salesInfo.payments) : [];
    const enhancedData = calculateEnhancedReceiptData(data);
    console.log("Enhanced receipt data:", enhancedData);

    const generateDefaultQRCode = async (): Promise<string> => {
        try {
            const code = await QRCode.toDataURL(DEFAULT_QR_CODE_DATA);
            console.log("Generated default QR code:", code.substring(0, 50) + "...");
            return code;
        } catch (error) {
            console.error("Failed to generate default QR code:", error);
            throw error;
        }
    };

    useEffect(() => {
        const generateKraCode = async () => {
            try {
                setQrCodeStatus('loading');
                let generatedCode = "";

                if (data.qrCode && data.qrCode.length > 0) {
                    console.log("Generating QR from data.qrCode:", data.qrCode.substring(0, 50) + "...");
                    generatedCode = await QRCode.toDataURL(data.qrCode);
                } else {
                    console.log("No QR data, generating default");
                    generatedCode = await generateDefaultQRCode();
                }

                console.log("Setting QR code URL:", generatedCode.substring(0, 50) + "...");
                setQrCodeUrl(generatedCode);
                setQrCodeStatus('success');

            } catch (error) {
                console.error("Failed to generate QR code:", error);
                setQrCodeStatus('error');
                try {
                    const fallbackCode = await generateDefaultQRCode();
                    setQrCodeUrl(fallbackCode);
                    setQrCodeStatus('success');
                } catch (fallbackError) {
                    console.error("Failed to generate fallback QR code:", fallbackError);
                    setQrCodeUrl("");
                    setQrCodeStatus('error');
                }
            }
        };

        void generateKraCode();
    }, [data.qrCode]);

    // ENHANCED: Better dynamic receipt size calculation
    function getReceiptSize(): [number, number] {
        const baseHeight = 600; 

        // Better item height calculation
        const averageItemNameLength = enhancedData.items.length > 0
            ? enhancedData.items.reduce((sum, item) => sum + (item.name?.length || 0), 0) / enhancedData.items.length
            : 0;

        const itemHeightMultiplier = averageItemNameLength > 40 ? 1.8 : 1.2;
        const itemsHeight = enhancedData.items.length * 15 * itemHeightMultiplier;

        const discountHeight = (enhancedData.totals.totalSavings > 0) ? 80 : 0; 
        const paymentsHeight = payments.length * 15; 

        // Adds extra padding for receipts with many items
        const extraPadding = enhancedData.items.length > 10 ? 100 : 50;

        const calculatedHeight = baseHeight + itemsHeight + discountHeight + paymentsHeight + extraPadding;

        const finalHeight = Math.max(400, Math.min(calculatedHeight, 1400));

        console.log(`Receipt sizing - Items: ${enhancedData.items.length}, Avg name length: ${averageItemNameLength.toFixed(1)}, Final height: ${finalHeight}px`);

        return [200, finalHeight];
    }

    const getBalanceFromPayments = () => {
        if (payments.length > 0 && payments[0].balance !== undefined) {
            return typeof payments[0].balance === "string"
                ? parseFloat(payments[0].balance)
                : payments[0].balance;
        }
        return 0;
    };

    const balance = getBalanceFromPayments();
    const dumbassShit = QRCode.toDataURL(DEFAULT_QR_CODE_DATA);

    // Receipt Page Component
    const ReceiptPage = ({ isOriginal }: { isOriginal: boolean }) => (
        <Page size={getReceiptSize()} style={styles.page}>

            <View style={styles.header}>
                <Text style={styles.companyName}>{receipt_info.name}</Text>
                <Text style={styles.headerSubtext}>CASH RECEIPT</Text>
                {!isOriginal && <Text style={styles.duplicateText}>DUPLICATE COPY</Text>}
            </View>

            <View style={styles.companyInfo}>
                <Text style={styles.bodyText}>Email: {receipt_info.email}</Text>
                <Text style={styles.bodyText}>Phone: {receipt_info.phone_number}</Text>
                <Text style={styles.bodyText}>KRA PIN: {receipt_info.receipt}</Text>
                <Text style={styles.bodyText}>Till No: {account.default_till}</Text>
            </View>

            <View style={styles.dottedLine} />

            <View style={styles.transactionInfo}>
                <View style={styles.infoRow}>
                    <Text style={styles.bodyText}>Receipt #:</Text>
                    <Text style={styles.bodyText}>{salesInfo.id}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.bodyText}>Date:</Text>
                    <Text style={styles.bodyText}>{new Date(salesInfo.pdate).toLocaleDateString()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.bodyText}>Time:</Text>
                    <Text style={styles.bodyText}>{new Date(salesInfo.pdate).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.bodyText}>Cashier:</Text>
                    <Text style={styles.bodyText}>{data[0].uname}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.bodyText}>Customer:</Text>
                    <Text style={styles.bodyText}>{salesInfo.customername || "WALK-IN"}</Text>
                </View>

                {salesInfo.pin && (
                    <View style={styles.infoRow}>
                        <Text style={styles.bodyText}>Customer Pin:</Text>
                        <Text style={styles.bodyText}>{salesInfo.pin}</Text>
                    </View>
                )}

                <View style={styles.infoRow}>
                    <Text style={styles.bodyText}>Branch:</Text>
                    <Text style={styles.bodyText}>{salesInfo.branch_name}</Text>
                </View>
            </View>

            <View style={styles.dottedLine} />

            <EnhancedSeparatedItemsSection
                items={enhancedData.items}
                showDiscounts={true}
            />

            <View style={styles.dottedLine} />

            {enhancedData.totals.totalSavings > 0 && (
                <>
                    <View style={styles.savingsSection}>
                        <Text style={styles.savingsTitle}>Savings Breakdown:</Text>

                        {enhancedData.totals.totalAutomaticDiscounts > 0 && (
                            <View style={styles.savingsRow}>
                                <Text style={styles.bodyText}>Auto Discounts:</Text>
                                <Text style={styles.savingsAmount}>-{formatMoney(enhancedData.totals.totalAutomaticDiscounts)}</Text>
                            </View>
                        )}

                        {enhancedData.totals.totalManualDiscounts > 0 && (
                            <View style={styles.savingsRow}>
                                <Text style={styles.bodyText}>Manual Discounts:</Text>
                                <Text style={styles.savingsAmount}>-{formatMoney(enhancedData.totals.totalManualDiscounts)}</Text>
                            </View>
                        )}

                        {enhancedData.totals.bulkDiscount > 0 && (
                            <View style={styles.savingsRow}>
                                <Text style={styles.bodyText}>Bulk Discount:</Text>
                                <Text style={styles.savingsAmount}>-{formatMoney(enhancedData.totals.bulkDiscount)}</Text>
                            </View>
                        )}

                        <View style={styles.totalSavingsRow}>
                            <Text style={styles.boldText}>Total Savings:</Text>
                            <Text style={styles.totalSavingsAmount}>{formatMoney(enhancedData.totals.totalSavings)}</Text>
                        </View>
                    </View>
                    <View style={styles.dottedLine} />
                </>
            )}

            <View style={styles.totalsSection}>
                {enhancedData.totals.totalSavings > 0 && (
                    <View style={styles.totalRow}>
                        <Text style={styles.bodyText}>Sub Total (Before Discounts):</Text>
                        <Text style={styles.bodyText}>{formatMoney(enhancedData.totals.subtotal)}</Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.bodyText}>VAT Amount (16%):</Text>
                    <Text style={styles.bodyText}>{formatMoney(enhancedData.totals.tax)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.boldText}>Total (Inc. VAT):</Text>
                    <Text style={styles.boldText}>{formatMoney(enhancedData.totals.grandTotal)}</Text>
                </View>
            </View>

            <View style={styles.dottedLine} />

            <View style={styles.paymentSection}>
                {payments.map((payment, index) => {
                    const amount = typeof payment.TransAmount === "string"
                        ? parseFloat(payment.TransAmount)
                        : payment.TransAmount;

                    const paymentBalance = payment.balance !== undefined
                        ? (typeof payment.balance === "string" ? parseFloat(payment.balance) : payment.balance)
                        : 0;

                    const totalPaidByCustomer = amount + paymentBalance;

                    return (
                        <View key={index}>
                            <View style={styles.totalRow}>
                                <Text style={styles.bodyText}>{payment.Transtype}:</Text>
                                <Text style={styles.bodyText}>{formatMoney(amount)}</Text>
                            </View>
                            {paymentBalance > 0 && (
                                <View style={styles.totalRow}>
                                    <Text style={styles.bodyText}>Amount Paid:</Text>
                                    <Text style={styles.bodyText}>{formatMoney(totalPaidByCustomer)}</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                <View style={styles.totalRow}>
                    <Text style={styles.bodyText}>Balance:</Text>
                    <Text style={[styles.bodyText, balance < 0 && styles.negativeText]}>
                        {formatMoney(balance)}
                    </Text>
                </View>
            </View>

            {enhancedData.totals.totalSavings > 0 && (
                <>
                    <View style={styles.dottedLine} />
                    <View style={styles.savingsHighlight}>
                        <Text style={styles.savingsHighlightText}>
                            YOU SAVED {formatMoney(enhancedData.totals.totalSavings)}!
                        </Text>
                    </View>
                </>
            )}

            <View style={styles.dottedLine} />

            <View style={styles.qrSection}>
                {/* Simple, reliable conditional rendering */}
                {qrCodeUrl && qrCodeUrl.length > 50 ? (
                    <Image
                        src={qrCodeUrl}
                        style={{ width: 70, height: 70 }}
                        alt="QR Code"
                    />
                ) : (
                    <Image
                        src={dumbassShit}
                        style={styles.qrCode}
                        alt="QR Code Placeholder"
                    />
                )}

                {(data.middlewareInvoiceNumber || data.controlCode || data.qrDate) && (
                    <View style={styles.controlInfo}>
                        {data.middlewareInvoiceNumber && (
                            <Text style={styles.controlText}>Middleware: {data.middlewareInvoiceNumber}</Text>
                        )}
                        {data.controlCode && (
                            <Text style={styles.controlText}>Control: {data.controlCode}</Text>
                        )}
                        {data.qrDate && (
                            <Text style={styles.controlText}>QR Date: {data.qrDate}</Text>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.dottedLine} />

            <View style={styles.footer}>
                <Text style={styles.thankYouText}>THANK YOU FOR SHOPPING!</Text>
                <Text style={styles.policyText}>NO REFUND • NO EXCHANGE</Text>
                <Text style={styles.visitText}>Visit us again!</Text>
            </View>

        </Page>
    );

    return (
        <Document>
            <ReceiptPage isOriginal={true} />

            {duplicate && <ReceiptPage isOriginal={false} />}
        </Document>
    );
};

const styles = StyleSheet.create({
    page: {
        padding: 10,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
    },

    header: {
        alignItems: 'center',
        marginBottom: 8,
    },
    companyName: {
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: "Helvetica-Bold",
        textAlign: 'center',
        marginBottom: 2,
    },
    headerSubtext: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 2,
    },
    duplicateText: {
        fontSize: 8,
        color: '#000',
        textAlign: 'center',
    },

    companyInfo: {
        alignItems: 'center',
        marginBottom: 6,
    },

    dottedLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderStyle: 'dotted',
        marginVertical: 4,
    },

    transactionInfo: {
        marginBottom: 6,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1,
    },

    savingsSection: {
        marginBottom: 6,
    },
    savingsTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    savingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1,
    },
    savingsAmount: {
        fontSize: 8,
        color: '#000',
    },
    totalSavingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
        paddingTop: 2,
        borderTopWidth: 1,
        borderTopColor: '#000',
        borderStyle: 'dotted',
    },
    totalSavingsAmount: {
        fontSize: 9,
        fontWeight: 'bold',
        // color: '#228B22',
    },

    totalsSection: {
        marginBottom: 6,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1,
    },

    paymentSection: {
        marginBottom: 6,
    },

    savingsHighlight: {
        alignItems: 'center',
        marginBottom: 6,
    },
    savingsHighlightText: {
        fontSize: 10,
        fontWeight: 'bold',
        // color: '#228B22',
        textAlign: 'center',
    },

    qrSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    qrContainer: {
        alignItems: 'center',
    },
    qrCode: {
        width: 50,
        height: 50,
    },
    controlInfo: {
        flex: 1,
        paddingLeft: 8,
    },
    controlText: {
        fontSize: 7,
        marginBottom: 1,
    },

    footer: {
        alignItems: 'center',
    },
    thankYouText: {
        fontSize: 10,
        // fontFamily: "Helvetica-Bold",
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    policyText: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        textAlign: 'center',
        marginBottom: 2,
        fontWeight: 'bold',
    },
    visitText: {
        fontSize: 8,
        textAlign: 'center',
    },

    bodyText: {
        fontSize: 8,
    },
    boldText: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    negativeText: {
        color: '#DC143C',
    },
});

export default EnhancedTransactionReceiptPDF;