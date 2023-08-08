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
const otelCollertorEndpoint = process.env.OTEL_COLLECTOR_ENDPOINT || "http://localhost:4318/v1/traces";
const init = (serviceName, environment) => {
    // const exporter = new JaegerExporter(options)
    const samplingRatio = Number(process.env.OTEL_SAMPLING_RATIO) || 0.1;
    const OTLPExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: otelCollertorEndpoint,
    });
    const provider = new sdk_trace_node_1.NodeTracerProvider({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
        }),
        sampler: new sdk_trace_node_1.ParentBasedSampler({
            root: new sdk_trace_node_1.TraceIdRatioBasedSampler(samplingRatio),
        }),
    });
    // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
    provider.addSpanProcessor(new sdk_trace_node_1.BatchSpanProcessor(OTLPExporter));
    // Enable to see the spans printed in the console by the ConsoleSpanExporter
    provider.addSpanProcessor(new sdk_trace_node_1.SimpleSpanProcessor(new sdk_trace_node_1.ConsoleSpanExporter()));
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
