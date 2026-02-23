import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { OpenAPI } from "@/core/OpenAPI";
import { useAuthStore } from "@/store/authStore.ts";
import { API_BASE } from "@/lib/api";

OpenAPI.BASE = API_BASE;
OpenAPI.TOKEN = async () => useAuthStore.getState().token || "";

createRoot(document.getElementById("root")!).render(<App />);
