package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"skripsi-rizkal/payment-service/entity"
	"skripsi-rizkal/payment-service/handler"
	"skripsi-rizkal/payment-service/pkg/tracer"
	"skripsi-rizkal/payment-service/repository"
	"skripsi-rizkal/payment-service/service"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/uptrace/opentelemetry-go-extra/otelgorm"
	"go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func dbMigration(db *gorm.DB) {
	err := db.AutoMigrate(&entity.Payment{})
	if err != nil {
		panic(err)
	}
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	tp, err := tracer.InitTracer()
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()
	fmt.Println("Hello World")
	dsn := os.Getenv("DATABASE_URL")
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	dbMigration(db)
 

	paymentRepository := repository.NewPaymentRepository(db)
	paymentService := service.NewPaymentService(paymentRepository)
	paymentHandler := handler.NewPaymentHandler(paymentService)

	e := echo.New()
	e.Use(otelecho.Middleware(tracer.ServiceName))

	
	if err := db.Use(otelgorm.NewPlugin(
		otelgorm.WithTracerProvider(tp),
	)); err != nil {
		panic(err)
	}
	
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
