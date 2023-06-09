package order

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

const OrderServiceUrl = "http://localhost:3006"

type OrderResponse struct {
	ID         uint64  `json:"id"`
	UserID     string  `json:"user_id"`
	MerchantID uint64  `json:"merchant_id"`
	Subtotal   float64 `json:"subtotal"`
	Tax        float64 `json:"tax"`
	Status     string  `json:"status"`
	Total      float64 `json:"total"`
	CreatedAt  string  `json:"created_at"`
	UpdateAt   string  `json:"updated_at"`
}

func GetOrderByID(orderID uint64) (*OrderResponse, error) {
	client := &http.Client{}
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/order/orders/%d", OrderServiceUrl, orderID), nil)
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	var order OrderResponse
	err = json.Unmarshal(body, &order)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func UpdateToPaid(ctx context.Context, orderID int) error {
	client := &http.Client{
		Transport: otelhttp.NewTransport(http.DefaultTransport),
	}
	req, _ := http.NewRequestWithContext(ctx, "PUT", fmt.Sprintf("%s/api/order/orders/%d/paid", OrderServiceUrl, orderID), nil)
	req.Header.Set("Internal", "hahaha")

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	// if res.StatusCode != http.StatusOK {
	// 	return fmt.Errorf("failed to update order status to paid")
	// }
	return nil
}
