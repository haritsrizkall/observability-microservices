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

//const hostName = 'localhost'
const hostName = process.env.OTEL_TRACE_HOST || 'localhost'

const options = {
  endpoint: `http://localhost:14268/api/traces`,
}

export const init = (serviceName: any, environment: any) => {

  const exporter = new JaegerExporter(options)

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    }),
  })

  // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

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

// 'use strict'

// const {
//   BatchSpanProcessor,
// } = require('@opentelemetry/tracing')
// const { Resource } = require('@opentelemetry/resources')
// const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
// const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
// const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
// const { registerInstrumentations } = require('@opentelemetry/instrumentation')
// const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')
// const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
// const { OTTracePropagator } = require('@opentelemetry/propagator-ot-trace')
// //const hostName = 'localhost'
// const hostName = process.env.OTEL_TRACE_HOST || 'localhost'

// const options = {
//   tags: [],
//   endpoint: `http://${hostName}:14268/api/traces`,
// }

// const init = (serviceName: string, environment: string) => {

//   const exporter = new JaegerExporter(options)

//   const provider = new NodeTracerProvider({
//     resource: new Resource({
//       [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
//       [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
//     }),
//   })

//   //provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

//   // Use the BatchSpanProcessor to export spans in batches in order to more efficiently use resources.
//   provider.addSpanProcessor(new BatchSpanProcessor(exporter))

//   // Enable to see the spans printed in the console by the ConsoleSpanExporter
//   // provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter())) 

//   provider.register()

//   console.log('tracing initialized')

//   registerInstrumentations({
//     instrumentations: [new ExpressInstrumentation(), new HttpInstrumentation()],
//   })
  
//   const tracer = provider.getTracer(serviceName)
//   return { tracer }
// }

// module.exports = {
//   init: init,
// }