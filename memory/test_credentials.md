# Test Credentials

## Test User Account
- Email: teste@mentoria.com
- Password: Teste@1234
- Role: user

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me (requires Bearer token)

## Notes
- Authentication uses JWT tokens passed via Authorization: Bearer header.
- Token is returned in login/register response body as `access_token`.
- Use the test user above (or register a new one) to test authenticated endpoints.
