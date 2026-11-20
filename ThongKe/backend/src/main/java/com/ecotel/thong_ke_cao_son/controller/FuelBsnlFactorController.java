package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Danh mục Hệ số BSNL (Roda, ngày mưa, bổ túc, SC/BD, khác, SPNT, bùn). */
@RestController
@RequestMapping("/api/fuel-bsnl-factors")
@RequirePermission(resource = "fuel-bsnl-factors")
public class FuelBsnlFactorController extends FuelNormFactorControllerBase {

    public FuelBsnlFactorController(FuelNormFactorService service) {
        super(service, FuelNormFactorKind.BSNL);
    }
}
