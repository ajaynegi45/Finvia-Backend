import swaggerJSDoc from "swagger-jsdoc";


export const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Invoice Backend API",
            version: "1.0.0",
            description: "API documentation for Invoice system",
        },
        servers: [
            {
                url: "http://localhost:3000",
            },
        ],
    },
    apis: ["src/modules/**/*.ts", "src/docs/**/*.ts"],
});