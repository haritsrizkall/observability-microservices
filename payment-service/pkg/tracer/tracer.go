package tracer

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.19.0"
)

var ServiceName string = "payment-service"
var Tracer = otel.Tracer(ServiceName)

func InitTracer() (*sdktrace.TracerProvider, error) {
	otlpEndpoint := os.Getenv("OTEL_COLLECTOR_ENDPOINT")
	maxQueueSize := os.Getenv("OTEL_MAX_QUEUE_SIZE")
	maxExportBatchSize := os.Getenv("OTEL_MAX_EXPORT_BATCH_SIZE")
	client := otlptracehttp.NewClient(
		otlptracehttp.WithEndpoint(otlpEndpoint),
		otlptracehttp.WithInsecure(),
	)
	otlpExporter, err := otlptrace.New(context.Background(), client)
	if err != nil {
		return nil, err
	}
	samplingRatioInt, _ := strconv.Atoi(os.Getenv("OTEL_SAMPLING_RATIO"))
	samplingRatio := float64(samplingRatioInt)

	maxQueueSizeInt, _ := strconv.Atoi(maxQueueSize)
	maxExportBatchSizeInt, _ := strconv.Atoi(maxExportBatchSize)

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(otlpExporter, sdktrace.WithMaxQueueSize(maxQueueSizeInt), sdktrace.WithMaxExportBatchSize(maxExportBatchSizeInt)),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(ServiceName),
			attribute.String("environment", "development"),
		)),
		sdktrace.WithSampler(
			sdktrace.ParentBased(
				sdktrace.TraceIDRatioBased(samplingRatio),
			),
		),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	// set propagation
	fmt.Printf("Tracing enabled : %s with sampling ratio %f", otlpEndpoint, samplingRatio)
	return tp, nil
}