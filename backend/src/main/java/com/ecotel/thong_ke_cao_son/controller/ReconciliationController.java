package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationDecisionBulkRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationDecisionRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationSearchRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationTripUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReconciliationDecisionResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReconciliationRowResponse;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.service.ReconciliationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @GetMapping
    public ApiResponse<PageResponse<ReconciliationRowResponse>> search(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate,
            @RequestParam(required = false) List<Long> shiftIds,
            @RequestParam(required = false) List<Long> deviceIds,
            @RequestParam(required = false) ApprovalStatus status,
            Pageable pageable) {
        ReconciliationSearchRequest request = new ReconciliationSearchRequest();
        request.setFromDate(fromDate);
        request.setToDate(toDate);
        request.setShiftIds(shiftIds);
        request.setDeviceIds(deviceIds);
        request.setStatus(status);
        Pageable cleanPageable = Pageable.ofSize(pageable.getPageSize()).withPage(pageable.getPageNumber());
        return ApiResponse.success(reconciliationService.search(request, cleanPageable));
    }

    @PostMapping("/decisions")
    public ApiResponse<ReconciliationDecisionResponse> saveDecision(
            @Valid @RequestBody ReconciliationDecisionRequest request) {
        return ApiResponse.success(reconciliationService.saveDecision(request));
    }

    @PostMapping("/decisions/bulk")
    public ApiResponse<List<ReconciliationDecisionResponse>> saveDecisions(
            @Valid @RequestBody ReconciliationDecisionBulkRequest request) {
        return ApiResponse.success(reconciliationService.saveDecisions(request.getDecisions()));
    }

    @PutMapping("/trips/bulk")
    public ApiResponse<Void> updateTrips(
            @Valid @RequestBody List<@Valid ReconciliationTripUpdateRequest> requests) {
        reconciliationService.updateTrips(requests);
        return ApiResponse.success(null);
    }
}
