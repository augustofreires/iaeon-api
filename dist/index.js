"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: ['https://app.iaeon.site', 'http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Auth routes
app.use('/api/auth', auth_routes_1.default);
// Admin routes
app.use('/api/admin', admin_routes_1.default);
// Webhook routes (public, no auth)
app.use('/api/webhooks', webhook_routes_1.default);
// Public routes (no auth)
app.use('/api', public_routes_1.default);
// User routes (requires auth)
app.use('/api/user', user_routes_1.default);
app.listen(PORT, () => {
    console.log(`[IAEON API] Server running on port ${PORT}`);
    console.log(`[IAEON API] Auth endpoints available at /api/auth/*`);
    console.log(`[IAEON API] Admin endpoints available at /api/admin/*`);
    console.log(`[IAEON API] Webhook endpoints available at /api/webhooks/*`);
});
exports.default = app;
