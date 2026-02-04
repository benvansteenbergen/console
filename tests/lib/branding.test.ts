import { describe, it, expect } from 'vitest';
import { detectBranding, BRAND } from '@/lib/branding';

describe('branding', () => {
    describe('detectBranding', () => {
        it('should detect wingsuite brand', () => {
            const brand = detectBranding('console.wingsuite.io');
            expect(brand.name).toBe('Wingsuite');
            expect(brand.domain).toBe('console.wingsuite.io');
        });

        it('should detect emotion brand', () => {
            const brand = detectBranding('ai.emotion.nl');
            expect(brand.name).toBe('AI Motion');
            expect(brand.domain).toBe('ai.emotion.nl');
        });

        it('should return wingsuite as default for unknown hostname', () => {
            const brand = detectBranding('unknown.domain.com');
            expect(brand.name).toBe('Wingsuite');
        });

        it('should handle undefined hostname', () => {
            const brand = detectBranding(undefined);
            expect(brand.name).toBe('Wingsuite');
        });

        it('should handle partial hostname matches', () => {
            const brand = detectBranding('subdomain.console.wingsuite.io');
            expect(brand.name).toBe('Wingsuite');
        });
    });

    describe('BRAND object', () => {
        it('should have all required fields for wingsuite', () => {
            expect(BRAND.wingsuite).toHaveProperty('name');
            expect(BRAND.wingsuite).toHaveProperty('domain');
            expect(BRAND.wingsuite).toHaveProperty('logo');
            expect(BRAND.wingsuite).toHaveProperty('loginImage');
            expect(BRAND.wingsuite).toHaveProperty('loginBg');
            expect(BRAND.wingsuite).toHaveProperty('primaryColor');
        });

        it('should have all required fields for emotion', () => {
            expect(BRAND.emotion).toHaveProperty('name');
            expect(BRAND.emotion).toHaveProperty('domain');
            expect(BRAND.emotion).toHaveProperty('logo');
            expect(BRAND.emotion).toHaveProperty('loginImage');
            expect(BRAND.emotion).toHaveProperty('loginBg');
            expect(BRAND.emotion).toHaveProperty('primaryColor');
        });

        it('should have valid color hex codes', () => {
            const hexPattern = /^#[0-9A-Fa-f]{6}$/;
            expect(BRAND.wingsuite.loginBg).toMatch(hexPattern);
            expect(BRAND.wingsuite.primaryColor).toMatch(hexPattern);
            expect(BRAND.emotion.loginBg).toMatch(hexPattern);
            expect(BRAND.emotion.primaryColor).toMatch(hexPattern);
        });
    });
});
