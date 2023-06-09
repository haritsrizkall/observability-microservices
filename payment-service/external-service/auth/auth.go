package auth

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

type UserResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	RoleID    int    `json:"role_id"`
}

const AuthServiceUrl = "http://localhost:3001"

func Me(token string) (*UserResponse, error) {
	client := &http.Client{}
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/auth/me", AuthServiceUrl), nil)
	req.Header.Add("Authorization", "Bearer "+token)
	req.Header.Add("Internal", fmt.Sprintf("%s", "hahaha"))
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	var user UserResponse
	err = json.Unmarshal(body, &user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
