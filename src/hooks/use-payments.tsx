"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetch_manual_bank_payment_accounts,
  fetch_mpesa_transactions,
} from "~/lib/actions/pay.actions";
import { useAuthStore } from "~/store/auth-store";

const fetchManualPayments = async (): Promise<ManualBankPaymentAccount[]> => {
  const { site_company, site_url, account } = useAuthStore.getState();

  // Fetch from API
  const banks = await fetch_manual_bank_payment_accounts(
    site_url!,
    site_company!.company_prefix,
    account!.id,
  );

  const list = banks || [];
  return list;
};

const fetchMpesaPayments = async (): Promise<Payment[]> => {
  const { site_company, account, site_url } = useAuthStore.getState();

  // Fetch from API
  const mpesa = await fetch_mpesa_transactions(
    site_url!,
    site_company!.company_prefix,
    account!.id,
  );

  const list = mpesa || [];
  return list;
};

export const useManualPayments = () => {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery<
    ManualBankPaymentAccount[],
    Error
  >({
    queryKey: ["manualPayments"],
    queryFn: fetchManualPayments,
    // staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    manualPayments: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["manualPayments"] }),
  };
};

export const useMpesaPayments = () => {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery<Payment[], Error>({
    queryKey: ["mpesaPayments"],
    queryFn: fetchMpesaPayments,
    // staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    mpesaPayments: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["mpesaPayments"] }),
  };
};
