const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Hamro Yatra API',
        description: 'Platform API Documentation',
    },
    host: 'localhost:8800',
    schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);
