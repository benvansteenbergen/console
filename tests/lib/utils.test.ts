import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
    describe('cn (className merger)', () => {
        it('should merge classes correctly', () => {
            const result = cn('base-class', 'additional-class');
            expect(result).toContain('base-class');
            expect(result).toContain('additional-class');
        });

        it('should handle conditional classes', () => {
            const result = cn('base', true && 'truthy', false && 'falsy');
            expect(result).toContain('base');
            expect(result).toContain('truthy');
            expect(result).not.toContain('falsy');
        });

        it('should handle Tailwind conflicts', () => {
            const result = cn('px-2', 'px-4');
            // tailwind-merge should keep only px-4
            expect(result).toBe('px-4');
        });

        it('should handle empty inputs', () => {
            const result = cn();
            expect(result).toBe('');
        });

        it('should handle arrays', () => {
            const result = cn(['class1', 'class2']);
            expect(result).toContain('class1');
            expect(result).toContain('class2');
        });
    });
});
