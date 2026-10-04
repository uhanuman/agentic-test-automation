export interface IAuthStrategy {
  getHeaders(): Promise<Record<string, string>>;
}
