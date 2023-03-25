import axios from "axios";

const API_URL = "http://localhost:3003/api/merchant/";

const MerchantService = {
    getById: async (id: string, token: string | undefined) => {
        const response = await axios.get(`${API_URL}/merchants/${id}`, {
            headers: {
                Authorization: `${token}`,
            },
        });
        return response;
    },
    getByIds: async (ids: string[], token: string | undefined) => {
        let merchantIds = ids.join(",");
        const response = await axios.get(`${API_URL}/merchants/in`, {
            headers: {
                Authorization: `${token}`,
            },
            params: {
                ids: merchantIds,
            },
        });
        return response;
    }

}

export default MerchantService;