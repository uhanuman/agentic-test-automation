import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { VariableStore } from '../../core/variables/VariableStore';
import { ParameterResolver } from '../../core/variables/ParameterResolver';
import { Logger } from '../../core/logger/Logger';
import { AuthManager } from './AuthManager';
import { ConfigManager } from '../../core/config/ConfigManager';

export interface ApiResponse<T = any> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, any>;
  responseTimeMs: number;
}

export interface ApiClientOptions {
  authStrategy?: string;
  baseURL?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class ApiClient {
  private instance: AxiosInstance;
  private logger = new Logger('ApiClient');
  private authStrategyName: string;
  private maxRetries: number;
  private options: ApiClientOptions;

  constructor(options: ApiClientOptions = {}) {
    this.options = options;
    this.authStrategyName = options.authStrategy || 'token';
    this.maxRetries = options.maxRetries ?? 2;

    const timeouts = ConfigManager.getTimeouts();

    this.instance = axios.create({
      timeout: options.timeoutMs ?? timeouts.defaultMs ?? 15000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const envConfig = ConfigManager.getEnvironmentConfig();
    const dynamicBaseURL =
      config.baseURL ||
      this.options.baseURL ||
      VariableStore.get<string>('baseUrl', 'test') ||
      VariableStore.get<string>('baseUrl', 'global') ||
      envConfig.baseUrl;

    const resolvedUrl = ParameterResolver.resolve(url);
    const resolvedData = data ? ParameterResolver.resolveDeep(data) : undefined;
    const resolvedParams = config.params ? ParameterResolver.resolveDeep(config.params) : undefined;

    const authHeaders = await AuthManager.getAuthHeaders(this.authStrategyName);
    const mergedHeaders = {
      ...authHeaders,
      ...(config.headers || {})
    };

    const finalConfig: AxiosRequestConfig = {
      ...config,
      method,
      baseURL: dynamicBaseURL,
      url: resolvedUrl,
      data: resolvedData,
      params: resolvedParams,
      headers: mergedHeaders
    };

    this.logger.debug(`[HTTP REQ] ${method.toUpperCase()} ${resolvedUrl}`, {
      params: resolvedParams,
      data: resolvedData
    });

    let attempt = 0;
    let lastError: any;

    while (attempt <= this.maxRetries) {
      attempt++;
      const startTime = Date.now();

      try {
        const response: AxiosResponse<T> = await this.instance.request(finalConfig);
        const duration = Date.now() - startTime;

        this.logger.info(`[HTTP RES] ${method.toUpperCase()} ${resolvedUrl} -> ${response.status} (${duration}ms)`);

        return {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers as Record<string, any>,
          responseTimeMs: duration
        };
      } catch (err: any) {
        const duration = Date.now() - startTime;
        lastError = err;

        if (err.response) {
          this.logger.warn(
            `[HTTP ERR] ${method.toUpperCase()} ${resolvedUrl} -> ${err.response.status} (${duration}ms)`
          );

          const status = err.response.status;
          if ((status >= 502 && status <= 504) || status === 429) {
            if (attempt <= this.maxRetries) {
              await this.delay(attempt * 500);
              continue;
            }
          }

          return {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data,
            headers: err.response.headers,
            responseTimeMs: duration
          };
        } else {
          this.logger.error(`[NETWORK ERR] ${method.toUpperCase()} ${resolvedUrl}: ${err.message}`);
          if (attempt <= this.maxRetries) {
            await this.delay(attempt * 500);
            continue;
          }
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
