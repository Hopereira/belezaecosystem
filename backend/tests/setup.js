/**
 * Jest test setup
 * Sets test environment variables before any module is loaded
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-unit-tests-only';
process.env.DB_PASSWORD = 'test-password';
