package repository

import (
	"skripsi-rizkal/payment-service/entity"

	"gorm.io/gorm"
)

type PaymentRepository interface {
	Create(payment *entity.Payment) (*entity.Payment, error)
	Get(paymentID string) (*entity.Payment, error)
	Update(payment *entity.Payment) (*entity.Payment, error)
}

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) *paymentRepository {
	return &paymentRepository{db}
}

func (r *paymentRepository) Create(payment *entity.Payment) (*entity.Payment, error) {
	err := r.db.Create(payment).Error
	if err != nil {
		return nil, err
	}
	return payment, nil
}

func (r *paymentRepository) Get(paymentID string) (*entity.Payment, error) {
	var payment entity.Payment
	err := r.db.Where("payment_id = ?", paymentID).First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *paymentRepository) Update(payment *entity.Payment) (*entity.Payment, error) {
	err := r.db.Save(payment).Error
	if err != nil {
		return nil, err
	}
	return payment, nil
}
