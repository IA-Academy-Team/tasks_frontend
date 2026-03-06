type RuntimeEnv = Record<string, string | boolean | undefined>;

const getRuntimeEnv = (): RuntimeEnv => {
    const candidate = (import.meta as ImportMeta & { env?: RuntimeEnv }).env;
    if (!candidate || typeof candidate !== 'object') return {};
    return candidate;
};

const runtimeEnv = getRuntimeEnv();
const isProd = Boolean(runtimeEnv.PROD);

export const API_PREFIX = "/api";
export const AUTH_BASE_PATH = `${API_PREFIX}/auth`;
export const AUTH_HANDLER_BASE_PATH = `${AUTH_BASE_PATH}/handler`;

export const API_URL =
    (isProd
        ? runtimeEnv.VITE_API_URL_PROD
        : runtimeEnv.VITE_API_URL_DEV) ||
    runtimeEnv.VITE_API_URL ||
    'http://localhost:3004';

interface RequestOptions extends RequestInit {
    data?: unknown;
}

export class ApiError extends Error {
    status?: number;
    code?: string;
    details?: unknown;
    endpoint?: string;

    constructor(params: {
        message: string;
        status?: number;
        code?: string;
        details?: unknown;
        endpoint?: string;
    }) {
        super(params.message);
        this.name = 'ApiError';
        this.status = params.status;
        this.code = params.code;
        this.details = params.details;
        this.endpoint = params.endpoint;
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const toStringOrUndefined = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
};

export const apiFetch = async <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T | null> => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const config: RequestInit = {
        credentials: 'include',
        ...options,
        headers,
    };

    if (options.data) {
        config.body = JSON.stringify(options.data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
        const parsedError = await response.json().catch(() => ({}));
        const errorData = isRecord(parsedError) ? parsedError : {};
        throw new ApiError({
            message:
                toStringOrUndefined(errorData.error) ||
                toStringOrUndefined(errorData.message) ||
                'Algo salió mal',
            status: response.status,
            code:
                toStringOrUndefined(errorData.code) ||
                toStringOrUndefined(errorData.errorCode),
            details: errorData.details,
            endpoint,
        });
    }

    if (response.status === 204) {
        return null;
    }

    return (await response.json()) as T;
};

export const api = {
    get: <T = unknown>(endpoint: string, options: RequestOptions = {}) =>
        apiFetch<T>(endpoint, { ...options, method: 'GET' }),

    post: <T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}) =>
        apiFetch<T>(endpoint, { ...options, method: 'POST', data }),

    patch: <T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}) =>
        apiFetch<T>(endpoint, { ...options, method: 'PATCH', data }),

    put: <T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}) =>
        apiFetch<T>(endpoint, { ...options, method: 'PUT', data }),

    delete: <T = unknown>(endpoint: string, options: RequestOptions = {}) =>
        apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

    getBlob: async (endpoint: string, options: RequestOptions = {}) => {
        const headers = new Headers(options.headers || {});
        const response = await fetch(`${API_URL}${endpoint}`, {
            credentials: 'include',
            ...options,
            method: 'GET',
            headers,
        });
        if (!response.ok) {
            throw new Error('Error downloading file');
        }
        return response.blob();
    }
};
