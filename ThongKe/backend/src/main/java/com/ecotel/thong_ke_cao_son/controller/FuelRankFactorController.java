package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Danh mục Hệ số ĐMNL theo hạng xe. */
@RestController
@RequestMapping("/api/fuel-rank-factors")
@RequirePermission(resource = "fuel-rank-factors")
public class FuelRankFactorController extends FuelNormFactorControllerBase {

    public FuelRankFactorController(FuelNormFactorService service) {
        super(service, FuelNormFactorKind.VEHICLE_RANK);
    }
}
