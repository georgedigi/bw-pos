"use client";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";

import PaymentOptions from "~/components/common/payment-options";
import { useAuthStore } from "~/store/auth-store";
import { Button } from "~/components/ui/button";
import { usePayStore } from "~/store/pay-store";
import { tallyTotalAmountPaid } from "~/lib/utils";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import { Card, CardHeader } from "~/components/ui/card";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { Label } from "~/components/ui/label";
import { CustomerComboBox } from "~/components/common/customercombo";
import { useCustomers } from "~/hooks/use-customer-payments";
import { Users2 } from "lucide-react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import Image from "next/image";
import { Input } from "~/components/ui/input";
const AmountInput = dynamic(() => import("~/components/amount-input-box"), {
  ssr: false,
});

const Payment = () => {
  const { site_company } = useAuthStore();

  const [amount, setAmount] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>({
    branch_code: "8",
    br_name: "CASH SALE-POS",
    branch_ref: "CASH",
    debtor_no: "8",
    lat: "",
    lon: "",
    is_farmer: "0",
    sales_type: "1",
    pin: "",
  });
  const [pin, setPin] = useState<string>(selectedCustomer?.pin ?? "");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [pinDialogOpen, setPinDialogOpen] = useState<boolean>(false);
  const { paymentCarts, clearPaymentCarts } = usePayStore();
  const totalPaid = tallyTotalAmountPaid(paymentCarts);
  const router = useRouter();
  const { customer } = useCustomers();

  // Shared customer + PIN selectors used in both layouts
  const CustomerSelector = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer py-2 hover:bg-accent focus:bg-accent">
          <CardHeader className="flex-col items-center justify-center p-2">
            <Users2 className="h-10 w-10 font-light" />
            <h4 className="text-center text-sm font-normal">
              {selectedCustomer ? selectedCustomer.br_name : "Select Customer"}
            </h4>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <ul className="grid gap-3">
              <Separator className="my-2" />
              <Label>Select Customer</Label>
              <CustomerComboBox
                type="Customer"
                data={customer}
                setSelected={setSelectedCustomer}
              />
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setDialogOpen(false)}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const PinSelector = (
    <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer py-2 hover:bg-accent focus:bg-accent">
          <CardHeader className="flex-col items-center justify-center px-3 py-2">
            <Image
              src={"/images/kra-logo.png"}
              width={50}
              height={50}
              alt="kra-logo"
            />
            <h4 className="text-center text-sm font-normal">
              {pin.length >= 10 ? pin : "Customer Pin"}
            </h4>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer KRA Pin</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <ul className="grid gap-3">
              <Separator className="my-2" />
              <Input
                type="text"
                className="h-14 border-gray-700 bg-transparent px-1 text-right shadow-none"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Customer Pin"
              />
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setPinDialogOpen(false)}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardLayout title={site_company?.branch ?? ""}>
      {/* ── Mobile layout (< md) ── */}
      <div className="flex flex-col gap-4 p-4 pb-24 md:hidden">
        <Button
          onClick={() => {
            clearPaymentCarts();
            router.back();
          }}
          variant="destructive"
          className="w-full"
        >
          X Cancel
        </Button>

        {/* Payment method tiles */}
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">
            Select Payment Method
          </p>
          <PaymentOptions amount={amount} setAmount={setAmount} />
        </div>

        {/* Customer + PIN */}
        <div className="flex flex-row gap-3">
          {CustomerSelector}
          {PinSelector}
        </div>

        {/* Amount input / submit */}
        <div className="rounded-lg border p-4">
          <AmountInput
            value={amount}
            onChange={setAmount}
            paid={totalPaid}
            selectedCustomer={selectedCustomer}
            pin={pin}
            setPin={setPin}
          />
        </div>
      </div>

      {/* ── Desktop layout (≥ md) ── */}
      <div className="hidden md:block">
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[100vh] max-w-[100vw] rounded-lg border"
        >
          <ResizablePanel defaultSize={25}>
            <div className="flex h-full flex-col items-start justify-start space-y-4 p-6">
              <Button
                onClick={() => {
                  clearPaymentCarts();
                  router.back();
                }}
                variant="destructive"
                className="w-full"
              >
                X Cancel
              </Button>
              <PaymentOptions amount={amount} setAmount={setAmount} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize={75}
            className="flex h-full flex-col justify-between py-2"
          >
            <div className="flex flex-row space-x-4 px-6">
              {CustomerSelector}
              {PinSelector}
            </div>
            <div className="h-full flex-col items-start justify-between p-6">
              <AmountInput
                value={amount}
                onChange={setAmount}
                paid={totalPaid}
                selectedCustomer={selectedCustomer}
                pin={pin}
                setPin={setPin}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
};

export default Payment;
