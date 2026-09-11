/**
 * Enhanced Direct Sale Submission
 * 
 * Modified submission function that uses final discounted prices
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import axios from 'axios';
import {
    calculateSubmissionData,
    formatItemsForSubmission,
    logSubmissionData
} from '../utils/enhancedSubmissionCalculator';

/**
 * Enhanced submit_direct_sale_request that uses final discounted prices
 * This replaces the original function with discount-aware calculations
 */
export async function submit_enhanced_direct_sale_request(
    site_url: string,
    company_prefix: string,
    user_id: string,
    username: string,
    currentCart: Cart, // 🎯 CHANGED: Now takes full cart instead of data_items
    customer: Customer,
    payments: PaymentCart[],
    customer_name: string,
    uid: string,
    pin: string,
) {
    console.log("🎯 Submitting enhanced payment details for direct sale");

    // 🎯 CALCULATE FINAL PRICES WITH ALL DISCOUNTS
    const submissionData = calculateSubmissionData(currentCart);

    // 🎯 LOG FOR DEBUGGING
    logSubmissionData(submissionData);

    // 🎯 USE FINAL TOTAL (AFTER ALL DISCOUNTS)
    const total = submissionData.totals.final_total;
    console.log("💰 Final total after all discounts:", total);

    // Validate quantities (same as original)
    if (currentCart.items) {
        currentCart.items.map((x) => {
            if (x.quantity > x.max_quantity) {
                return null;
            }
        });
    }

    // 🎯 FORMAT ITEMS WITH FINAL PRICES
    const formattedItems = formatItemsForSubmission(submissionData.items, customer);

    // Add bottles data from original items (preserve existing functionality)
    const items = formattedItems.map((formattedItem, index) => {
        const originalItem = currentCart.items[index];
        return {
            ...formattedItem,
            bottles_issued: originalItem?.bottles_issued ?? "",
            bottles_returned: originalItem?.bottles_returned ?? "",
        };
    });

    // Format payments (same as original)
    const payment = payments.flatMap((x) =>
        x.payments.map((y) => ({
            ...y,
            Transtype: x.paymentType,
        })),
    );

    console.log("💳 Payment data:", payment);
    console.log("📦 Enhanced items for submission:", items);

    // Prepare form data (same structure as original)
    const form_data = new FormData();
    form_data.append("tp", "booking-cash-payment");
    form_data.append("cp", company_prefix);
    form_data.append("id", user_id);
    form_data.append("ttp", payments[0]!.paymentType!);
    form_data.append("total", total.toString()); // 🎯 USES FINAL DISCOUNTED TOTAL
    form_data.append("pospayments", JSON.stringify(payment));
    form_data.append("posdesc", JSON.stringify(items)); // 🎯 USES ENHANCED ITEMS
    form_data.append("uname", username);
    form_data.append("cpbooking_id", "");
    form_data.append("cust_name", customer_name);
    form_data.append("unique_identifier", uid);
    form_data.append("cust_pin", pin);

    // 🎯 ADD DISCOUNT SUMMARY FOR BACKEND (optional - if backend needs it)
    form_data.append("discount_summary", JSON.stringify({
        subtotal: submissionData.totals.subtotal,
        automatic_discounts: submissionData.totals.total_automatic_discounts,
        manual_discounts: submissionData.totals.total_manual_discounts,
        bulk_discount: submissionData.totals.bulk_discount,
        final_total: submissionData.totals.final_total
    }));

    try {
        if (navigator.onLine) {
            const response = await axios.postForm<
                SalesReceiptInformation | OfflineSalesReceiptInformation
            >(`${site_url}process.php`, form_data);

            console.log("✅ Enhanced submission successful");
            console.log("📄 SALES RESPONSE", response.data);

            if (typeof response.data === "string") {
                // SEND STRING TO SENTRY
                return null;
            }

            return response.data;
        } else {
            // Offline mode - same structure as original but with enhanced data
            console.log("📱 Offline: Saving enhanced data to IndexedDB");

            return {
                offline: true,
                uid,
                customer: customer,
                uname: username,
                id: user_id,
                pin: pin,
                inv_date: new Date().toISOString(),
                pos_payments: JSON.stringify(payment),
                pos_items: JSON.stringify(items), // 🎯 Enhanced items with final prices
                total: total.toString(), // 🎯 Final discounted total
                synced: false,
                synced_at: "",
                // 🎯 ADD ENHANCED DATA FOR OFFLINE STORAGE
                discount_summary: JSON.stringify(submissionData.totals),
                original_cart: JSON.stringify(currentCart) // Preserve original data
            };
        }
    } catch (e) {
        console.error("❌ Enhanced submission error:", e);

        if (axios.isAxiosError(e)) {
            console.error("🌐 Network error, saving offline with enhanced data");
            return {
                offline: true,
                uid,
                customer: customer,
                uname: username,
                id: user_id,
                pin: pin,
                inv_date: new Date().toISOString(),
                pos_payments: JSON.stringify(payment),
                pos_items: JSON.stringify(items), // 🎯 Enhanced items with final prices
                total: total.toString(), // 🎯 Final discounted total
                synced: false,
                synced_at: "",
                // 🎯 ADD ENHANCED DATA FOR OFFLINE STORAGE
                discount_summary: JSON.stringify(submissionData.totals),
                original_cart: JSON.stringify(currentCart)
            };
        } else {
            console.error("💥 Failed to submit enhanced direct sale data");
            return null;
        }
    }
}

/**
 * Backward compatibility wrapper
 * Use this to replace the original submit_direct_sale_request
 */
export async function submit_direct_sale_request_enhanced(
    site_url: string,
    company_prefix: string,
    user_id: string,
    username: string,
    data_items: DirectSales[], // Original signature
    customer: Customer,
    payments: PaymentCart[],
    customer_name: string,
    uid: string,
    pin: string,
) {
    // Convert data_items back to cart format for enhanced processing
    const cart: Cart = {
        cart_id: uid,
        items: data_items
    };

    return submit_enhanced_direct_sale_request(
        site_url,
        company_prefix,
        user_id,
        username,
        cart,
        customer,
        payments,
        customer_name,
        uid,
        pin
    );
}