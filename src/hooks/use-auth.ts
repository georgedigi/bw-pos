// hooks/useAuth.ts
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "~/store/auth-store";

const fetchAuthState = async () => {
  const authState = JSON.parse(localStorage.getItem("auth-storage") || "{}");
  return authState.state;
};

const useAuth = () => {
  const {
    setReceiptInfo,
    setSiteInfo,
    setSiteUrl,
    setSiteCompany,
    setAccountInfo,
    setWithoutSignInAuth,
  } = useAuthStore((state) => ({
    setReceiptInfo: state.set_receipt_info,
    setSiteInfo: state.set_site_info,
    setSiteUrl: state.set_site_url,
    setSiteCompany: state.set_site_company,
    setAccountInfo: state.set_account_info,
    setWithoutSignInAuth: state.set_without_sign_in_auth,
  }));

  return useMutation({
    mutationKey: ["authState"],
    mutationFn: fetchAuthState,

    onSuccess: (data: AuthInfo) => {
      if (data) {
        setReceiptInfo(data.receipt_info!);
        setSiteInfo(data.site_info!);
        setSiteUrl(data.site_url!);
        setSiteCompany(data.site_company!);
        setAccountInfo(data.account!);
        setWithoutSignInAuth(data.without_sign_in_auth!);
      }
    },
  });
};

export default useAuth;
