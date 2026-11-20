package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Danh mục Hệ số Than (CN-NK). */
@RestController
@RequestMapping("/api/fuel-coal-factors")
@RequirePermission(resource = "fuel-coal-factors")
public class FuelCoalFactorController extends FuelNormFactorControllerBase {

    public FuelCoalFactorController(FuelNormFactorService service) {
        super(service, FuelNormFactorKind.COAL_CN_NK);
    }
}
