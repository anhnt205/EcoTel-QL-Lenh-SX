package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationDecisionRequest;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ForbiddenException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.permission.PermissionDto;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.security.AppUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@code ReconciliationService} — phân quyền DỮ LIỆU theo đơn vị cho
 * {@code saveDecision(s)} và {@code getHistory} (Quality Gate lượt 3 của
 * Codex, 2026-09-11): trước đây 2 method này hoàn toàn KHÔNG kiểm tra —
 * tài khoản scoped nhưng có quyền CHỨC NĂNG "reconciliation:a"/"reconciliation:r"
 * gửi thẳng trip id của đơn vị khác vẫn duyệt/xem lịch sử được. Xem
 * {@code ReconciliationServicePairingTest} cho phần ghép cặp.
 */
@ExtendWith(MockitoExtension.class)
class ReconciliationServiceDepartmentScopeTest {

    @Mock private TransportReportTripRepository transportReportTripRepository;
    @Mock private ExcavationReportTripRepository excavationReportTripRepository;
    @Mock private ReconciliationDecisionRepository reconciliationDecisionRepository;
    @Mock private ReconciliationDataHistoryRepository reconciliationDataHistoryRepository;
    @Mock private CargoTypeRepository cargoTypeRepository;
    @Mock private UserRepository userRepository;
    @Mock private TransportReportRepository transportReportRepository;
    @Mock private ExcavationReportRepository excavationReportRepository;
    @Mock private ReconciliationEventPublisher reconciliationEventPublisher;

    private ReconciliationService newService() {
        return new ReconciliationService(transportReportTripRepository, excavationReportTripRepository,
                reconciliationDecisionRepository, reconciliationDataHistoryRepository, cargoTypeRepository,
                userRepository, transportReportRepository, excavationReportRepository, reconciliationEventPublisher);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static void loginAs(Long departmentId, boolean fullDataScope) {
        AppUserDetails user = AppUserDetails.builder()
                .permissions(Map.of("reconciliation", PermissionDto.builder().r(true).a(true).build()))
                .departmentId(departmentId)
                .fullDataScope(fullDataScope)
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private static TransportReportTrip transportTripOf(long id, Long departmentId) {
        Department dept = null;
        if (departmentId != null) {
            dept = new Department();
            dept.setId(departmentId);
        }
        Device vehicle = new Device();
        vehicle.setDepartment(dept);
        TransportReport tr = new TransportReport();
        tr.setVehicle(vehicle);
        TransportReportTrip trip = new TransportReportTrip();
        trip.setId(id);
        trip.setTransportReport(tr);
        trip.setStatus(ApprovalStatus.PENDING);
        return trip;
    }

    private static ExcavationReportTrip excavationTripOf(long id, Long departmentId) {
        Department dept = null;
        if (departmentId != null) {
            dept = new Department();
            dept.setId(departmentId);
        }
        Device excavator = new Device();
        excavator.setDepartment(dept);
        ExcavationReport er = new ExcavationReport();
        er.setExcavatorDevice(excavator);
        ExcavationReportTrip trip = new ExcavationReportTrip();
        trip.setId(id);
        trip.setExcavationReport(er);
        trip.setStatus(ApprovalStatus.PENDING);
        return trip;
    }

    @Nested
    @DisplayName("saveDecision(s) — xác minh phạm vi đơn vị")
    class SaveDecisions {

        @Test
        @DisplayName("Tài khoản CÙNG đơn vị với chuyến Vận tải -> duyệt được bình thường")
        void sameDepartmentCanApprove() {
            loginAs(11L, false);
            TransportReportTrip trip = transportTripOf(1L, 11L);
            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(trip));
            when(excavationReportTripRepository.findAllById(List.of())).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of())).thenReturn(List.of());
            when(reconciliationDecisionRepository.saveAll(anyList()))
                    .thenAnswer(inv -> inv.getArgument(0));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            newService().saveDecision(req); // không ném lỗi
            verify(reconciliationDecisionRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("Tài khoản KHÁC đơn vị với chuyến Vận tải -> bị chặn, KHÔNG lưu gì (trước đây lỗ hổng thật: vẫn duyệt được)")
        void crossDepartmentCannotApprove() {
            loginAs(11L, false);
            TransportReportTrip trip = transportTripOf(1L, 12L); // đơn vị KHÁC (VT8, không phải VT7)
            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(trip));
            when(excavationReportTripRepository.findAllById(List.of())).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of())).thenReturn(List.of());

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("Bulk: 1 phần tử ĐÚNG đơn vị + 1 phần tử SAI đơn vị -> TOÀN BỘ transaction rollback, không lưu phần tử nào (kể cả cái đúng)")
        void bulkRequestMixingDepartmentsRollsBackEntirely() {
            loginAs(11L, false);
            TransportReportTrip ownTrip = transportTripOf(1L, 11L);
            TransportReportTrip otherTrip = transportTripOf(2L, 12L);
            when(transportReportTripRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(ownTrip, otherTrip));
            when(excavationReportTripRepository.findAllById(List.of())).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 2L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of())).thenReturn(List.of());

            ReconciliationDecisionRequest ownReq = new ReconciliationDecisionRequest();
            ownReq.setTransportReportTripId(1L);
            ownReq.setStatus(ApprovalStatus.APPROVED);
            ReconciliationDecisionRequest otherReq = new ReconciliationDecisionRequest();
            otherReq.setTransportReportTripId(2L);
            otherReq.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecisions(List.of(ownReq, otherReq)))
                    .isInstanceOf(BadRequestException.class);
            // Yêu cầu Codex: 1 phần tử sai -> KHÔNG lưu bất kỳ gì, kể cả phần tử hợp lệ.
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("Tài khoản fullDataScope=true -> duyệt được chuyến của MỌI đơn vị")
        void fullScopeCanApproveAnyDepartment() {
            loginAs(9L, true);
            TransportReportTrip trip = transportTripOf(1L, 12L);
            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(trip));
            when(excavationReportTripRepository.findAllById(List.of())).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of())).thenReturn(List.of());
            when(reconciliationDecisionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            newService().saveDecision(req); // không ném lỗi
        }
    }

    @Nested
    @DisplayName("getHistory — xác minh phạm vi đơn vị")
    class GetHistory {

        @Test
        @DisplayName("Tài khoản CÙNG đơn vị -> xem được lịch sử")
        void sameDepartmentCanViewHistory() {
            loginAs(11L, false);
            TransportReportTrip trip = transportTripOf(1L, 11L);
            when(transportReportTripRepository.findById(1L)).thenReturn(Optional.of(trip));
            when(reconciliationDataHistoryRepository.findByTripIdAndSideOrderByCreatedAtDesc(
                    1L, com.ecotel.thong_ke_cao_son.enums.ReconciliationSide.TRANSPORT)).thenReturn(List.of());

            newService().getHistory(1L, null); // không ném lỗi
        }

        @Test
        @DisplayName("Tài khoản KHÁC đơn vị -> 403 Forbidden, KHÔNG lộ lịch sử (trước đây lỗ hổng thật: đoán được tripId là xem được)")
        void crossDepartmentCannotViewHistory() {
            loginAs(11L, false);
            TransportReportTrip trip = transportTripOf(1L, 12L);
            when(transportReportTripRepository.findById(1L)).thenReturn(Optional.of(trip));

            assertThatThrownBy(() -> newService().getHistory(1L, null))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Excavation: tài khoản KHÁC đơn vị -> 403 Forbidden")
        void crossDepartmentCannotViewExcavationHistory() {
            loginAs(11L, false);
            ExcavationReportTrip trip = excavationTripOf(2L, 113L);
            when(excavationReportTripRepository.findById(2L)).thenReturn(Optional.of(trip));

            assertThatThrownBy(() -> newService().getHistory(null, 2L))
                    .isInstanceOf(ForbiddenException.class);
        }
    }
}
