import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { OpenAPI } from "@/core/OpenAPI";
import { useAuthStore } from "@/store/authStore.ts";
import { API_BASE } from "@/lib/api";
import { ThemeProvider } from "@/components/theme/ThemeProvider.tsx";

OpenAPI.BASE = API_BASE;
OpenAPI.TOKEN = async () => useAuthStore.getState().token || "";

createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <App />
    </ThemeProvider>
);
