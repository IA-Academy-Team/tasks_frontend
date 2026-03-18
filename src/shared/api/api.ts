import { toast } from "react-toastify";
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
    toast?: {
        enabled?: boolean;
        showSuccess?: boolean;
        showError?: boolean;
        successMessage?: string;
        errorMessage?: string;
    };
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

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const DEFAULT_SUCCESS_MESSAGE = "Accion realizada correctamente.";
const DEFAULT_NETWORK_ERROR_MESSAGE = "No fue posible conectar con el servidor.";

const getRequestMethod = (options: RequestOptions): string =>
    (options.method ?? "GET").toUpperCase();

const shouldShowSuccessToast = (options: RequestOptions): boolean => {
    const method = getRequestMethod(options);
    const isMutation = MUTATION_METHODS.has(method);
    const toastOptions = options.toast;
    const enabled = toastOptions?.enabled ?? isMutation;
    return enabled && (toastOptions?.showSuccess ?? isMutation);
};

const shouldShowErrorToast = (options: RequestOptions): boolean => {
    const toastOptions = options.toast;
    const enabled = toastOptions?.enabled ?? true;
    return enabled && (toastOptions?.showError ?? true);
};

const emitSuccessToast = (options: RequestOptions, endpoint: string) => {
    if (!shouldShowSuccessToast(options)) {
        return;
    }

    const successMessage = options.toast?.successMessage ?? DEFAULT_SUCCESS_MESSAGE;
    toast.success(successMessage, {
        toastId: `api-success-${getRequestMethod(options)}-${endpoint}-${successMessage}`,
    });
};

const emitErrorToast = (message: string, options: RequestOptions, endpoint: string, status?: number, code?: string) => {
    if (!shouldShowErrorToast(options)) {
        return;
    }

    const errorMessage = options.toast?.errorMessage ?? message;
    toast.error(errorMessage, {
        toastId: `api-error-${getRequestMethod(options)}-${endpoint}-${status ?? "network"}-${code ?? "unknown"}-${errorMessage}`,
    });
};

export const apiFetch = async <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T | null> => {
    const { data, ...requestOptions } = options;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const config: RequestInit = {
        credentials: 'include',
        ...requestOptions,
        headers,
    };

    if (data !== undefined) {
        config.body = JSON.stringify(data);
    }

    let response: Response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, config);
    } catch {
        emitErrorToast(DEFAULT_NETWORK_ERROR_MESSAGE, options, endpoint);
        throw new ApiError({
            message: DEFAULT_NETWORK_ERROR_MESSAGE,
            endpoint,
        });
    }

    if (!response.ok) {
        const parsedError = await response.json().catch(() => ({}));
        const errorData = isRecord(parsedError) ? parsedError : {};
        const errorMessage =
            toStringOrUndefined(errorData.error) ||
            toStringOrUndefined(errorData.message) ||
            'Algo salió mal';
        const errorCode =
            toStringOrUndefined(errorData.code) ||
            toStringOrUndefined(errorData.errorCode);

        emitErrorToast(errorMessage, options, endpoint, response.status, errorCode);

        throw new ApiError({
            message: errorMessage,
            status: response.status,
            code: errorCode,
            details: errorData.details,
            endpoint,
        });
    }

    if (response.status === 204) {
        emitSuccessToast(options, endpoint);
        return null;
    }

    const parsedData = (await response.json()) as T;
    emitSuccessToast(options, endpoint);
    return parsedData;
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
        let response: Response;
        try {
            response = await fetch(`${API_URL}${endpoint}`, {
                credentials: 'include',
                ...options,
                method: 'GET',
                headers,
            });
        } catch {
            emitErrorToast(DEFAULT_NETWORK_ERROR_MESSAGE, options, endpoint);
            throw new ApiError({
                message: DEFAULT_NETWORK_ERROR_MESSAGE,
                endpoint,
            });
        }

        if (!response.ok) {
            const message = 'No fue posible descargar el archivo.';
            emitErrorToast(message, options, endpoint, response.status);
            throw new ApiError({
                message,
                status: response.status,
                endpoint,
            });
        }
        return response.blob();
    }
};
