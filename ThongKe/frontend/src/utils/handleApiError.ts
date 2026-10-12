// src/utils/handleApiError.ts
export async function parseAxiosError(error: any): Promise<string> {
    let message = 'Lỗi không xác định';

    try {
        const data = error?.response?.data;

        if (data instanceof Blob) {
            // Trường hợp lỗi từ server gửi Blob (vd: Excel hoặc JSON lỗi)
            const text = await data.text();
            const parsed = JSON.parse(text);
            message = parsed.message || parsed.error || message;
        } else if (data?.message) {
            // Trường hợp server trả JSON bình thường
            message = data.message;
        } else if (error.message) {
            // Lỗi mặc định từ Axios
            message = error.message;
        }
    } catch (err) {
        console.warn('⚠️ Không thể parse lỗi Blob:', err);
    }

    return message;
}
