package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Payment struct {
	PaymentID string        `json:"payment_id" gorm:"primaryKey; type:varchar(36)"`
	OrderID   int           `json:"order_id" gorm:"not null"`
	Amount    float64       `json:"amount" gorm:"type:numeric(10,2);not null"`
	Status    PaymentStatus `json:"status"`
	CreatedAt time.Time     `json:"created_at" gorm:"type:timestamp;not null"`
	UpdatedAt time.Time     `json:"updated_at" gorm:"type:timestamp;not null"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) {
	p.PaymentID = uuid.New().String()
	return nil
}

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "PENDING"
	PaymentStatusSuccess PaymentStatus = "SUCCESS"
	PaymentStatusFailed  PaymentStatus = "FAILED"
)
