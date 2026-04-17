export const IPC_CHANNELS = {
  // 凭证管理
  LOAD_PROFILES: 'credential:load-profiles',
  VALIDATE_CREDENTIAL: 'credential:validate',
  SET_MANUAL_CREDENTIAL: 'credential:set-manual',

  // 服务数据
  FETCH_DASHBOARD: 'service:fetch-dashboard',
  FETCH_SERVICE_DATA: 'service:fetch-data',
  FETCH_SERVICE_DETAIL: 'service:fetch-detail',
  FETCH_METRICS: 'service:fetch-metrics',

  // 数据导出/上传
  EXPORT_DATA: 'export:data',
  SHOW_SAVE_DIALOG: 'export:show-save-dialog',
  UPLOAD_DATA: 'upload:data',
  UPLOAD_PROGRESS: 'upload:progress',

  // Region
  SWITCH_REGION: 'region:switch',
  GET_REGIONS: 'region:get-all',

  // 账单 Dashboard
  FETCH_BILLING_DASHBOARD: 'billing:fetch-dashboard',

  // 刷新
  REFRESH_ALL: 'refresh:all',
  REFRESH_SERVICE: 'refresh:service',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
