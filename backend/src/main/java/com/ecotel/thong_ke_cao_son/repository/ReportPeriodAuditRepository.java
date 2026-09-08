package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ReportPeriodAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportPeriodAuditRepository extends JpaRepository<ReportPeriodAudit, Long> {

    /** Toàn bộ vết của một kỳ, mới nhất trước — dùng cho màn lịch sử chốt/mở khoá. */
    List<ReportPeriodAudit> findByReportPeriodIdOrderByPerformedAtDesc(Long reportPeriodId);
}
