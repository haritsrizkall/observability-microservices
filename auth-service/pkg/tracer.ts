import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  NodeTracerProvider,
  ParentBasedSampler,
  SimpleSpanProcessor,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const otelCollertorEndpoint =
  process.env.OTEL_COLLECTOR_ENDPOINT || "http://localhost:4318/v1/traces";

export const init = (serviceName: any, environment: any) => {
  // const exporter = new JaegerExporter(options)
  const samplingRatio = Number(process.env.OTEL_SAMPLING_RATIO) || 0.1;
  const OTLPExporter = new OTLPTraceExporter({
    url: otelCollertorEndpoint,
  });

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(samplingRatio),
    }),
  });

  // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
  provider.addSpanProcessor(new BatchSpanProcessor(OTLPExporter));

  provider.register();

  console.log("tracing initialized with sampleratio: ", samplingRatio);

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PrismaInstrumentation(),
    ],
    tracerProvider: provider,
  });

  const tracer = provider.getTracer(serviceName);
  return tracer;
};
