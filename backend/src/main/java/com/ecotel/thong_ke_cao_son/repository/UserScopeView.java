package com.ecotel.thong_ke_cao_son.repository;

/**
 * Phạm vi dữ liệu theo đơn vị của 1 tài khoản — chỉ 2 giá trị cần cho
 * {@code AppUserDetails}, tra bằng 1 truy vấn nhẹ (không nạp cả entity
 * {@code User}/{@code Department}, tránh lỗi lazy-loading ngoài session vì
 * {@code AppTokenFilter} chạy trước cả DispatcherServlet).
 */
public interface UserScopeView {

    /** Null khi tài khoản chưa gán phòng ban. */
    Long getDepartmentId();

    /** Null khi tài khoản chưa gán phòng ban (LEFT JOIN không có dòng phòng ban). */
    Boolean getFullDataScope();
}
