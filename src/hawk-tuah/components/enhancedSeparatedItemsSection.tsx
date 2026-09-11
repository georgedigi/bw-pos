/**
 * Enhanced Separated Items Section Component
 * 
 * MINIMAL changes - just better spacing and text handling
 * Maintains exact same structure as original
 * 
 * @author Kennedy Ngugi
 * @date 19-06-2025
 * @version 2.0.1 - Conservative enhancement
 */

import React from "react";
import {
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";
import { formatMoney } from "../utils/formatters";
interface EnhancedReceiptItem {
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
}

interface EnhancedSeparatedItemsSectionProps {
    items: EnhancedReceiptItem[];
    showDiscounts?: boolean;
    className?: string;
}

/**
 * Component to render items separated by category with quantity counts
 * Just separates bags (CR0001, CR0002) from other items
 */
const EnhancedSeparatedItemsSection: React.FC<EnhancedSeparatedItemsSectionProps> = ({
    items,
    showDiscounts = true
}) => {
    const BAG_ITEM_IDS = ["CR0001", "CR0002"];

    /**
     * Separate items into bags and other items based on item IDs
     * Also calculate total quantities for each section with error handling
     */
    const separateItems = () => {
        try {
            if (!items || !Array.isArray(items) || items.length === 0) {
                return {
                    bags: [],
                    otherItems: [],
                    bagsQuantity: 0,
                    otherItemsQuantity: 0
                };
            }

            const bags = items.filter(item => BAG_ITEM_IDS.includes(item.id));
            const otherItems = items.filter(item => !BAG_ITEM_IDS.includes(item.id));

            const calculateTotalQuantity = (itemArray: EnhancedReceiptItem[]) => {
                try {
                    return itemArray.reduce((total, item) => {
                        const quantity = typeof item.quantity === 'string'
                            ? parseFloat(item.quantity)
                            : item.quantity;

                        if (isNaN(quantity) || quantity < 0) {
                            console.warn(`Invalid quantity for item ${item.id}: ${item.quantity}`);
                            return total;
                        }

                        return total + quantity;
                    }, 0);
                } catch (error) {
                    console.error('Error calculating total quantity:', error);
                    return 0;
                }
            };

            const bagsQuantity = calculateTotalQuantity(bags);
            const otherItemsQuantity = calculateTotalQuantity(otherItems);

            return {
                bags,
                otherItems,
                bagsQuantity,
                otherItemsQuantity
            };
        } catch (error) {
            console.error('Error separating items:', error);
            return {
                bags: [],
                otherItems: [],
                bagsQuantity: 0,
                otherItemsQuantity: 0
            };
        }
    };

    const { bags, otherItems, bagsQuantity, otherItemsQuantity } = separateItems();

    /**
     * Render individual item with original formatting and error handling
     */
    const renderItem = (item: EnhancedReceiptItem, index: number) => {
        try {
            if (!item || !item.id) {
                console.warn('Invalid item data:', item);
                return null;
            }

            const displayQuantity = (() => {
                try {
                    const qty = typeof item.quantity === 'string'
                        ? parseFloat(item.quantity)
                        : item.quantity;
                    return isNaN(qty) ? 0 : qty;
                } catch {
                    return 0;
                }
            })();

            // Safe price formatting
            // const safeFormatMoney = (value: number) => {
            //     try {
            //         return formatMoney(isNaN(value) ? 0 : value);
            //     } catch (error) {
            //         console.warn('Error formatting money:', error);
            //         return '0.00';
            //     }
            // };

            // Truncates very long item names to prevent overflow
            const displayName = item.name && item.name.length > 35
                ? item.name.substring(0, 32) + '...'
                : item.name || 'Unknown Item';

            return (
                <View key={item.id} style={styles.itemContainer}>
                    <View style={styles.itemRow}>
                        <Text style={styles.itemCode}>{index + 1}</Text>
                        <Text style={styles.itemQty}>{displayQuantity}</Text>
                        <Text style={styles.itemName}>{displayName}</Text>
                        <Text style={styles.itemPrice}>{formatMoney(item.finalPrice)}</Text>
                    </View>

                    {item.hasDiscount && item.totalDiscount > 0 && (
                        <View style={styles.discountRow}>
                            <Text style={styles.originalPriceText}>
                                Original: {formatMoney(item.originalPrice)}
                            </Text>
                            <Text style={styles.savingsText}>
                                Saved: {formatMoney(item.totalDiscount)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.itemTotalRow}>
                        <Text style={styles.itemTotal}>
                            {formatMoney(item.lineTotal)}
                        </Text>
                    </View>
                </View>
            );
        } catch (error) {
            console.error('Error rendering item:', error, item);
            return (
                <View key={item?.id || `error-${index}`} style={styles.itemContainer}>
                    <Text style={styles.errorText}>Error displaying item</Text>
                </View>
            );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.itemsHeader}>
                <Text style={styles.headerText}>ITEM    QTY    DESCRIPTION              COST</Text>
            </View>

            <View style={styles.itemsList}>
                {otherItems.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>
                                Items ({otherItemsQuantity} qty)
                            </Text>
                        </View>
                        {otherItems.map((item, index) => renderItem(item, index)).filter(Boolean)}
                    </>
                )}

                {/* Separator if both sections exist */}
                {otherItems.length > 0 && bags.length > 0 && (
                    <View style={styles.sectionSeparator} />
                )}

                {bags.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>
                                Packaging ({bagsQuantity} qty)
                            </Text>
                        </View>
                        {bags.map((item, index) => renderItem(item, otherItems.length + index)).filter(Boolean)}
                    </>
                )}

                {otherItems.length === 0 && bags.length === 0 && (
                    <View style={styles.noItemsContainer}>
                        <Text style={styles.noItemsText}>No items to display</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
    },

    itemsHeader: {
        marginBottom: 4,
    },
    headerText: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    itemsList: {
        marginBottom: 6,
    },
    itemContainer: {
        marginBottom: 6,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    itemCode: {
        fontSize: 8,
        width: '8%',
    },
    itemQty: {
        fontSize: 8,
        width: '8%',
        textAlign: 'center',
    },
    itemName: {
        fontSize: 8,
        width: '60%',
        flexWrap: 'wrap',
    },
    itemPrice: {
        fontSize: 8,
        width: '24%',
        textAlign: 'right',
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 1,
        paddingLeft: '16%',
    },
    originalPriceText: {
        fontSize: 7,
        color: '#000',
        textDecoration: 'line-through',
    },
    savingsText: {
        fontSize: 7,
        // color: '#228B22',
        fontWeight: 'bold',
    },
    itemTotalRow: {
        alignItems: 'flex-end',
        marginTop: 1,
    },
    itemTotal: {
        fontSize: 8,
        fontWeight: 'bold',
    },

    sectionHeader: {
        marginBottom: 3,
        marginTop: 2,
    },
    sectionHeaderText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000',
    },

    sectionSeparator: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderStyle: 'dotted',
        marginVertical: 6,
    },

    errorText: {
        fontSize: 8,
        color: '#DC143C',
        fontStyle: 'italic',
    },
    noItemsContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    noItemsText: {
        fontSize: 8,
        color: '#666',
        fontStyle: 'italic',
    },
});

export default EnhancedSeparatedItemsSection;