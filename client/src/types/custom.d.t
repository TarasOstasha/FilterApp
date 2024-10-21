declare module 'throttle-debounce' {
    export function debounce(delay: number, callback: (...args: any[]) => void): (...args: any[]) => void;
    export function throttle(delay: number, callback: (...args: any[]) => void): (...args: any[]) => void;
}
