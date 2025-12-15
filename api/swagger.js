// swagger.js
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require('path');

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Hamro Yatra API",
            version: "1.0.0",
            description: "Platform API Documentation for Hamro Yatra",
        },
        servers: [
            {
                url: "http://localhost:8800",
                description: "Local Development Server",
            },
        ],
    },
    apis: [path.join(__dirname, './routes/*.js')],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = {
    swaggerUi,
    swaggerSpec,
};
