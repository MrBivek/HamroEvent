declare module "swagger-jsdoc" {
  import type { OpenAPIV3 } from "openapi-types";

  type SwaggerJSDocOptions = {
    definition: OpenAPIV3.Document;
    apis: string[];
  };

  export default function swaggerJSDoc(options: SwaggerJSDocOptions): OpenAPIV3.Document;
}
