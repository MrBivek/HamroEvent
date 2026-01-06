import { env } from "./env.js";
import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

export function setupSwagger(app: Express) {
  const spec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Evently API",
        version: "1.0.0",
        description: "API Documentation",
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: "Local API Server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    apis: ["src/**/*.ts"],
  });

  app.get("/swagger.json", (_req, res) => res.json(spec));
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
}
