package com.ecotel.thong_ke_cao_son.exception;

/** Đã xác thực + đủ quyền chức năng, nhưng bị chặn theo phạm vi dữ liệu (đơn vị). */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
