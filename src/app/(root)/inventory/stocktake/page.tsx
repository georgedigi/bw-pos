"use client";
import React from "react";
import { ContentLayout } from "~/components/common/content-layout";
import { useAuthStore } from "~/store/auth-store";

const StockTake = () => {
  const { site_company } = useAuthStore();
  return (
    <ContentLayout title={site_company?.branch ?? ""}>StockTake</ContentLayout>
  );
};

export default StockTake;
