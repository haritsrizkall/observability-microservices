import axios from "axios";

const API_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:1323/api/payments";

const PaymentService = {
  create: async (data: any, token: string | undefined) => {
    const response = await axios.post(`${API_URL}`, data, {
      headers: {
        Authorization: `${token}`,
      },
    });
    console.log("response ", response);
    return response;
  },
};

export default PaymentService;
