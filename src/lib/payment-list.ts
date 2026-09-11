import { Smartphone } from "lucide-react";

type PaymentOption = {
  id: string;
  title: string;
  description: string;
  icon: any;
};

export function getPaymentList(): PaymentOption[] {
  return [
    {
      id: "mpesa",
      title: "MPESA",
      description: "Pay with Mpesa",
      icon: Smartphone,
    },
  ];
}
