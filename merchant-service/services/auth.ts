import axios from "axios";

const API_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001/api/auth/";

const AuthService = {
  get: async (token: string | undefined, count: number) => {
    const response = await axios.get(API_URL + "users", {
      params: {
        count: count,
      },
      headers: {
        Authorization: `${token}`,
      },
    });
    return response;
  },
  login: async (email: string, password: string) => {
    const response = await axios.post(API_URL + "login", {
      email,
      password,
    });
    if (response.data.accessToken) {
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },
  me: async (token: string | undefined) => {
    const response = await axios.get(API_URL + "me", {
      headers: {
        Authorization: `${token}`,
      },
    });
    return response;
  },
  getById: async (id: string, token: string | undefined) => {
    const response = await axios.get(`${API_URL}users/${id}`, {
      headers: {
        Authorization: `${token}`,
      },
    });
    return response;
  },
  getByIds: async (ids: string[], token: string | undefined) => {
    let userIds = ids.join(",");
    const response = await axios.get(`${API_URL}users/in`, {
      headers: {
        Authorization: `${token}`,
      },
      params: {
        ids: userIds,
      },
    });
    return response;
  },
};

export default AuthService;
