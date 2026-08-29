export interface JudicialEnvironment {
  JUDICIAL_OPENDATA_ACCOUNT?: string;
  JUDICIAL_OPENDATA_PASSWORD?: string;
}

export interface JudicialCredentialBody {
  account?: string;
  password?: string;
  user?: string;
}

export function resolveJudicialCredentials(
  env: JudicialEnvironment,
  _body?: JudicialCredentialBody
) {
  return {
    memberAccount: env.JUDICIAL_OPENDATA_ACCOUNT || '',
    pwd: env.JUDICIAL_OPENDATA_PASSWORD || ''
  };
}

export function judicialUpstreamError(status: number) {
  return status === 401 || status === 403
    ? { code: 'JUDICIAL_AUTH_FAILED', message: '司法院帳密驗證失敗或遭拒絕' }
    : { code: 'JUDICIAL_API_UNAVAILABLE', message: '司法院外部服務暫時無法使用' };
}

export function normalizeJudicialResponse(status: number, data: unknown) {
  const body = data && typeof data === 'object' ? data as { succeeded?: unknown } : {};
  if (!((status >= 200 && status < 300) && body.succeeded !== false)) {
    const upstreamError = judicialUpstreamError(body.succeeded === false && status < 400 ? 401 : status);
    return {
      statusCode: status >= 400 ? status : 401,
      body: { succeeded: false, ...upstreamError }
    };
  }
  return null;
}
