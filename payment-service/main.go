package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"skripsi-rizkal/payment-service/entity"
	"skripsi-rizkal/payment-service/handler"
	"skripsi-rizkal/payment-service/repository"
	"skripsi-rizkal/payment-service/service"

	"github.com/labstack/echo/v4"
	"go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.19.0"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func dbMigration(db *gorm.DB) {
	err := db.AutoMigrate(&entity.Payment{})
	if err != nil {
		panic(err)
	}
}

var serviceName string = "payment-service"
var tracer = otel.Tracer(serviceName)

func initTracer() (*sdktrace.TracerProvider, error) {
	// exporter, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint("http://localhost:14268/api/traces")))
	// if err != nil {
	// 	return nil, err
	// }
	option := otlptracehttp.WithInsecure()
	client := otlptracehttp.NewClient(option)
	otlpExporter, err := otlptrace.New(context.Background(), client)
	// otlpExporter, err := otlptrace.NewUnstarted()
	if err != nil {
		return nil, err
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(otlpExporter),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
			attribute.String("environment", "development"),
		)),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	// set propagation
	return tp, nil
}

func main() {
	tp, err := initTracer()
	fmt.Println(tracer)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()
	fmt.Println("Hello World")
	dsn := "root:root@tcp(127.0.0.1:3306)/payment?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	dbMigration(db)

	paymentRepository := repository.NewPaymentRepository(db)
	paymentService := service.NewPaymentService(paymentRepository)
	paymentHandler := handler.NewPaymentHandler(paymentService)

	e := echo.New()
	e.Use(otelecho.Middleware(serviceName))
	paymentGroup := e.Group("api/payments")
	paymentGroup.GET("", paymentHandler.HalloPayment)
	paymentGroup.POST("", paymentHandler.CreatePayment)
	paymentGroup.GET("/:payment_id", paymentHandler.GetPayment)
	paymentGroup.PUT("/:payment_id/pay", paymentHandler.PayPayment)
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello World")
	})
	e.Logger.Fatal(e.Start(":1323"))
}
