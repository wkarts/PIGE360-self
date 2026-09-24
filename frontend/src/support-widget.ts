namespace PigeSupport {
  interface WidgetConfig {
    enabled: boolean;
    base_url: string;
    website_token: string;
    position: string;
    type: string;
    launcherTitle: string;
  }

  interface HubWindow extends Window {
    hubSettings?: { position: string; type: string; launcherTitle: string };
    hubSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
  }

  let loadedSource = '';
  let script: HTMLScriptElement | null = null;

  function normalizedBase(value: unknown): string {
    return String(value || '').replace(/\/+$/, '');
  }

  async function fetchConfig(schoolId = ''): Promise<WidgetConfig | null> {
    const path = schoolId
      ? '/api/v1/schools/' + encodeURIComponent(schoolId) + '/support-widget'
      : '/api/v1/support-widget';
    try {
      const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return null;
      return await response.json() as WidgetConfig;
    } catch {
      return null;
    }
  }

  export async function load(schoolId = ''): Promise<void> {
    const config = await fetchConfig(schoolId);
    if (!config?.enabled || !config.base_url || !config.website_token) return;

    const baseUrl = normalizedBase(config.base_url);
    const current = loadedSource;
    if (current === baseUrl && script) return;
    if (script && current !== baseUrl) {
      script.remove();
      script = null;
      loadedSource = '';
    }

    const pageWindow = window as HubWindow;
    pageWindow.hubSettings = {
      position: config.position || 'left',
      type: config.type || 'expanded_bubble',
      launcherTitle: config.launcherTitle || 'Suporte',
    };
    script = document.createElement('script');
    script.dataset.pigeSupportHub = 'true';
    script.src = baseUrl + '/packs/js/sdk.js';
    script.defer = true;
    script.async = true;
    script.onload = () => {
      const runtime = window as HubWindow;
      runtime.hubSDK?.run({
        websiteToken: config.website_token,
        baseUrl,
      });
    };
    script.onerror = () => {
      script = null;
      loadedSource = '';
    };
    loadedSource = baseUrl;
    document.head.appendChild(script);
  }
}
