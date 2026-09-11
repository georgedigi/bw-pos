import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch_customers } from "~/lib/actions/pay.actions";
import { useAuthStore } from "~/store/auth-store";

const fetchCustomerData = async (): Promise<Customer[]> => {
  const { site_company, site_url } = useAuthStore.getState();

  // Fetch from API
  const customers = await fetch_customers(
    site_url!,
    site_company!.company_prefix,
  );

  const list = customers || [];

  return list;
};

export const useCustomers = () => {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery<Customer[], Error>({
    queryKey: ["customers"],
    queryFn: fetchCustomerData,
    // staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    customer: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  };
};
