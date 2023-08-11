"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const instrumentation_2 = require("@prisma/instrumentation");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const api_1 = require("@opentelemetry/api");
const otelCollertorEndpoint = process.env.OTEL_COLLECTOR_ENDPOINT || "http://localhost:4318/v1/traces";
const init = (serviceName, environment) => {
    // const exporter = new JaegerExporter(options)
    const samplingRatio = Number(process.env.OTEL_SAMPLING_RATIO) || 0.1;
    const OTLPExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: otelCollertorEndpoint,
    });
    api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.WARN);
    const provider = new sdk_trace_node_1.NodeTracerProvider({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
        }),
    });
    // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
    provider.addSpanProcessor(new sdk_trace_node_1.BatchSpanProcessor(OTLPExporter, {
        maxQueueSize: 1000000,
    }));
    provider.register();
    console.log("tracing initialized with sampleratio: ", samplingRatio);
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: [
            new instrumentation_http_1.HttpInstrumentation(),
            new instrumentation_express_1.ExpressInstrumentation(),
            new instrumentation_2.PrismaInstrumentation(),
        ],
        tracerProvider: provider,
    });
    const tracer = provider.getTracer(serviceName);
    return tracer;
};
exports.init = init;
