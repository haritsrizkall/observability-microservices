package handler

import (
	"net/http"
	"skripsi-rizkal/payment-service/helper"
	"skripsi-rizkal/payment-service/service"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type PaymentHandler struct {
	paymentService service.PaymentService
}

func NewPaymentHandler(paymentService service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService}
}

type CreatePaymentRequest struct {
	OrderID int     `json:"order_id" validate:"required"`
	Amount  float64 `json:"amount" validate:"required"`
}

func (h *PaymentHandler) HalloPayment(c echo.Context) error {
	return c.JSON(http.StatusOK, "Hallo Payment")
}

func (h *PaymentHandler) CreatePayment(c echo.Context) error {
	var request CreatePaymentRequest
	err := c.Bind(&request)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	validate := validator.New()
	err = validate.Struct(&request)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	payment, err := h.paymentService.CreatePayment(request.OrderID, request.Amount)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	response := helper.BuildResponse(http.StatusOK, "OK", payment)
	return c.JSON(http.StatusOK, response)
}

type GetPaymentRequest struct {
	PaymentID string `json:"payment_id" validate:"required" param:"payment_id"`
}

func (h *PaymentHandler) GetPayment(c echo.Context) error {
	var request GetPaymentRequest
	err := c.Bind(&request)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	validate := validator.New()
	err = validate.Struct(&request)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	payment, err := h.paymentService.GetPayment(request.PaymentID)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusInternalServerError, response)
	}
	response := helper.BuildResponse(http.StatusOK, "OK", payment)
	return c.JSON(http.StatusOK, response)
}

type PaidRequest struct {
	PaymentID string `json:"payment_id" validate:"required" param:"payment_id"`
}

func (h *PaymentHandler) PayPayment(c echo.Context) error {
	var request PaidRequest
	err := c.Bind(&request)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	validate := validator.New()
	err = validate.Struct(&request)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusBadRequest, response)
	}
	ctx := c.Request().Context()
	payment, err := h.paymentService.PayPayment(ctx, request.PaymentID)
	if err != nil {
		response := helper.BuildResponse(http.StatusBadRequest, err.Error(), nil)
		return c.JSON(http.StatusInternalServerError, response)
	}
	response := helper.BuildResponse(http.StatusOK, "OK", payment)
	return c.JSON(http.StatusOK, response)
}
