import { toast } from "sonner";
import { create } from "zustand";

interface PaymentCart {
  paymentType?: string;
  payments: Payment[];
}

interface PayState {
  paymentCarts: PaymentCart[];
  paidStatus: boolean;
  showAmountAlert: boolean;
  pendingPayment: {
    item: Payment;
    paymentType: string;
    requiredAmount: string;
  } | null;
  validateAndAddPayment: (params: {
    item: Payment;
    paymentType: string;
    balance: number;
  }) => void;
  confirmPendingPayment: () => void;
  cancelPendingPayment: () => void;
  addItemToPayments: (item: Payment, paymentType: string) => void;
  removeItemFromPayments: (paymentType: string, transID: string | number) => void;
  clearPaymentCarts: () => void;
  setPaidStatus: (status: boolean) => void;
}

export const usePayStore = create<PayState>((set) => ({
  paymentCarts: [],
  paidStatus: false,
  showAmountAlert: false,
  pendingPayment: null,

  validateAndAddPayment: ({ item, paymentType, balance }) => {
    try {
      console.log("Raw data uwu! ", item, paymentType, balance)
      
      const paymentAmount = parseFloat(item.TransAmount as string);

      if (isNaN(paymentAmount)) {
        toast.error("Invalid payment amount");
        return;
      }

      // Skip dialog for CASH payments
      if (paymentType.includes("CASH")) {
        set((state) => {
          state.addItemToPayments(item, paymentType);
          toast.success("Payment added successfully");
          return {
            showAmountAlert: false,
            pendingPayment: null
          };
        });
        return;
      }

      // Show dialog for non-CASH payments when amount exceeds balance
      if (paymentAmount > balance) {
        set({
          showAmountAlert: true,
          pendingPayment: {
            item,
            paymentType,
            requiredAmount: balance.toString()
          }
        });
      } else {
        set((state) => {
          state.addItemToPayments(item, paymentType);
          toast.success("Payment added successfully");
          return {
            showAmountAlert: false,
            pendingPayment: null
          };
        });
      }
    } catch (error) {
      console.error("Error validating payment:", error);
      toast.error("Error validating payment");
    }
  },

  confirmPendingPayment: () => {
    set((state) => {
      if (state.pendingPayment) {
        state.addItemToPayments(state.pendingPayment.item, state.pendingPayment.paymentType);
        toast.success("Payment added successfully");
      }
      return {
        showAmountAlert: false,
        pendingPayment: null
      };
    });
  },

  cancelPendingPayment: () => {
    set({
      showAmountAlert: false,
      pendingPayment: null
    });
  },

  addItemToPayments: (item, paymentType) => {
    set((state) => {
      const existingCartIndex = state.paymentCarts.findIndex(
        (cart) => cart.paymentType === paymentType,
      );

      if (existingCartIndex !== -1) {
        const updatedPaymentCarts = [...state.paymentCarts];

        if (updatedPaymentCarts[existingCartIndex]?.paymentType?.includes("CASH")) {
          const newPmnts = updatedPaymentCarts[existingCartIndex].payments.map(
            (payment) => ({
              ...payment,
              TransAmount: (
                parseFloat(payment.TransAmount as string) +
                parseFloat(item.TransAmount as string)
              ).toString(),
              TransTime: item.TransTime,
            }),
          );

          updatedPaymentCarts[existingCartIndex] = {
            ...updatedPaymentCarts[existingCartIndex],
            payments: newPmnts,
          };
        } else {
          const existingPaymentIndex = updatedPaymentCarts[existingCartIndex]?.payments
            .findIndex((payment) => payment.TransID === item.TransID);

          if (existingPaymentIndex !== -1) {
            toast.error("Transaction already exists");
            return state;
          }

          updatedPaymentCarts[existingCartIndex] = {
            ...updatedPaymentCarts[existingCartIndex],
            payments: [...updatedPaymentCarts[existingCartIndex]!.payments, item],
          };
        }

        return { ...state, paymentCarts: updatedPaymentCarts };
      }

      return {
        ...state,
        paymentCarts: [
          ...state.paymentCarts,
          { paymentType: paymentType || "", payments: [item] },
        ],
      };
    });
  },

  removeItemFromPayments: (paymentType, transID) => {
    set((state) => ({
      paymentCarts: state.paymentCarts
        .map((cart) =>
          cart.paymentType === paymentType
            ? {
              ...cart,
              payments: cart.payments.filter(
                (payment) => payment.TransID !== transID,
              ),
            }
            : cart,
        )
        .filter((cart) => cart.payments.length > 0),
    }));
  },

  clearPaymentCarts: () => {
    set({ paymentCarts: [], showAmountAlert: false, pendingPayment: null });
  },

  setPaidStatus: (status) => {
    set({ paidStatus: status });
  },
}));