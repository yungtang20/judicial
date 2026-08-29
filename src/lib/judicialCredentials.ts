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
