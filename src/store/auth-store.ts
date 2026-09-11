import { create } from "zustand";
import { persist, createJSONStorage, devtools } from "zustand/middleware";

export const useAuthStore = create<AuthInfo>()(
  devtools(
    persist(
      (set, get) => {
        return {
          receipt_info: null,
          site_info: null,
          site_url: null,
          site_company: null,
          account: null,
          without_sign_in_auth: null,
          clear_auth_session: () => {
            set({
              receipt_info: null,
              site_info: null,
              site_url: null,
              site_company: null,
              account: null,
              without_sign_in_auth: null,
            });
            localStorage.removeItem("roles");
            localStorage.removeItem("start_shift");
          },

          set_site_url: (url: string) => set(() => ({ site_url: url })),
          set_receipt_info: (data: CompanyReceiptInfo) =>
            set(() => ({ receipt_info: data })),
          set_site_info: (data: SiteInfo) => set(() => ({ site_info: data })),
          set_site_company: (s: SiteCompany) =>
            set(() => ({ site_company: s })),
          set_account_info: (a: UserAccountInfo) => set(() => ({ account: a })),
          set_without_sign_in_auth: (e: EndpointAuthInfo) =>
            set(() => ({ without_sign_in_auth: e })),
          get_auth_data: () => {
            const store = get();
            if (store.without_sign_in_auth === null) {
              return {
                url: store.site_info?.company_url ?? "",
                prefix: store.site_company?.company_prefix ?? "",
                user_id: store.account?.id ?? "",
                username: store.account?.user_id ?? "",
                default_store: store.account?.default_store ?? "",
                site_name: store.receipt_info?.name ?? "",
              };
            } else {
              return store.without_sign_in_auth;
            }
          },

          is_authenticated: () => {
            const store = get();
            return (
              store.without_sign_in_auth !== null ||
              (store.site_info !== null &&
                store.account !== null &&
                store.receipt_info !== null)
            );
          },
        };
      },
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
      },
    ),
    { name: "auth", store: "auth" },
  ),
);
