"use client";
import { toast } from "sonner";
import { create } from "zustand";
import { generateRandomString } from "~/lib/utils";
import { setCart, getCart, deleteCart } from "~/utils/indexeddb";
import { useAuthStore } from "~/store/auth-store";
import { release_grading_tag } from "~/lib/actions/inventory.actions";
import { syncCart } from "~/lib/cart-sync";

interface CartState {
  selectedCartItem: DirectSales | null;
  currentCart: Cart | null;
  currentCustomer: Customer | null;
  copiedCartItems: DirectSales[] | null;
  addItemToCart: (item: DirectSales) => void;
  deleteItemFromCart: (item: DirectSales) => void;
  update_cart_item: (item: DirectSales) => void;
  saveCart: () => void;
  clearCart: () => void;
  loadCart: (cart_id: string) => void;
  restoreCart: (cart: Cart) => void;
  holdCart: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  setSelectedCartItem: (item: DirectSales | null) => void;
  setCopiedCartItems: (items: DirectSales[] | null) => void;
}

const LOCAL_STORAGE_KEY = "currentCart";
const invNo = generateRandomString(3);

// A scanned per-piece label is reserved on the server for the cart it goes
// into before it is added, so a new cart's id has to be known before the cart
// exists. The id handed out here is the one the next new cart takes.
let pendingCartId: string | null = null;
export const cartIdForNextItem = (): string => {
  const cart = useCartStore.getState().currentCart;
  if (cart) return cart.cart_id;
  if (!pendingCartId) pendingCartId = `cart_${invNo}${Date.now()}`;
  return pendingCartId;
};

// Graded codes and their per-piece labels: <stock>-<grade>-<number>
export const GRADED_CODE = /^.+-\d+$/;

const initialState = {
  selectedCartItem: null,
  currentCart: null,
  currentCustomer: {
    branch_code: "8",
    br_name: "CASH SALE-POS",
    branch_ref: "CASH",
    debtor_no: "8",
    lat: "",
    lon: "",
    is_farmer: "0",
    sales_type: "1",
    pin: "-",
  },
  copiedCartItems: null,
};

const safeLocalStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

export const useCartStore = create<CartState>((set, get) => {
  // Initialize store with data from localStorage if available
  if (typeof window !== 'undefined') {
    const storedCart = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        initialState.currentCart = parsedCart;
      } catch (error) {
        console.error('Failed to parse stored cart:', error);
      }
    }
  }

  return {
    ...initialState,

    addItemToCart: (item: DirectSales) => {
      const state = get();
      if (!state.currentCart) {
        const newCart: Cart = {
          cart_id: pendingCartId ?? `cart_${invNo}${Date.now()}`,
          items: [item],
        };
        pendingCartId = null;
        console.log("new cart", newCart);

        set({ currentCart: newCart });
        setCart(newCart).catch((error) =>
          console.error("Failed to set cart:", error),
        );
        safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newCart));
        syncCart("add", newCart, item);
      } else {
        const existingItemIndex = state.currentCart.items.findIndex(
          (cartItem) =>
            cartItem.item.stock_id === item.item.stock_id &&
            cartItem.item.description === item.item.description,
        );

        if (existingItemIndex !== -1) {
          const existingItem = state.currentCart.items[existingItemIndex];
          if (existingItem!.quantity + item.quantity > item.max_quantity) {
            toast.error("You can't add more than the max quantity");
          }
          const newQuantity = Math.min(
            existingItem!.quantity + item.quantity,
            item.max_quantity,
          );

          const updatedItems = state.currentCart.items.map((cartItem, index) =>
            index === existingItemIndex
              ? { ...cartItem, quantity: newQuantity }
              : cartItem,
          );

          const updatedCart: Cart = {
            ...state.currentCart,
            items: updatedItems,
          };

          set({ currentCart: updatedCart });
          setCart(updatedCart).catch((error) =>
            console.error("Failed to update cart:", error),
          );
          safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCart));
          syncCart("add", updatedCart, item);
        } else {
          const updatedCart: Cart = {
            ...state.currentCart,
            items: [...state.currentCart.items, item],
          };
          set({ currentCart: updatedCart });
          setCart(updatedCart).catch((error) =>
            console.error("Failed to update cart:", error),
          );
          safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCart));
          syncCart("add", updatedCart, item);
        }
      }
    },

    deleteItemFromCart: (item: DirectSales) => {
      const state = get();
      if (state.currentCart) {
        // Lines are one per code: a label's line shares its description with
        // every other label of the same item, so match the code too.
        const updatedItems = state.currentCart.items.filter(
          (cartItem) =>
            cartItem.item.stock_id !== item.item.stock_id ||
            cartItem.item.description !== item.item.description,
        );
        // give the label back so it can be scanned into another cart
        const { site_url, site_company } = useAuthStore.getState();
        if (GRADED_CODE.test(item.item.stock_id) && site_url && site_company)
          void release_grading_tag(
            site_url,
            site_company.company_prefix,
            state.currentCart.cart_id,
            item.item.stock_id,
          );

        const updatedCart: Cart = {
          ...state.currentCart,
          items: updatedItems,
        };

        set({ currentCart: updatedCart });
        setCart(updatedCart).catch((error) =>
          console.error("Failed to update cart:", error),
        );
        safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCart));
        syncCart("remove", updatedCart, { ...item, quantity: 0 });
      }
    },

    update_cart_item: (item: DirectSales) => {
      console.log("item", item);

      const previous = [...get().currentCart!.items] as DirectSales[];
      const new_state = previous.map((x) => {
        if (x.item.stock_id === item.item.stock_id) {
          if (x.item.description === item.item.description) {
            return item;
          }
          return item;
        }
        return x;
      });

      console.log("new_state", new_state);

      const before = previous.find((x) => x.item.stock_id === item.item.stock_id);
      const updatedCart = { ...get().currentCart!, items: new_state };
      set({ currentCart: updatedCart });
      syncCart(before && before.quantity !== item.quantity ? "qty" : "discount", updatedCart, item);
    },

    saveCart: () => {
      const state = get();
      if (state.currentCart) {
        setCart(state.currentCart).catch((error) =>
          console.error("Failed to save cart:", error),
        );
        safeLocalStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(state.currentCart),
        );
      }
    },

    clearCart: () => {
      const state = get();
      if (state.currentCart) {
        const cartId = state.currentCart.cart_id;
        set({ currentCart: null });
        safeLocalStorage.removeItem(LOCAL_STORAGE_KEY);
        deleteCart(cartId).catch((error) =>
          console.error("Failed to clear cart from IndexedDB:", error),
        );
      }
    },

    loadCart: (cart_id: string) => {
      const loadCartAsync = async () => {
        try {
          const cart = await getCart(cart_id);
          if (cart) {
            set({ currentCart: cart });
            safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
          }
        } catch (error) {
          console.error("Failed to load cart:", error);
        }
      };
      loadCartAsync().catch((error) =>
        console.error("Failed to load cart:", error),
      );
    },

    // A cart the server still has open for this cashier (see cart-sync),
    // brought back as it was, same id.
    restoreCart: (cart: Cart) => {
      set({ currentCart: cart });
      setCart(cart).catch((error) =>
        console.error("Failed to set cart:", error),
      );
      safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
    },

    holdCart: () => {
      set({ currentCart: null });
      safeLocalStorage.removeItem(LOCAL_STORAGE_KEY);
    },

    setSelectedCartItem: (item: DirectSales | null) => {
      set({ selectedCartItem: item });
    },

    setCurrentCustomer: (customer: Customer | null) => {
      set({ currentCustomer: customer });
    },

    setCopiedCartItems: (items: DirectSales[] | null) => {
      set({ copiedCartItems: items });
    },
  };
});