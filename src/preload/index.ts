import { contextBridge, ipcRenderer } from 'electron';

// IPC channel strings inlined to avoid cross-rootDir import issues with tsconfig.preload.json
const IPC_CHANNELS = {
  LOAD_PROFILES: 'credential:load-profiles',
  VALIDATE_CREDENTIAL: 'credential:validate',
  SET_MANUAL_CREDENTIAL: 'credential:set-manual',
  FETCH_DASHBOARD: 'service:fetch-dashboard',
  FETCH_SERVICE_DATA: 'service:fetch-data',
  FETCH_SERVICE_DETAIL: 'service:fetch-detail',
  FETCH_METRICS: 'service:fetch-metrics',
  EXPORT_DATA: 'export:data',
  SHOW_SAVE_DIALOG: 'export:show-save-dialog',
  UPLOAD_DATA: 'upload:data',
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_CONFIGURE: 'upload:configure',
  UPLOAD_GET_CONFIG: 'upload:get-config',
  SWITCH_REGION: 'region:switch',
  GET_REGIONS: 'region:get-all',
  FETCH_BILLING_DASHBOARD: 'billing:fetch-dashboard',
  REFRESH_ALL: 'refresh:all',
  REFRESH_SERVICE: 'refresh:service',
} as const;

contextBridge.exposeInMainWorld('electronAPI', {
  credential: {
    loadProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROFILES),
    validate: (profile: unknown) => ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_CREDENTIAL, profile),
    setManual: (input: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SET_MANUAL_CREDENTIAL, input),
  },
  service: {
    fetchDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.FETCH_DASHBOARD),
    fetchData: (serviceName: string) => ipcRenderer.invoke(IPC_CHANNELS.FETCH_SERVICE_DATA, serviceName),
    fetchDetail: (serviceName: string, resourceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FETCH_SERVICE_DETAIL, serviceName, resourceId),
    fetchMetrics: (serviceName: string, resourceId: string, timeRange: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FETCH_METRICS, serviceName, resourceId, timeRange),
  },
  export: {
    exportData: (options: unknown) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_DATA, options),
    showSaveDialog: (defaultName: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, defaultName),
  },
  upload: {
    uploadData: () => ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_DATA),
    configure: (config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_CONFIGURE, config),
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_GET_CONFIG),
    onProgress: (callback: (progress: unknown) => void) => {
      ipcRenderer.on(IPC_CHANNELS.UPLOAD_PROGRESS, (_event, progress) => callback(progress));
    },
  },
  billing: {
    fetchDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.FETCH_BILLING_DASHBOARD),
  },
  region: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GET_REGIONS),
    switch: (region: string) => ipcRenderer.invoke(IPC_CHANNELS.SWITCH_REGION, region),
  },
  refresh: {
    all: () => ipcRenderer.invoke(IPC_CHANNELS.REFRESH_ALL),
    service: (serviceName: string) => ipcRenderer.invoke(IPC_CHANNELS.REFRESH_SERVICE, serviceName),
  },
});
