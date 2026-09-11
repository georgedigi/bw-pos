import { useQuery } from "@tanstack/react-query";
import {
  fetch_shift_collections,
  fetch_shifts,
} from "~/lib/actions/user.actions";

const fetchShiftCollections = async (
  site_url: string,
  company_prefix: string,
  start_date?: string,
  end_date?: string,
  shift_id?: string,
  cashier_id?: string,
): Promise<any> => {
  const collections = await fetch_shift_collections(
    site_url,
    company_prefix,
    start_date,
    end_date,
    shift_id,
    cashier_id,
  );
  return collections;
};

const fetchShifts = async (
  site_url: string,
  company_prefix: string,
  start_date?: string,
  end_date?: string,
  branch_code?: string,
): Promise<any> => {
  const shifts = await fetch_shifts(
    site_url,
    company_prefix,
    start_date,
    end_date,
    branch_code,
  );
  return shifts;
};

export const useShiftCollections = (
  site_url: string,
  company_prefix: string,
  start_date?: string,
  end_date?: string,
  shift_id?: string,
  cashier_id?: string,
) => {
  return useQuery({
    queryKey: ["shiftCollections", start_date, end_date],
    queryFn: () =>
      fetchShiftCollections(
        site_url,
        company_prefix,
        start_date,
        end_date,
        shift_id,
        cashier_id,
      ),
  });
};

export const useShifts = (
  site_url: string,
  company_prefix: string,
  start_date?: string,
  end_date?: string,
  branch_code?: string,
) => {
  return useQuery({
    queryKey: ["shifts", start_date, end_date],
    queryFn: () =>
      fetchShifts(site_url, company_prefix, start_date, end_date, branch_code),
  });
};
