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

import java.time.LocalDate;
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

    // ── Fixture ĐẦY ĐỦ (khoá ghép + nội dung) cho nhóm PairingAmbiguity — khác
    // transportTripOf/excavationTripOf ở trên (chỉ đủ department, thiếu
    // reportDate/shift/vehicle/excavator/cargoType nên KHÔNG dùng được cho
    // assertValidPair, vốn cần buildTransportKey/buildExcavationKey
    // + isMatched hoạt động đầy đủ, không NPE).

    private static Shift shift(long id) {
        Shift s = new Shift();
        s.setId(id);
        s.setName(1);
        return s;
    }

    private static Device device(long id) {
        Device d = new Device();
        d.setId(id);
        d.setCode("D" + id);
        return d;
    }

    private static User employee(long id) {
        User u = new User();
        u.setId(id);
        u.setSalaryCode("NV" + id);
        u.setFullName("Nhân viên " + id);
        return u;
    }

    private static CargoType cargoType(long id) {
        CargoType c = new CargoType();
        c.setId(id);
        c.setName("Đất");
        return c;
    }

    private static TransportReportTrip fullTransportTrip(long id, long cargoTypeId, LocalDate date, Shift shift,
                                                           Device vehicle, Device excavator, User emp) {
        TransportReport report = new TransportReport();
        report.setReportDate(date);
        report.setShift(shift);
        report.setVehicle(vehicle);
        report.setEmployee(emp);

        TransportReportTrip trip = new TransportReportTrip();
        trip.setId(id);
        trip.setTransportReport(report);
        trip.setExcavator(excavator);
        trip.setCargoType(cargoType(cargoTypeId));
        trip.setTripCount(1);
        trip.setLoadLevel(new LoadLevel());
        trip.setStatus(ApprovalStatus.PENDING);
        return trip;
    }

    private static ExcavationReportTrip fullExcavationTrip(long id, long cargoTypeId, LocalDate date, Shift shift,
                                                             Device vehicle, Device excavator, User emp) {
        ExcavationReport report = new ExcavationReport();
        report.setReportDate(date);
        report.setShift(shift);
        report.setExcavatorDevice(excavator);
        report.setEmployee(emp);

        ExcavationReportTrip trip = new ExcavationReportTrip();
        trip.setId(id);
        trip.setExcavationReport(report);
        trip.setVehicle(vehicle);
        trip.setCargoType(cargoType(cargoTypeId));
        trip.setTripCount(1);
        trip.setLoadLevel(new LoadLevel());
        trip.setStatus(ApprovalStatus.PENDING);
        return trip;
    }

    @Nested
    @DisplayName("saveDecision(s) — từ chối cặp ghép không chắc chắn (Quality Gate lượt 4)")
    class PairingAmbiguity {

        private static final LocalDate DATE = LocalDate.of(2026, 9, 10);

        @Test
        @DisplayName("2 chuyến Khai thác cùng khoá VÀ cùng khớp nội dung với chuyến Vận tải -> saveDecision bị từ chối, KHÔNG lưu gì")
        void ambiguousPairIsRejected() {
            loginAs(9L, true); // full-scope — cô lập kiểm tra pairing khỏi kiểm tra đơn vị
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation2 = fullExcavationTrip(2L, 5L, DATE, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            // assertValidPair tự truy vấn lại toàn bộ ứng viên cùng
            // ngày ở CẢ HAI phía (Quality Gate lượt 5 — kiểm tra 2 chiều).
            when(transportReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(excavation1, excavation2));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("2 chuyến Vận tải cùng khoá VÀ cùng khớp nội dung, chỉ 1 chuyến Khai thác phù hợp -> saveDecision bị từ chối (Quality Gate lượt 5 — chiều NGƯỢC LẠI, lỗi thật ở bản trước)")
        void ambiguousPairIsRejectedWhenMultipleTransportsCompeteForOneExcavation() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            TransportReportTrip transport2 = fullTransportTrip(2L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(transportReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(transport1, transport2));
            when(excavationReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(excavation1));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("Bulk: 1 phần tử là cặp mơ hồ (2 Vận tải cạnh tranh 1 Khai thác) -> TOÀN BỘ rollback, không lưu phần tử hợp lệ khác")
        void bulkWithAmbiguousPairRollsBackEntirely() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            // Nhóm mơ hồ: transport1/transport2 cùng khoá+nội dung, cạnh
            // tranh excavation1 duy nhất.
            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            TransportReportTrip transport2 = fullTransportTrip(2L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            // Phần tử hợp lệ khác trong CÙNG request — khoá khác hẳn (ngày khác), không cạnh tranh.
            LocalDate otherDate = DATE.plusDays(1);
            TransportReportTrip transport3 = fullTransportTrip(3L, 7L, otherDate, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation3 = fullExcavationTrip(3L, 7L, otherDate, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L, 3L)))
                    .thenReturn(List.of(transport1, transport3));
            when(excavationReportTripRepository.findAllById(List.of(1L, 3L)))
                    .thenReturn(List.of(excavation1, excavation3));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 3L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L, 3L))).thenReturn(List.of());
            when(transportReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(transport1, transport2));
            when(excavationReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(excavation1));
            // Phần tử hợp lệ (khoá otherDate) — lenient vì request lỗi ở
            // phần tử đầu có thể khiến vòng lặp không cần đọc tới đây.
            org.mockito.Mockito.lenient()
                    .when(transportReportTripRepository.findForReconciliation(otherDate, otherDate, null, null))
                    .thenReturn(List.of(transport3));
            org.mockito.Mockito.lenient()
                    .when(excavationReportTripRepository.findForReconciliation(otherDate, otherDate, null, null))
                    .thenReturn(List.of(excavation3));

            ReconciliationDecisionRequest ambiguousReq = new ReconciliationDecisionRequest();
            ambiguousReq.setTransportReportTripId(1L);
            ambiguousReq.setExcavationReportTripId(1L);
            ambiguousReq.setStatus(ApprovalStatus.APPROVED);
            ReconciliationDecisionRequest validReq = new ReconciliationDecisionRequest();
            validReq.setTransportReportTripId(3L);
            validReq.setExcavationReportTripId(3L);
            validReq.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecisions(List.of(ambiguousReq, validReq)))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("Chỉ 1 chuyến Khai thác cùng khoá (không cạnh tranh) + nội dung khớp + APPROVED -> saveDecision KHÔNG bị chặn (không regression)")
        void uniquePairIsAccepted() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(transportReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            newService().saveDecision(req); // không ném lỗi
            verify(reconciliationDecisionRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("2 id gửi lên khác NGÀY -> saveDecision bị từ chối NGAY (Quality Gate lượt 6 — chưa từng kiểm tra et có cùng khoá với tt)")
        void differentDateIsRejected() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 =
                    fullExcavationTrip(1L, 5L, DATE.plusDays(1), shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("2 id gửi lên khác CA -> saveDecision bị từ chối NGAY")
        void differentShiftIsRejected() {
            loginAs(9L, true);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift(1L), vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 5L, DATE, shift(2L), vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("2 id gửi lên khác XE/MÁY XÚC -> saveDecision bị từ chối NGAY")
        void differentVehicleOrExcavatorIsRejected() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            User emp = employee(1L);

            TransportReportTrip transport1 =
                    fullTransportTrip(1L, 5L, DATE, shift, device(10L), device(20L), emp);
            ExcavationReportTrip excavation1 =
                    fullExcavationTrip(1L, 5L, DATE, shift, device(11L), device(20L), emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("Cùng khoá, KHÔNG cạnh tranh, nhưng nội dung LỆCH + APPROVED -> saveDecision bị từ chối (BE phải ép lại đúng quy tắc canApprove của FE)")
        void sameKeyMismatchedContentApprovedIsRejected() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 9L, DATE, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(transportReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(excavation1));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecision(req))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("Cùng khoá, KHÔNG cạnh tranh, nội dung LỆCH + REVISION_REQUESTED -> saveDecision KHÔNG bị chặn (đúng quy trình nghiệp vụ: phát hiện lệch rồi yêu cầu sửa)")
        void sameKeyMismatchedContentRevisionRequestedIsAccepted() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation1 = fullExcavationTrip(1L, 9L, DATE, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findAllById(List.of(1L))).thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L))).thenReturn(List.of());
            when(transportReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(transport1));
            when(excavationReportTripRepository.findForReconciliation(DATE, DATE, null, null))
                    .thenReturn(List.of(excavation1));
            when(reconciliationDecisionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            ReconciliationDecisionRequest req = new ReconciliationDecisionRequest();
            req.setTransportReportTripId(1L);
            req.setExcavationReportTripId(1L);
            req.setStatus(ApprovalStatus.REVISION_REQUESTED);

            newService().saveDecision(req); // không ném lỗi
            verify(reconciliationDecisionRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("Bulk: 1 phần tử gửi 2 id khác khoá (ngày khác) -> TOÀN BỘ rollback, không lưu phần tử hợp lệ khác")
        void bulkWithCrossKeyPairRollsBackEntirely() {
            loginAs(9L, true);
            Shift shift = shift(1L);
            Device vehicle = device(10L);
            Device excavator = device(20L);
            User emp = employee(1L);

            // Phần tử sai: 2 id không liên quan (khác ngày) nhưng mỗi bên
            // riêng lẻ không hề cạnh tranh -> đúng lỗ hổng lượt 6 nếu không
            // kiểm tra khoá trước tiên.
            TransportReportTrip transport1 = fullTransportTrip(1L, 5L, DATE, shift, vehicle, excavator, emp);
            LocalDate otherDate = DATE.plusDays(1);
            ExcavationReportTrip excavation1 =
                    fullExcavationTrip(1L, 5L, otherDate, shift, vehicle, excavator, emp);

            // Phần tử hợp lệ khác trong CÙNG request.
            TransportReportTrip transport3 = fullTransportTrip(3L, 7L, otherDate, shift, vehicle, excavator, emp);
            ExcavationReportTrip excavation3 = fullExcavationTrip(3L, 7L, otherDate, shift, vehicle, excavator, emp);

            when(transportReportTripRepository.findAllById(List.of(1L, 3L)))
                    .thenReturn(List.of(transport1, transport3));
            when(excavationReportTripRepository.findAllById(List.of(1L, 3L)))
                    .thenReturn(List.of(excavation1, excavation3));
            when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 3L))).thenReturn(List.of());
            when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L, 3L))).thenReturn(List.of());

            ReconciliationDecisionRequest crossKeyReq = new ReconciliationDecisionRequest();
            crossKeyReq.setTransportReportTripId(1L);
            crossKeyReq.setExcavationReportTripId(1L);
            crossKeyReq.setStatus(ApprovalStatus.APPROVED);
            ReconciliationDecisionRequest validReq = new ReconciliationDecisionRequest();
            validReq.setTransportReportTripId(3L);
            validReq.setExcavationReportTripId(3L);
            validReq.setStatus(ApprovalStatus.APPROVED);

            assertThatThrownBy(() -> newService().saveDecisions(List.of(crossKeyReq, validReq)))
                    .isInstanceOf(BadRequestException.class);
            verify(reconciliationDecisionRepository, never()).saveAll(anyList());
        }
    }
}
