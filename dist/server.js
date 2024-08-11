"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// routes
const auth_1 = __importDefault(require("./routes/auth"));
const verify_1 = __importDefault(require("./routes/verify"));
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "8080");
const baseUrl = "/api/v1";
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.ORIGIN,
}));
app.use((0, morgan_1.default)("dev"));
// routes
app.use(`${baseUrl}/auth`, auth_1.default);
app.use(`${baseUrl}/verify`, verify_1.default);
// error handler
app.use((err, req, res, next) => {
    if (err.isValidationErr) {
        return res.status(err.httpStatusCode || 422).json({ message: err.message, errorStack: err.errorStack });
    }
    return res.status(err.httpStatusCode || 500).json({ message: err.message });
});
app.listen(port, () => {
    console.log(`[server]: server is listening on http://localhost:${port}`);
});
