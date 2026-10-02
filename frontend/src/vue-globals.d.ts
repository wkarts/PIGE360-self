declare const Vue: {
  reactive<T extends object>(value: T): T;
  createApp(options: { setup: () => object; render: Function; components?: Record<string,object> }): { mount: (selector: string) => void };
  nextTick(callback?: () => void): Promise<void>;
  onMounted(callback: () => void): void;
  onUnmounted(callback: () => void): void;
  onBeforeUnmount(callback: () => void): void;
  watch<T>(source: () => T, callback: (value: T, previous: T) => void): () => void;
  computed<T>(getter: () => T): { readonly value: T };
};
declare const PigeRenders: { app: Function; camera: Function; users: Function; portal: Function; expansion: Function; diagnostics: Function; assist: Function; diary: Function; contracts: Function; signing: Function; reports: Function; legacyImport: Function; learning: Function; community: Function; news: Function; mailcow: Function; audit: Function; email: Function; lifecycle: Function };
