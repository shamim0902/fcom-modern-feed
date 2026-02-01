declare global {
    interface Window {
        fcomModernFeed: {
            rest: {
                url: string;
                nonce: string;
            };
            ajaxUrl: string;
            ajaxNonce: string;
            pluginUrl: string;
            user: {
                id: number;
                name: string;
                avatar: string;
                email: string;
            } | null;
            isLoggedIn: boolean;
            loginUrl: string;
            registerUrl: string;
            i18n: Record<string, string>;
            features: {
                reactions: boolean;
                comments: boolean;
                createPost: boolean;
                infiniteScroll: boolean;
                realTimeUpdates: boolean;
                mediaUpload: boolean;
            };
            settings: {
                tickerInterval: number;
                perPage: number;
            };
        };
    }
}

export interface ApiError {
    message: string;
    status?: number;
    errors?: Record<string, string[]>;
}

class ApiClient {
    private baseUrl: string;
    private nonce: string;

    constructor() {
        const config = window.fcomModernFeed;
        this.baseUrl = config.rest.url;
        this.nonce = config.rest.nonce;
    }

    private async request<T>(
        method: string,
        endpoint: string,
        data?: Record<string, unknown>
    ): Promise<T> {
        const headers: HeadersInit = {
            'X-WP-Nonce': this.nonce,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        // Handle method overrides for PUT/PATCH/DELETE (WordPress compatibility)
        let actualMethod = method.toUpperCase();
        if (['PUT', 'PATCH', 'DELETE'].includes(actualMethod)) {
            headers['X-HTTP-Method-Override'] = actualMethod;
            actualMethod = 'POST';
        }

        let url = `${this.baseUrl}/${endpoint}`;

        const options: RequestInit = {
            method: actualMethod,
            headers,
            credentials: 'same-origin',
        };

        if (method.toUpperCase() === 'GET' && data) {
            const params = new URLSearchParams();
            this.flattenParams(data, params);
            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        } else if (data) {
            options.body = JSON.stringify(data);
        }

        // Debug: Log the actual request
        if (endpoint === 'feeds' && method.toUpperCase() === 'POST') {
            console.log('[ApiClient] POST feeds - URL:', url);
            console.log('[ApiClient] POST feeds - Body:', options.body);
        }

        const response = await fetch(url, options);

        // Handle nonce expiry
        if (response.status === 401 || response.status === 403) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'rest_cookie_invalid_nonce') {
                await this.renewNonce();
                // Retry the request
                return this.request<T>(method, endpoint, data);
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'Request failed'
            }));
            throw {
                message: errorData.message || 'Request failed',
                status: response.status,
                errors: errorData.errors,
            } as ApiError;
        }

        return response.json();
    }

    private flattenParams(
        data: Record<string, unknown>,
        params: URLSearchParams,
        prefix = ''
    ): void {
        Object.entries(data).forEach(([key, value]) => {
            const paramKey = prefix ? `${prefix}[${key}]` : key;

            if (value === null || value === undefined) {
                return;
            }

            if (typeof value === 'object' && !Array.isArray(value)) {
                this.flattenParams(value as Record<string, unknown>, params, paramKey);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        this.flattenParams(item as Record<string, unknown>, params, `${paramKey}[${index}]`);
                    } else {
                        params.append(`${paramKey}[]`, String(item));
                    }
                });
            } else {
                params.append(paramKey, String(value));
            }
        });
    }

    private async renewNonce(): Promise<void> {
        const formData = new FormData();
        formData.append('action', 'fcom_mf_renew_nonce');
        formData.append('security', window.fcomModernFeed.ajaxNonce);

        const response = await fetch(window.fcomModernFeed.ajaxUrl, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.nonce) {
                this.nonce = data.data.nonce;
                window.fcomModernFeed.rest.nonce = data.data.nonce;
            }
        }
    }

    get<T>(endpoint: string, params?: object): Promise<T> {
        return this.request<T>('GET', endpoint, params as Record<string, unknown>);
    }

    post<T>(endpoint: string, data?: object): Promise<T> {
        return this.request<T>('POST', endpoint, data as Record<string, unknown>);
    }

    put<T>(endpoint: string, data?: object): Promise<T> {
        return this.request<T>('PUT', endpoint, data as Record<string, unknown>);
    }

    patch<T>(endpoint: string, data?: object): Promise<T> {
        return this.request<T>('PATCH', endpoint, data as Record<string, unknown>);
    }

    delete<T>(endpoint: string): Promise<T> {
        return this.request<T>('DELETE', endpoint);
    }

    async uploadFile(
        endpoint: string,
        formData: FormData
    ): Promise<{ media: { url: string; media_key: string; type: string; width?: number; height?: number } }> {
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': this.nonce,
            },
            credentials: 'same-origin',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'Upload failed'
            }));
            throw {
                message: errorData.message || 'Upload failed',
                status: response.status,
            } as ApiError;
        }

        return response.json();
    }
}

export const api = new ApiClient();
