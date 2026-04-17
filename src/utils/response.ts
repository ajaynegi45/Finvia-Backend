export function ok<T>(data: T, meta?: unknown) {
    return {
        success: true,
        data,
        ...(meta ? { meta } : {}),
    };
}
