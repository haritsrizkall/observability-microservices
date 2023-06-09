package service

import (
	"context"
	"skripsi-rizkal/payment-service/entity"
	"skripsi-rizkal/payment-service/external-service/order"
	"skripsi-rizkal/payment-service/repository"
)

type PaymentService interface {
	CreatePayment(orderID int, amount float64) (*entity.Payment, error)
	GetPayment(paymentID string) (*entity.Payment, error)
	PayPayment(ctx context.Context, paymentID string) (*entity.Payment, error)
}

type paymentService struct {
	paymentRepository repository.PaymentRepository
}

func NewPaymentService(paymentRepository repository.PaymentRepository) PaymentService {
	return &paymentService{paymentRepository}
}

func (s *paymentService) CreatePayment(orderID int, amount float64) (*entity.Payment, error) {
	// check if order is exist
	payment := &entity.Payment{
		OrderID: orderID,
		Amount:  amount,
		Status:  entity.PaymentStatusPending,
	}
	payment, err := s.paymentRepository.Create(payment)
	if err != nil {
		return nil, err
	}
	return payment, nil
}

func (s *paymentService) GetPayment(paymentID string) (*entity.Payment, error) {
	payment, err := s.paymentRepository.Get(paymentID)
	if err != nil {
		return nil, err
	}
	return payment, nil
}

func (s *paymentService) PayPayment(ctx context.Context, paymentID string) (*entity.Payment, error) {
	payment, err := s.paymentRepository.Get(paymentID)
	if err != nil {
		return nil, err
	}
	payment.Status = entity.PaymentStatusSuccess
	payment, err = s.paymentRepository.Update(payment)
	if err != nil {
		return nil, err
	}
	// update order status
	err = order.UpdateToPaid(ctx, payment.OrderID)
	if err != nil {
		return nil, err
	}
	return payment, nil
}
