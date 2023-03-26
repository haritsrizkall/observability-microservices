"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const SimpleSpanProcessor_1 = require("@opentelemetry/sdk-trace-base/build/src/export/SimpleSpanProcessor");
const instrumentation_2 = require("@prisma/instrumentation");
//const hostName = 'localhost'
const hostName = process.env.OTEL_TRACE_HOST || 'localhost';
const options = {
    endpoint: `http://localhost:14268/api/traces`,
};
const init = (serviceName, environment) => {
    const exporter = new exporter_jaeger_1.JaegerExporter(options);
    const provider = new sdk_trace_node_1.NodeTracerProvider({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
        }),
    });
    // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
    provider.addSpanProcessor(new SimpleSpanProcessor_1.SimpleSpanProcessor(exporter));
    // Enable to see the spans printed in the console by the ConsoleSpanExporter
    //   provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter())) 
    // provider.register()
    provider.register();
    console.log('tracing initialized');
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: [
            new instrumentation_express_1.ExpressInstrumentation(),
            new instrumentation_http_1.HttpInstrumentation(),
            new instrumentation_2.PrismaInstrumentation(),
        ],
        tracerProvider: provider,
    });
    const tracer = provider.getTracer(serviceName);
    return tracer;
};
exports.init = init;
