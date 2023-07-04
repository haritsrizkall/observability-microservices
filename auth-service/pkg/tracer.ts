import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Resource } from "@opentelemetry/resources"
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions"
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { OTTracePropagator } from "@opentelemetry/propagator-ot-trace"
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base/build/src/export/SimpleSpanProcessor"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base/build/src/export/ConsoleSpanExporter"
import { MySQLInstrumentation } from "@opentelemetry/instrumentation-mysql"
import MySQL2Instrumentation from "@opentelemetry/instrumentation-mysql2"
import { PrismaInstrumentation } from "@prisma/instrumentation"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

//const hostName = 'localhost'
const hostName = process.env.OTEL_TRACE_HOST || 'localhost'

const options = {
  endpoint: `http://localhost:14268/api/traces`,
}

export const init = (serviceName: any, environment: any) => {

  // const exporter = new JaegerExporter(options)
  const OTLPExporter = new OTLPTraceExporter({
    url:"http://localhost:4318/v1/traces"
  })

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    }),
  })

  // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
  provider.addSpanProcessor(new SimpleSpanProcessor(OTLPExporter))

  // Enable to see the spans printed in the console by the ConsoleSpanExporter
//   provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter())) 

  // provider.register()
  provider.register()

  console.log('tracing initialized')

  registerInstrumentations({
    instrumentations: [
      new ExpressInstrumentation(), 
      new HttpInstrumentation(),
      new PrismaInstrumentation(),
    ],
    tracerProvider: provider,
  })
  
  const tracer = provider.getTracer(serviceName)
  return tracer 
}