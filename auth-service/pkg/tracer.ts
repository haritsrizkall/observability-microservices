import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base/build/src/export/SimpleSpanProcessor";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const otelCollertorEndpoint =
  process.env.OTEL_COLLECTOR_ENDPOINT || "http://localhost:4318/v1/traces";

export const init = (serviceName: any, environment: any) => {
  // const exporter = new JaegerExporter(options)
  const OTLPExporter = new OTLPTraceExporter({
    url: otelCollertorEndpoint,
  });

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    }),
  });

  // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
  provider.addSpanProcessor(new SimpleSpanProcessor(OTLPExporter));

  // Enable to see the spans printed in the console by the ConsoleSpanExporter

  provider.register();

  console.log("tracing initialized");

  registerInstrumentations({
    instrumentations: [
      new ExpressInstrumentation(),
      new HttpInstrumentation(),
      new PrismaInstrumentation(),
    ],
    tracerProvider: provider,
  });

  const tracer = provider.getTracer(serviceName);
  return tracer;
};
