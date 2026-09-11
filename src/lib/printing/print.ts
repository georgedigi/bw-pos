const printReceipt = async (data: TransactionReportItem): Promise<void> => {
  if (typeof window !== "undefined") {
    console.warn("printReceipt function can only be run on the server side.");
    return;
  }
  const Printer = (await import("thermal-printer")).default;
  const printer = new Printer({
    type: "epson",
    interface: "/dev/usb/lp0", // Adjust this based on your setup
  });

  printer.alignCenter();
  printer.println(data.customername);
  printer.println(data.unique_identifier);
  printer.drawLine();

  const items = JSON.parse(data.pitems);
  items.forEach(
    (item: { item_option: string; quantity: number; price: number }) => {
      printer.println(
        `${item.item_option} x ${item.quantity} - KES ${item.price}`,
      );
    },
  );

  printer.drawLine();
  printer.println(`Total: KES ${data.ptotal}`);
  printer.cut();

  try {
    await printer.execute();
    console.log("Print successful");
  } catch (error) {
    console.error("Print failed:", error);
  }
};

export default printReceipt;
