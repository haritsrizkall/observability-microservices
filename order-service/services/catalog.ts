import axios from "axios";

const API_URL = "http://localhost:3004/api/catalog/";

const CatalogService = {
    getByIds: async (ids: string[], token: string | undefined) => {
        let productIds = ids.join(",");
        const response = await axios.get(`${API_URL}/products/in`, {
            headers: {
                Authorization: `${token}`,
            },
            params: {
                ids: productIds
            }
        });
        return response;
    }
}

export default CatalogService;