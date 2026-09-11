// types/thermal-printer.d.ts

declare module "thermal-printer" {
  export interface PrinterOptions {
    type: string;
    interface: string;
    width?: number;
    characterSet?: string;
    removeSpecialCharacters?: boolean;
    replaceSpecialCharacters?: boolean;
  }

  class Printer {
    constructor(options: PrinterOptions);
    alignCenter(): void;
    println(text: string): void;
    drawLine(): void;
    cut(): void;
    execute(): Promise<void>;
  }

  export default Printer;
}
