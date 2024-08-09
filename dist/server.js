"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "8080");
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.ORIGIN,
}));
app.listen(port, () => {
    console.log(`[server]: server is listening on http://localhost:${port}`);
});
