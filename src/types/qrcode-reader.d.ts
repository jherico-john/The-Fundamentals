declare module 'qrcode-reader' {
  export default class QrCode {
    callback: (
      err: Error | null,
      value: { result: string } | null
    ) => void;

    decode(bitmap: unknown): void;
  }
}