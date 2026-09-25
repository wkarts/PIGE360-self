declare const Vue: {
  reactive<T extends object>(value: T): T;
  createApp(options: { setup: () => object; render: Function; components?: Record<string,object> }): { mount: (selector: string) => void };
  nextTick(callback?: () => void): Promise<void>;
  onMounted(callback: () => void): void;
  onUnmounted(callback: () => void): void;
  computed<T>(getter: () => T): { readonly value: T };
};
declare const PigeRenders: { app: Function; portal: Function; expansion: Function };
