"use client";

// Built-in thermal printers on handheld POS devices (Sunmi, PAX, iMin, etc.)
// are normally exposed to the web view via a vendor-injected JS bridge object
// on `window`. No vendor SDK has been wired up yet, so this always reports
// "no printer" and callers fall back to the download flow.
// TODO: once the target device/SDK is known, set this to the real bridge
// name (e.g. Sunmi exposes something like `window.sunmiPrinter`) and adjust
// PrinterBridge below to match its actual method names.
const POS_PRINTER_BRIDGE_KEY = "POSPrinter";

interface PrinterBridge {
  isReady?: () => boolean;
  printBase64?: (base64: string) => void;
  print?: (base64: string) => void;
}

const getPrinterBridge = (): PrinterBridge | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as Record<string, PrinterBridge | undefined>)[
    POS_PRINTER_BRIDGE_KEY
  ];
};

export const isPrinterAvailable = (): boolean => {
  const bridge = getPrinterBridge();
  if (!bridge) return false;
  return bridge.isReady ? bridge.isReady() : true;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const printViaDeviceBridge = async (pdfBlob: Blob): Promise<void> => {
  const bridge = getPrinterBridge();
  if (!bridge) throw new Error("No built-in printer detected on this device");

  const printFn = bridge.printBase64 ?? bridge.print;
  if (!printFn) throw new Error("Printer bridge is missing a print method");

  const base64 = await blobToBase64(pdfBlob);
  printFn(base64);
};
