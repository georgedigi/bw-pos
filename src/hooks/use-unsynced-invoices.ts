"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllUnsyncedInvoices, getUnsyncedInvoices } from "~/utils/indexeddb";

const fetchUnsyncedInvoices = async (): Promise<any> => {
  const unsycevInvoices = await getUnsyncedInvoices();

  return unsycevInvoices;
};

const fetchOfflineInvoices = async (): Promise<any> => {
  const unsycevInvoices = await getAllUnsyncedInvoices();
  return unsycevInvoices;
};

export const useUnsyncedInvoices = () => {
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery<any, Error>({
    queryKey: ["unsyncedInvoices"],
    queryFn: fetchUnsyncedInvoices,

    // staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    unsyncedInvoices: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["unsyncedInvoices"] }),
  };
};
export const useOfflineInvoices = () => {
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery<any, Error>({
    queryKey: ["offlineInvoices"],
    queryFn: fetchOfflineInvoices,

    // staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    unsyncedInvoices: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["offlineInvoices"] }),
  };
};
